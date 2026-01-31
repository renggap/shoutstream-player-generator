import { describe, it, expect } from 'vitest';
import { encodePlayerData, decodePlayerData, type PlayerData } from '../url';

describe('URL-safe Base64 Encoding', () => {
  describe('encodePlayerData', () => {
    it('should encode player data to URL-safe Base64', () => {
      const data: PlayerData = {
        streamUrl: 'https://example.com/stream.mp3',
      };
      const encoded = encodePlayerData(data);

      // Should not contain URL-unsafe characters
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');

      // Should contain URL-safe replacements
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should encode player data with logo URL', () => {
      const data: PlayerData = {
        streamUrl: 'https://example.com/stream.mp3',
        logoUrl: 'https://example.com/logo.png',
      };
      const encoded = encodePlayerData(data);

      // Should not contain URL-unsafe characters
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');
      expect(encoded).not.toContain('=');

      // Should contain URL-safe replacements
      expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should replace + with - for URL safety', () => {
      // Create data that will produce + in standard Base64
      const data: PlayerData = {
        streamUrl: 'https://example.com/stream with spaces.mp3',
      };
      const encoded = encodePlayerData(data);
      expect(encoded).not.toContain('+');
    });

    it('should replace / with _ for URL safety', () => {
      // Create data that will produce / in standard Base64
      const data: PlayerData = {
        streamUrl: 'https://example.com/stream',
      };
      const encoded = encodePlayerData(data);
      expect(encoded).not.toContain('/');
    });

    it('should remove padding characters', () => {
      const data: PlayerData = {
        streamUrl: 'https://example.com/stream.mp3',
      };
      const encoded = encodePlayerData(data);
      expect(encoded).not.toContain('=');
    });
  });

  describe('decodePlayerData', () => {
    it('should decode valid encoded player data', () => {
      const originalData: PlayerData = {
        streamUrl: 'https://example.com/stream.mp3',
      };
      const encoded = encodePlayerData(originalData);
      const decoded = decodePlayerData(encoded);

      expect(decoded).toEqual(originalData);
    });

    it('should decode player data with logo URL', () => {
      const originalData: PlayerData = {
        streamUrl: 'https://example.com/stream.mp3',
        logoUrl: 'https://example.com/logo.png',
      };
      const encoded = encodePlayerData(originalData);
      const decoded = decodePlayerData(encoded);

      expect(decoded).toEqual(originalData);
    });

    it('should handle URL-safe characters correctly', () => {
      // Manually create an encoded string with URL-safe characters
      // "streamUrl" = "eyJzdHJlYW1VcmwiOiJodHRwczovL2V4YW1wbGUuY29tL3N0cmVhbS5tcDMifQ"
      // URL-safe version would replace + and /
      const data: PlayerData = {
        streamUrl: 'https://example.com/stream.mp3',
      };
      const encoded = encodePlayerData(data);
      const decoded = decodePlayerData(encoded);

      expect(decoded.streamUrl).toBe('https://example.com/stream.mp3');
    });

    it('should handle strings with special characters', () => {
      const data: PlayerData = {
        streamUrl: 'https://example.com/stream?param=value&other=123',
        logoUrl: 'https://example.com/logo.png?v=1',
      };
      const encoded = encodePlayerData(data);
      const decoded = decodePlayerData(encoded);

      expect(decoded).toEqual(data);
    });

    it('should restore padding correctly', () => {
      const data: PlayerData = {
        streamUrl: 'https://example.com/stream.mp3',
      };
      const encoded = encodePlayerData(data);
      expect(encoded).not.toContain('=');

      // Decoding should still work even without padding
      const decoded = decodePlayerData(encoded);
      expect(decoded).toEqual(data);
    });

    it('should throw error for invalid data structure', () => {
      // Create an invalid Base64 string
      const invalidEncoded = 'invalid-base64-string';

      expect(() => decodePlayerData(invalidEncoded)).toThrow();
    });

    it('should throw error for data without streamUrl', () => {
      // Create a valid JSON but missing streamUrl
      const invalidData = { logoUrl: 'https://example.com/logo.png' };
      const base64 = btoa(JSON.stringify(invalidData));
      const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      expect(() => decodePlayerData(urlSafe)).toThrow('Invalid player data structure');
    });

    it('should handle round-trip encoding/decoding', () => {
      const testData: PlayerData[] = [
        { streamUrl: 'http://example.com/stream.mp3' },
        { streamUrl: 'https://example.com/stream.mp3' },
        { streamUrl: 'https://radio.example.com:8000/stream', logoUrl: 'https://example.com/logo.png' },
        { streamUrl: 'https://example.com/path/to/stream.mp3?token=abc123' },
      ];

      testData.forEach((data) => {
        const encoded = encodePlayerData(data);
        const decoded = decodePlayerData(encoded);
        expect(decoded).toEqual(data);
      });
    });
  });

  describe('integration tests', () => {
    it('should produce URL-safe strings suitable for hash fragments', () => {
      const data: PlayerData = {
        streamUrl: 'https://example.com/stream.mp3',
        logoUrl: 'https://example.com/logo.png',
      };
      const encoded = encodePlayerData(data);

      // Should be safe to use in URL hash fragments
      const hashFragment = `#/player/${encoded}`;
      expect(hashFragment).toMatch(/^#\/player\/[A-Za-z0-9_-]+$/);
    });

    it('should produce consistent results for the same input', () => {
      const data: PlayerData = {
        streamUrl: 'https://example.com/stream.mp3',
      };
      const encoded1 = encodePlayerData(data);
      const encoded2 = encodePlayerData(data);

      expect(encoded1).toBe(encoded2);
    });

    it('should handle empty logo URL (undefined)', () => {
      const data: PlayerData = {
        streamUrl: 'https://example.com/stream.mp3',
      };
      const encoded = encodePlayerData(data);
      const decoded = decodePlayerData(encoded);

      expect(decoded.streamUrl).toBe('https://example.com/stream.mp3');
      expect(decoded.logoUrl).toBeUndefined();
    });

    it('should handle Unicode characters in URLs', () => {
      const data: PlayerData = {
        streamUrl: 'https://example.com/stream',
        logoUrl: 'https://example.com/café-logo.png',
      };
      const encoded = encodePlayerData(data);
      const decoded = decodePlayerData(encoded);

      expect(decoded).toEqual(data);
    });
  });
});
