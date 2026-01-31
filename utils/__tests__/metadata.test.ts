/**
 * Tests for metadata utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchStreamMetadata, proxyFetch } from '../metadata';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('metadata utilities', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('proxyFetch', () => {
    it('should fetch directly for HTTPS URLs on HTTPS pages', async () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'https:' },
        writable: true,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ test: 'data' }),
      });

      await proxyFetch('https://example.com/api/data');

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/api/data');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should use local proxy for HTTP URLs on HTTPS pages', async () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'https:' },
        writable: true,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ test: 'data' }),
      });

      await proxyFetch('http://example.com/api/data');

      expect(mockFetch).toHaveBeenCalledWith('/api/proxy?url=http%3A%2F%2Fexample.com%2Fapi%2Fdata');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should fetch directly for HTTP URLs on HTTP pages', async () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'http:' },
        writable: true,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ test: 'data' }),
      });

      await proxyFetch('http://example.com/api/data');

      expect(mockFetch).toHaveBeenCalledWith('http://example.com/api/data');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchStreamMetadata - Icecast', () => {
    it('should fetch metadata from Icecast /status-json.xsl endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          icestats: {
            source: {
              title: 'Test Song - Test Artist',
              listeners: 42,
            },
          },
        }),
      });

      const result = await fetchStreamMetadata('https://stream.example.com:8000/stream');

      expect(result.songTitle).toBe('Test Song - Test Artist');
      expect(result.listeners).toBe('42');
      expect(mockFetch).toHaveBeenCalledWith('https://stream.example.com:8000/status-json.xsl');
    });

    it('should parse Icecast metadata with server_name fallback', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          icestats: {
            server_name: 'Test Radio Station',
            listeners: 100,
          },
        }),
      });

      const result = await fetchStreamMetadata('https://stream.example.com:8000/stream');

      expect(result.songTitle).toBe('Test Radio Station');
      expect(result.listeners).toBe('100');
    });

    it('should handle Icecast with array of sources', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          icestats: {
            source: [
              {
                title: 'First Stream Song',
                listeners: 25,
              },
              {
                title: 'Second Stream Song',
                listeners: 10,
              },
            ],
          },
        }),
      });

      const result = await fetchStreamMetadata('https://stream.example.com:8000/stream');

      expect(result.songTitle).toBe('First Stream Song');
      expect(result.listeners).toBe('25');
    });
  });

  describe('fetchStreamMetadata - Shoutcast v1', () => {
    it('should fetch metadata from Shoutcast v1 /stats endpoint when Icecast fails', async () => {
      // Icecast fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      // Shoutcast v1 succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          songtitle: 'Shoutcast Song - DJ Mix',
          currentlisteners: 156,
        }),
      });

      const result = await fetchStreamMetadata('https://stream.example.com:8000/stream');

      expect(result.songTitle).toBe('Shoutcast Song - DJ Mix');
      expect(result.listeners).toBe('156');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(2, 'https://stream.example.com:8000/stats?sid=1&json=1');
    });

    it('should parse Shoutcast v1 metadata with listeners field', async () => {
      // Icecast fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      // Shoutcast v1 succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          title: 'Alternative Title Field',
          listeners: 89,
        }),
      });

      const result = await fetchStreamMetadata('https://stream.example.com:8000/stream');

      expect(result.songTitle).toBe('Alternative Title Field');
      expect(result.listeners).toBe('89');
    });
  });

  describe('fetchStreamMetadata - Shoutcast v2', () => {
    it('should fetch metadata from Shoutcast v2 /api/statistics endpoint', async () => {
      // Icecast fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      // Shoutcast v1 fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      // Shoutcast v2 succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          statistics: {
            streams: [
              {
                songtitle: 'V2 Stream Song',
                currentlisteners: 234,
              },
            ],
          },
        }),
      });

      const result = await fetchStreamMetadata('https://stream.example.com:8000/stream');

      expect(result.songTitle).toBe('V2 Stream Song');
      expect(result.listeners).toBe('234');
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch).toHaveBeenNthCalledWith(3, 'https://stream.example.com:8000/api/statistics');
    });

    it('should parse Shoutcast v2 metadata with stream object', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      mockFetch.mockResolvedValueOnce({ ok: false });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          statistics: {
            stream: {
              songtitle: 'Single Stream Song',
              currentlisteners: 50,
            },
          },
        }),
      });

      const result = await fetchStreamMetadata('https://stream.example.com:8000/stream');

      expect(result.songTitle).toBe('Single Stream Song');
      expect(result.listeners).toBe('50');
    });

    it('should parse Shoutcast v2 metadata with statistics at root', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      mockFetch.mockResolvedValueOnce({ ok: false });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          statistics: {
            songtitle: 'Root Level Song',
            currentlisteners: 123,
          },
        }),
      });

      const result = await fetchStreamMetadata('https://stream.example.com:8000/stream');

      expect(result.songTitle).toBe('Root Level Song');
      expect(result.listeners).toBe('123');
    });
  });

  describe('fetchStreamMetadata - Error handling', () => {
    it('should throw error when all endpoints fail', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(fetchStreamMetadata('https://stream.example.com:8000/stream')).rejects.toThrow(
        'Unable to fetch metadata from any supported endpoint'
      );
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchStreamMetadata('https://stream.example.com:8000/stream')).rejects.toThrow();
    });

    it('should handle non-JSON responses gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'text/html' },
        text: async () => '<html></html>',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          songtitle: 'Fallback Song',
          currentlisteners: 10,
        }),
      });

      const result = await fetchStreamMetadata('https://stream.example.com:8000/stream');

      expect(result.songTitle).toBe('Fallback Song');
    });
  });

  describe('fetchStreamMetadata - Edge cases', () => {
    it('should handle stream URLs with default ports', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          icestats: {
            source: {
              title: 'Default Port Song',
              listeners: 1,
            },
          },
        }),
      });

      const result = await fetchStreamMetadata('https://stream.example.com/stream');

      expect(result.songTitle).toBe('Default Port Song');
      expect(mockFetch).toHaveBeenCalledWith('https://stream.example.com/status-json.xsl');
    });

    it('should handle missing metadata fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          icestats: {
            source: {},
          },
        }),
      });

      const result = await fetchStreamMetadata('https://stream.example.com:8000/stream');

      expect(result.songTitle).toBe('Unknown Song');
      expect(result.listeners).toBeNull();
    });

    it('should handle zero listeners', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          icestats: {
            source: {
              title: 'Unpopular Song',
              listeners: 0,
            },
          },
        }),
      });

      const result = await fetchStreamMetadata('https://stream.example.com:8000/stream');

      expect(result.songTitle).toBe('Unpopular Song');
      expect(result.listeners).toBe('0');
    });

    it('should handle URL parsing errors', async () => {
      await expect(fetchStreamMetadata('not-a-valid-url')).rejects.toThrow();
    });
  });

  describe('fetchStreamMetadata - Protocol handling', () => {
    it('should handle HTTP streams with proxy', async () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'https:' },
        writable: true,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          icestats: {
            source: {
              title: 'Proxied Stream',
              listeners: 5,
            },
          },
        }),
      });

      const result = await fetchStreamMetadata('http://insecure-stream.com:8000/stream');

      expect(result.songTitle).toBe('Proxied Stream');
      // First call should be to the proxy
      expect(mockFetch.mock.calls[0][0]).toContain('/api/proxy?url=');
    });

    it('should handle HTTPS streams without proxy', async () => {
      Object.defineProperty(window, 'location', {
        value: { protocol: 'https:' },
        writable: true,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          icestats: {
            source: {
              title: 'Direct Stream',
              listeners: 7,
            },
          },
        }),
      });

      const result = await fetchStreamMetadata('https://secure-stream.com:8000/stream');

      expect(result.songTitle).toBe('Direct Stream');
      // Should not use proxy for HTTPS
      expect(mockFetch.mock.calls[0][0]).not.toContain('/api/proxy');
    });
  });
});
