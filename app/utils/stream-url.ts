/**
 * Utilities for normalizing stream URLs for different server types
 */

/**
 * Detects the type of streaming server based on URL patterns
 */
export function detectServerType(url: string): 'icecast' | 'shoutcast' | 'unknown' {
  try {
    const parsed = new URL(url);

    // Common port patterns
    // Shoutcast: 8000-8008, 8030-8040
    // Icecast: 8000-8100 (overlap)

    const port = parsed.port;
    if (port) {
      const portNum = parseInt(port, 10);
      // Shoutcast typically uses these port ranges
      if ((portNum >= 8000 && portNum <= 8008) || (portNum >= 8030 && portNum <= 8040)) {
        return 'shoutcast';
      }
    }

    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Normalizes a stream URL by appending the appropriate stream path
 * if the URL doesn't already contain a stream file or resource indicator.
 *
 * For Shoutcast: appends /;stream or /radio.mp3
 * For Icecast: appends /;stream.mp3 or /stream
 * For unknown: tries multiple patterns
 *
 * @param url The stream URL to normalize
 * @returns The normalized URL ready for audio playback
 */
export function normalizeStreamUrl(url: string): string {
  let normalized = url.trim();

  // If URL already ends with a stream path or has file extension, return as-is
  const hasStreamPath = /(;|stream|radio|\.mp3|\.ogg|\.aac)/i.test(normalized);
  if (hasStreamPath) {
    return normalized;
  }

  const serverType = detectServerType(normalized);

  // Ensure trailing slash
  if (!normalized.endsWith('/')) {
    normalized += '/';
  }

  // Append appropriate path based on server type
  switch (serverType) {
    case 'shoutcast':
      // Shoutcast v1/v2 typically uses /; or /;stream
      // Try /; first (most common), then fallback to /radio.mp3
      normalized += ';';
      break;
    case 'icecast':
    case 'unknown':
    default:
      // Icecast uses /;stream.mp3 or just /;stream
      normalized += ';stream.mp3';
      break;
  }

  return normalized;
}

/**
 * Generates list of possible stream URLs to try for playback
 * The first one that works should be used
 *
 * @param url The original stream URL
 * @returns Array of possible URLs to try
 */
export function generateStreamUrlVariants(url: string): string[] {
  const variants: string[] = [url];

  try {
    const parsed = new URL(url);
    const baseUrl = `${parsed.protocol}//${parsed.hostname}${parsed.port ? ':' + parsed.port : ''}`;
    const pathname = parsed.pathname.replace(/\/$/, ''); // Remove trailing slash

    // Variant 1: Direct URL (original)
    variants.push(url);

    // If original ends with /, try different stream paths
    if (url.endsWith('/')) {
      // Shoutcast variants
      variants.push(`${baseUrl}/;`);
      variants.push(`${baseUrl}/;stream`);
      variants.push(`${baseUrl}/;stream.mp3`);
      variants.push(`${baseUrl}/radio.mp3`);
      variants.push(`${baseUrl}/stream`);

      // Icecast variants
      variants.push(`${baseUrl}/;stream.mp3`);
      variants.push(`${baseUrl}/stream`);
      variants.push(`${baseUrl}/listen.mp3`);
    }
  } catch {
    // Invalid URL, just return original
    variants.push(url);
  }

  // Remove duplicates while preserving order
  return Array.from(new Set(variants));
}
