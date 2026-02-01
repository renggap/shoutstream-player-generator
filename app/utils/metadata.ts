/**
 * Utilities for fetching stream metadata with CORS proxy support
 */

import { isDevServerAvailable } from './dev-server';
import type { ServerType } from '../services/slug-storage.server';

/**
 * Fetch data through a CORS proxy
 * @param url The target URL to fetch
 * @returns Promise with the response data
 */
export async function proxyFetch(url: string): Promise<Response> {
  const isInsecureRequest = url.startsWith('http:') && typeof window !== 'undefined' && window.location.protocol === 'https:';

  if (isInsecureRequest) {
    // Use local CORS proxy for insecure requests
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    return fetch(proxyUrl);
  }

  return fetch(url);
}

/**
 * Parse metadata from Icecast /status-json.xsl response
 */
function parseIcecastMetadata(data: any): { songTitle: string; listeners: string | null } {
  try {
    const icestats = data.icestats || data;
    let source = icestats.source;

    // Handle source as an array - get the first element
    if (Array.isArray(source) && source.length > 0) {
      source = source[0];
    }

    if (source && typeof source === 'object') {
      return {
        songTitle: source.title || source.server_name || 'Unknown Song',
        listeners: source.listeners !== undefined && source.listeners !== null ? String(source.listeners) : null,
      };
    }

    // Fallback to server-level data
    return {
      songTitle: icestats.server_name || icestats.title || 'Unknown Song',
      listeners: icestats.listeners !== undefined && icestats.listeners !== null ? String(icestats.listeners) : null,
    };
  } catch {
    return {
      songTitle: 'Unknown Song',
      listeners: null,
    };
  }
}

/**
 * Parse metadata from Shoutcast v2 XML /stats response
 */
function parseShoutcastV2Xml(xml: string): { songTitle: string; listeners: string | null } {
  try {
    // Parse XML string to extract SONGTITLE and CURRENTLISTENERS
    const songTitleMatch = xml.match(/<SONGTITLE>([^<]+)<\/SONGTITLE>/i);
    const listenersMatch = xml.match(/<CURRENTLISTENERS>(\d+)<\/CURRENTLISTENERS>/i);
    const serverTitleMatch = xml.match(/<SERVERTITLE>([^<]+)<\/SERVERTITLE>/i);

    return {
      songTitle: songTitleMatch?.[1]?.trim() || serverTitleMatch?.[1]?.trim() || 'Unknown Song',
      listeners: listenersMatch?.[1] || null,
    };
  } catch {
    return {
      songTitle: 'Unknown Song',
      listeners: null,
    };
  }
}

/**
 * Parse metadata from Shoutcast v1 /stats response
 */
function parseShoutcastV1Metadata(data: any): { songTitle: string; listeners: string | null } {
  return {
    songTitle: data.songtitle || data.title || data.server_name || 'Unknown Song',
    listeners: data.currentlisteners !== undefined && data.currentlisteners !== null
      ? String(data.currentlisteners)
      : (data.listeners !== undefined && data.listeners !== null ? String(data.listeners) : null),
  };
}

/**
 * Parse metadata from Shoutcast v2 /api/statistics response
 */
function parseShoutcastV2Metadata(data: any): { songTitle: string; listeners: string | null } {
  try {
    // Shoutcast v2 API format
    if (data.statistics) {
      const stats = data.statistics;
      const streams = stats.streams || stats.stream;

      // Check if there's a stream object (either non-array or non-empty array)
      if (streams) {
        const stream = Array.isArray(streams) ? (streams.length > 0 ? streams[0] : null) : streams;

        if (stream && typeof stream === 'object' && !Array.isArray(stream)) {
          return {
            songTitle: stream.songtitle || stream.title || stream.server_name || 'Unknown Song',
            listeners: stream.currentlisteners !== undefined && stream.currentlisteners !== null
              ? String(stream.currentlisteners)
              : (stream.listeners !== undefined && stream.listeners !== null ? String(stream.listeners) : null),
          };
        }
      }

      // Fall back to statistics root level
      return {
        songTitle: stats.songtitle || stats.title || stats.server_name || 'Unknown Song',
        listeners: stats.currentlisteners !== undefined && stats.currentlisteners !== null
          ? String(stats.currentlisteners)
          : (stats.listeners !== undefined && stats.listeners !== null ? String(stats.listeners) : null),
      };
    }

    // Alternative v2 format
    return {
      songTitle: data.songtitle || data.title || data.server_name || 'Unknown Song',
      listeners: data.currentlisteners !== undefined && data.currentlisteners !== null
        ? String(data.currentlisteners)
        : (data.listeners !== undefined && data.listeners !== null ? String(data.listeners) : null),
    };
  } catch {
    return {
      songTitle: 'Unknown Song',
      listeners: null,
    };
  }
}

/**
 * Parse metadata from Shoutcast v2 7.html response (HTML page)
 */
