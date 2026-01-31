import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SlugStorage } from '../storage/slug-storage';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('SlugStorage', () => {
  let tempDir: string;
  let storage: SlugStorage;
  let testFile: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), 'slug-storage-test-' + Math.random().toString(36).slice(2));
    await fs.mkdir(tempDir, { recursive: true });
    testFile = path.join(tempDir, 'test-slugs.json');
    storage = new SlugStorage(testFile);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should create empty storage if file does not exist', async () => {
    const data = await storage.get('nonexistent');
    expect(data).toBeUndefined();
  });

  it('should store and retrieve slug config', async () => {
    const config = {
      streamUrl: 'http://example.com:8000/stream',
      logoUrl: 'https://example.com/logo.png',
      createdAt: '2025-01-31T00:00:00Z'
    };

    await storage.set('abc12xy', config);
    const retrieved = await storage.get('abc12xy');

    expect(retrieved).toEqual(config);
  });

  it('should check if slug exists', async () => {
    await storage.set('exists123', { streamUrl: 'http://test.com' });

    const exists = await storage.exists('exists123');
    const notExists = await storage.exists('notfound');

    expect(exists).toBe(true);
    expect(notExists).toBe(false);
  });

  it('should persist data to file', async () => {
    await storage.set('persist', { streamUrl: 'http://persist.com' });

    // Create new storage instance to test persistence
    const storage2 = new SlugStorage(testFile);
    const data = await storage2.get('persist');

    expect(data).toEqual({ streamUrl: 'http://persist.com' });
  });
});
