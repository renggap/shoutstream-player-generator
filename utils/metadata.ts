/**
 * Utilities for fetching stream metadata with CORS proxy support
 */

import { isDevServerAvailable } from './dev-server';

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
 * Parse metadata from Shoutcast v1 /stats response
 */
function parseShoutcastV1Metadata(data: any): { songTitle: string; listeners: string | null } {
  return {
    songTitle: data.songtitle || data.title || 'Unknown Song',
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
            songTitle: stream.songtitle || stream.title || 'Unknown Song',
            listeners: stream.currentlisteners !== undefined && stream.currentlisteners !== null
              ? String(stream.currentlisteners)
              : (stream.listeners !== undefined && stream.listeners !== null ? String(stream.listeners) : null),
          };
        }
      }

      // Fall back to statistics root level
      return {
        songTitle: stats.songtitle || stats.title || 'Unknown Song',
        listeners: stats.currentlisteners !== undefined && stats.currentlisteners !== null
          ? String(stats.currentlisteners)
          : (stats.listeners !== undefined && stats.listeners !== null ? String(stats.listeners) : null),
      };
    }

    // Alternative v2 format
    return {
      songTitle: data.songtitle || data.title || 'Unknown Song',
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
 * Attempt to fetch metadata from a specific endpoint
 */
async function tryFetchEndpoint(
  url: string,
  parser: (data: any) => { songTitle: string; listeners: string | null }
): Promise<{ success: boolean; data?: { songTitle: string; listeners: string | null } }> {
  try {
    const response = await proxyFetch(url);

    if (!response.ok) {
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
      const data = JSON.parse(text);
      const parsed = parser(data);
      return { success: true, data: parsed };
    }

    return { success: false };
  } catch {
    return { success: false };
  }
}

/**
 * Fetch stream metadata from a ShoutCast/IceCast server
 * Tries multiple endpoints in order:
 * 1. Icecast /status-json.xsl
 * 2. Shoutcast v1 /stats?sid=1&json=1
 * 3. Shoutcast v2 /api/statistics
 *
 * @param streamUrl The URL of the stream
 * @returns Promise with metadata including song title and listener count
 */
export async function fetchStreamMetadata(streamUrl: string): Promise<{
  songTitle: string;
  listeners: string | null;
}> {
  try {
    const url = new URL(streamUrl);
    const baseUrl = `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`;

    // Try Icecast endpoint first (most common)
    const icecastResult = await tryFetchEndpoint(
      `${baseUrl}/status-json.xsl`,
      parseIcecastMetadata
    );

    if (icecastResult.success && icecastResult.data) {
      return icecastResult.data;
    }

    // Try Shoutcast v1 endpoint
    const scV1Result = await tryFetchEndpoint(
      `${baseUrl}/stats?sid=1&json=1`,
      parseShoutcastV1Metadata
    );

    if (scV1Result.success && scV1Result.data) {
      return scV1Result.data;
    }

    // Try Shoutcast v2 endpoint
    const scV2Result = await tryFetchEndpoint(
      `${baseUrl}/api/statistics`,
      parseShoutcastV2Metadata
    );

    if (scV2Result.success && scV2Result.data) {
      return scV2Result.data;
    }

    // All endpoints failed
    throw new Error('Unable to fetch metadata from any supported endpoint');
  } catch (error) {
    console.error('Failed to fetch stream metadata:', error);
    throw error;
  }
}

// Re-export isDevServerAvailable for convenience
export { isDevServerAvailable };
