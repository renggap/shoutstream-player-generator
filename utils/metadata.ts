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
 * Fetch stream metadata from a ShoutCast/IceCast server
 * @param streamUrl The URL of the stream
 * @returns Promise with metadata including song title and listener count
 */
export async function fetchStreamMetadata(streamUrl: string): Promise<{
  songTitle: string;
  listeners: string | null;
}> {
  try {
    const url = new URL(streamUrl);
    const statsUrl = `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}/stats?sid=1&json=1`;

    const response = await proxyFetch(statsUrl);

    if (!response.ok) {
      throw new Error(`Network response was not ok, status: ${response.status}`);
    }

    const data = await response.json();

    return {
      songTitle: data.songtitle || 'Unknown Song',
      listeners: data.currentlisteners || '0',
    };
  } catch (error) {
    console.error('Failed to fetch stream metadata:', error);
    throw error;
  }
}

// Re-export isDevServerAvailable for convenience
export { isDevServerAvailable };