function parseShoutcastV2Html(html: string): { songTitle: string; listeners: string | null } {
  try {
    // First, try to extract from body tag content (Shoutcast v2 format: "9,1,61,1000,9,32, Song Title")
    const bodyMatch = html.match(/<body[^>]*>(.*?)<\/body>/is);
    if (bodyMatch) {
      const bodyContent = bodyMatch[1].trim();
      // Check if it's CSV format: current,unique,peak,max,bitrate,genre,title
      const csvParts = bodyContent.split(',');
      if (csvParts.length >= 7) {
        const title = csvParts.slice(6).join(',').trim();
        if (title && title !== '') {
          return {
            songTitle: title,
            listeners: csvParts[0] || null,
          };
        }
      }
    }

    // Extract song title from HTML
    const songTitleMatch = html.match(/Current Song:<\/strong>\s*([^<\n]+)/i);
    const songTitle = songTitleMatch ? songTitleMatch[1].trim() : null;

    // Extract listeners from HTML
    const listenersMatch = html.match(/Listeners:<\/strong>\s*(\d+)/i);
    const listeners = listenersMatch ? listenersMatch[1] : null;

    // Try alternate patterns
    const altSongMatch = html.match(/<span[^>]*class="[^"]*song[^"]*"[^>]*>([^<]+)<\/span>/i);
    const altSong = altSongMatch ? altSongMatch[1].trim() : null;

    const altListenersMatch = html.match(/<td[^>]*>\s*(\d+)\s*<\/td>\s*<td[^>]*>Listeners/i);
    const altListeners = altListenersMatch ? altListenersMatch[1] : null;

    return {
      songTitle: songTitle || altSong || 'Unknown Song',
      listeners: listeners || altListeners || null,
    };
  } catch {
    return {
      songTitle: 'Unknown Song',
      listeners: null,
    };
  }
}

/**
 * Attempt to fetch metadata from a specific endpoint
 */
async function tryFetchEndpoint(
  url: string,
  parser: (data: any) => { songTitle: string; listeners: string | null },
  isHtmlParser = false
): Promise<{ success: boolean; data?: { songTitle: string; listeners: string | null } }> {
  try {
    console.log(`[metadata] Trying endpoint: ${url}`);
    const response = await proxyFetch(url);

    console.log(`[metadata] Response status: ${response.status}, ok: ${response.ok}, contentType: ${response.headers.get('content-type')}`);

    if (!response.ok) {
      console.log(`[metadata] Response not OK, returning failure`);
      return { success: false };
    }

    if (isHtmlParser) {
      const text = await response.text();
      console.log(`[metadata] Got text response (${text.length} chars), preview: ${text.substring(0, 200)}`);
      if (text) {
        const parsed = parser(text);
        console.log(`[metadata] Parsed result:`, parsed);
        return { success: true, data: parsed };
      }
      console.log(`[metadata] Text response empty, returning failure`);
      return { success: false };
    }

    const contentType = response.headers.get('content-type');

    // Check if response is JSON
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      const parsed = parser(data);
      return { success: true, data: parsed };
    }

    // Try to parse as JSON anyway
    const text = await response.text();
    if (text) {
      try {
        const data = JSON.parse(text);
        const parsed = parser(data);
        return { success: true, data: parsed };
      } catch {
        // Not JSON, try HTML parser for Shoutcast v2
        if (parser === parseShoutcastV2Metadata || parser === parseShoutcastV1Metadata) {
          const htmlParsed = parseShoutcastV2Html(text);
          if (htmlParsed.songTitle !== 'Unknown Song') {
            return { success: true, data: htmlParsed };
          }
        }
      }
    }

    return { success: false };
  } catch {
    return { success: false };
  }
}

/**
 * Fetch stream metadata from a ShoutCast/IceCast server
 * Uses the provided server type to fetch from the correct endpoint
 *
 * @param streamUrl The URL of the stream
 * @param serverType The type of server (shoutcast-v1, shoutcast-v2, or icecast)
 * @returns Promise with metadata including song title and listener count
 */
export async function fetchStreamMetadata(
  streamUrl: string,
  serverType: ServerType
): Promise<{
  songTitle: string;
  listeners: string | null;
}> {
  // Validate URL first
  try {
    new URL(streamUrl);
  } catch (error) {
    throw new Error('Invalid stream URL');
  }

  const url = new URL(streamUrl);
  const baseUrl = `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`;

  console.log(`[metadata] Fetching metadata for ${serverType} server at ${baseUrl}`);

  // Fetch metadata using the appropriate endpoint for the server type
  switch (serverType) {
    case 'icecast': {
      console.log(`[metadata] Fetching from Icecast endpoint`);
      const result = await tryFetchEndpoint(
        `${baseUrl}/status-json.xsl`,
        parseIcecastMetadata
      );
      if (result.success && result.data) {
        return result.data;
      }
      break;
    }

    case 'shoutcast-v1': {
      console.log(`[metadata] Fetching from Shoutcast v1 endpoint`);
      // Try JSON endpoint first
      let result = await tryFetchEndpoint(
        `${baseUrl}/stats?sid=1&json=1`,
        parseShoutcastV1Metadata
      );
      if (result.success && result.data) {
        return result.data;
      }
      // Fallback to 7.html
      result = await tryFetchEndpoint(
        `${baseUrl}/`,
        parseShoutcastV2Html,
        true
      );
      if (result.success && result.data) {
        return result.data;
      }
      break;
    }

    case 'shoutcast-v2': {
      console.log(`[metadata] Fetching from Shoutcast v2 endpoint`);
      // Try XML /stats first (most common for v2)
      let result = await tryFetchEndpoint(
        `${baseUrl}/stats`,
        parseShoutcastV2Xml,
        true
      );
      if (result.success && result.data) {
        return result.data;
      }
      // Try API endpoint
      result = await tryFetchEndpoint(
        `${baseUrl}/api/statistics`,
        parseShoutcastV2Metadata
      );
      if (result.success && result.data) {
        return result.data;
      }
      break;
    }

    default:
      console.log(`[metadata] Unknown server type: ${serverType}`);
      break;
  }

  // All endpoints failed - throw error
  console.log('[metadata] All endpoints failed for', serverType);
  throw new Error(`Unable to fetch metadata from ${serverType} server`);
}

// Re-export isDevServerAvailable for convenience
export { isDevServerAvailable };
