/**
 * Utilities for normalizing stream URLs for different server types
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

export function normalizeStreamUrl(url: string): string {
  let normalized = url.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `http://${normalized}`;
  }
  return normalized;
}

/**
 * Generates ordered list of possible stream URLs to try for playback based on server type
 */
export function generateStreamUrlVariants(url: string, serverType?: string): string[] {
  const variants: string[] = [];

  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = `http://${cleanUrl}`;
  }

  try {
    const parsed = new URL(cleanUrl);
    const baseUrl = `${parsed.protocol}//${parsed.hostname}${parsed.port ? ':' + parsed.port : ''}`;
    const rawPath = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '');

    if (serverType === 'shoutcast-v2') {
      // Shoutcast v2 stream endpoints (mount point /1 is standard)
      if (rawPath) {
        variants.push(cleanUrl);
      }
      variants.push(`${baseUrl}${rawPath}/1`);
      variants.push(`${baseUrl}${rawPath}/stream`);
      variants.push(`${baseUrl}${rawPath}/;`);
      variants.push(`${baseUrl}${rawPath}/radio.mp3`);
      variants.push(cleanUrl);
      variants.push(`${baseUrl}${rawPath}/`);
    } else if (serverType === 'shoutcast-v1') {
      if (rawPath) {
        variants.push(cleanUrl);
      }
      variants.push(`${baseUrl}${rawPath}/;`);
      variants.push(`${baseUrl}${rawPath}/1`);
      variants.push(`${baseUrl}${rawPath}/stream`);
      variants.push(cleanUrl);
      variants.push(`${baseUrl}${rawPath}/`);
    } else {
      // Icecast or default
      variants.push(cleanUrl);
      variants.push(`${baseUrl}${rawPath}/stream`);
      variants.push(`${baseUrl}${rawPath}/;stream.mp3`);
      variants.push(`${baseUrl}${rawPath}/listen.mp3`);
      variants.push(`${baseUrl}${rawPath}/`);
    }
  } catch {
    variants.push(url);
  }

  return Array.from(new Set(variants.filter(Boolean)));
}
