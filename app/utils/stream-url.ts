/**
 * Utilities for normalizing stream URLs for different server types
 */

/**
 * Detects the type of streaming server based on URL patterns
 */
export function detectServerType(url: string): 'icecast' | 'shoutcast' | 'unknown' {
  try {
    const parsed = new URL(url);
    const port = parsed.port;
    if (port) {
      const portNum = parseInt(port, 10);
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
 * Normalizes a stream URL by ensuring valid protocol and trailing slash if bare port
 */
export function normalizeStreamUrl(url: string): string {
  let normalized = url.trim();

  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `http://${normalized}`;
  }

  try {
    const parsed = new URL(normalized);
    if (!parsed.pathname || parsed.pathname === '') {
      normalized = `${normalized}/`;
    }
  } catch {
    // Keep as is
  }

  return normalized;
}

/**
 * Generates list of possible stream URLs to try for playback
 *
 * @param url The original stream URL
 * @returns Array of possible URLs to try
 */
export function generateStreamUrlVariants(url: string): string[] {
  const variants: string[] = [];

  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = `http://${cleanUrl}`;
  }

  variants.push(cleanUrl);

  try {
    const parsed = new URL(cleanUrl);
    const baseUrl = `${parsed.protocol}//${parsed.hostname}${parsed.port ? ':' + parsed.port : ''}`;
    const rawPath = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '');

    // Add trailing slash variant if missing
    variants.push(`${baseUrl}${rawPath}/`);
    variants.push(`${baseUrl}${rawPath}/1`);
    variants.push(`${baseUrl}${rawPath}/stream`);
    variants.push(`${baseUrl}${rawPath}/;`);
    variants.push(`${baseUrl}${rawPath}/;stream`);
    variants.push(`${baseUrl}${rawPath}/radio.mp3`);
    variants.push(`${baseUrl}${rawPath}/listen.mp3`);
  } catch {
    variants.push(url);
  }

  // Remove duplicates while preserving order
  return Array.from(new Set(variants.filter(Boolean)));
}
