/**
 * Utilities for detecting development server availability
 */

let devServerChecked = false;
let isDevMode = false;

/**
 * Check if the development server is available
 * @returns Promise<boolean> indicating if dev server is available
 */
export async function isDevServerAvailable(): Promise<boolean> {
  if (devServerChecked) return isDevMode;

  // Check if we're in a browser environment
  if (typeof window !== 'undefined' && import.meta.env) {
    isDevMode = import.meta.env.DEV;
  }

  devServerChecked = true;
  return isDevMode;
}
