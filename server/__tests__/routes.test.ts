import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { createSlugRoute } from '../routes/create-slug';
import { proxyRoute } from '../routes/proxy';
import { SlugStorage } from '../storage/slug-storage';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

describe('API Routes', () => {
  let app: ReturnType<typeof Fastify>;
  let tempDir: string;
  let storage: SlugStorage;

  beforeAll(async () => {
    app = Fastify();

    tempDir = path.join(os.tmpdir(), 'routes-test-' + Math.random().toString(36).slice(2));
    await fs.mkdir(tempDir, { recursive: true });
    const testFile = path.join(tempDir, 'test-slugs.json');
    storage = new SlugStorage(testFile);

    await app.register(createSlugRoute, { storage, prefix: '/api' });
    await app.register(proxyRoute, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('POST /api/create-slug', () => {
    it('should create a new slug and return it', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/create-slug',
        payload: {
          streamUrl: 'http://example.com:8000/stream',
          logoUrl: 'https://example.com/logo.png'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.slug).toMatch(/^[a-z0-9]{7}$/);
      expect(body.url).toMatch(/^\/player\/[a-z0-9]{7}$/);
    });

    it('should store slug config', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/create-slug',
        payload: {
          streamUrl: 'http://test.com:8030/',
          logoUrl: 'https://test.com/logo.png'
        }
      });

      const body = JSON.parse(response.body);
      const stored = await storage.get(body.slug);

      expect(stored?.streamUrl).toBe('http://test.com:8030/');
      expect(stored?.logoUrl).toBe('https://test.com/logo.png');
    });
  });

  describe('GET /api/proxy', () => {
    it('should return 400 for invalid URL', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/proxy?url=not-a-valid-url'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for non-http protocol', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/proxy?url=file:///etc/passwd'
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
