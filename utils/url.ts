/**
 * URL-safe Base64 encoding/decoding utilities for player data.
 * These functions handle Base64 encoding with URL-safe characters,
 * replacing + with - and / with _, and removing padding.
 */

export interface PlayerData {
  streamUrl: string;
  logoUrl?: string;
}

/**
 * Encodes player data to URL-safe Base64 format.
 *
 * @param data - The player data object to encode
 * @returns URL-safe Base64 encoded string
 */
export function encodePlayerData(data: PlayerData): string {
  const jsonString = JSON.stringify(data);
  const base64 = btoa(jsonString);
  return base64
    .replace(/\+/g, '-')  // Replace + with -
    .replace(/\//g, '_')  // Replace / with _
    .replace(/=+$/, '');  // Remove padding
}

/**
 * Decodes URL-safe Base64 encoded player data.
 *
 * @param encoded - The URL-safe Base64 encoded string
 * @returns The decoded player data object
 * @throws Error if the encoded data is invalid
 */
export function decodePlayerData(encoded: string): PlayerData {
  // Reverse the URL-safe replacements
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding back
  while (base64.length % 4) {
    base64 += '=';
  }

  try {
    const jsonString = atob(base64);
    const parsedData = JSON.parse(jsonString);

    // Validate the parsed data structure
    if (typeof parsedData === 'object' && parsedData !== null && 'streamUrl' in parsedData) {
      return parsedData as PlayerData;
    } else {
      throw new Error('Invalid player data structure');
    }
  } catch (error) {
    throw new Error(`Failed to decode player data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
