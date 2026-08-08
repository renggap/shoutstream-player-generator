// app/services/slug-storage.server.ts

export type ServerType = 'shoutcast-v1' | 'shoutcast-v2' | 'icecast';

export interface SlugConfig {
  streamUrl: string;
  logoUrl?: string;
  serverType: ServerType;
  createdAt: string;
  accessCount: number;
}

// In-memory fallback for environments without KV or writable disk
const memoryStorage = new Map<string, SlugConfig>();

// Helper to acquire Cloudflare KV binding if present
function getKVBinding(): any {
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as any;
    if (g.SLUGS_KV) return g.SLUGS_KV;
    if (g.__env__?.SLUGS_KV) return g.__env__.SLUGS_KV;
    if (g.process?.env?.SLUGS_KV) return g.process.env.SLUGS_KV;
  }
  return null;
}

// Helper to safely import Node fs module if in Node environment
async function getFsModule() {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    return { fs, path };
  } catch {
    return null;
  }
}

function getFilePath(pathModule: any) {
  return pathModule.join(process.cwd(), "data", "slugs.json");
}

// Validate slug format to prevent path traversal
function validateSlug(slug: string): void {
  if (!slug || typeof slug !== 'string') {
    throw new Error('Slug must be a non-empty string');
  }
  if (!/^[a-zA-Z0-9-]+$/.test(slug)) {
    throw new Error('Slug contains invalid characters');
  }
  if (slug.length > 100) {
    throw new Error('Slug is too long');
  }
}

export async function getSlug(slug: string): Promise<SlugConfig | null> {
  validateSlug(slug);

  // 1. Try Cloudflare KV first
  const kv = getKVBinding();
  if (kv) {
    try {
      const data = await kv.get(`slug:${slug}`, 'json');
      if (data) return data as SlugConfig;
    } catch (e) {
      console.warn("KV fetch error:", e);
    }
  }

  // 2. Try Node filesystem
  const nodeFs = await getFsModule();
  if (nodeFs) {
    try {
      const filePath = getFilePath(nodeFs.path);
      const data = await nodeFs.fs.readFile(filePath, "utf-8");
      const slugs: Record<string, SlugConfig> = JSON.parse(data);
      if (slugs[slug]) return slugs[slug];
    } catch {
      // Fall through to memory storage
    }
  }

  // 3. Fallback to memory
  return memoryStorage.get(slug) || null;
}

export async function saveSlug(
  slug: string,
  config: Omit<SlugConfig, "createdAt" | "accessCount">
): Promise<void> {
  validateSlug(slug);

  if (!config.serverType || !['shoutcast-v1', 'shoutcast-v2', 'icecast'].includes(config.serverType)) {
    throw new Error('Invalid serverType. Must be: shoutcast-v1, shoutcast-v2, or icecast');
  }

  const record: SlugConfig = {
    ...config,
    createdAt: new Date().toISOString(),
    accessCount: 0,
  };

  // 1. Save to Cloudflare KV if bound
  const kv = getKVBinding();
  if (kv) {
    try {
      await kv.put(`slug:${slug}`, JSON.stringify(record));
    } catch (e) {
      console.warn("KV put error:", e);
    }
  }

  // 2. Save to memory
  memoryStorage.set(slug, record);

  // 3. Save to Node filesystem if supported
  const nodeFs = await getFsModule();
  if (nodeFs) {
    try {
      const filePath = getFilePath(nodeFs.path);
      let slugs: Record<string, SlugConfig> = {};
      try {
        const data = await nodeFs.fs.readFile(filePath, "utf-8");
        slugs = JSON.parse(data);
      } catch {
        // File doesn't exist yet
      }
      slugs[slug] = record;
      await nodeFs.fs.mkdir(nodeFs.path.dirname(filePath), { recursive: true });
      await nodeFs.fs.writeFile(filePath, JSON.stringify(slugs, null, 2));
    } catch {
      // Ignore fs write failure if in serverless environment
    }
  }
}

export async function incrementAccessCount(slug: string): Promise<void> {
  validateSlug(slug);

  const kv = getKVBinding();
  if (kv) {
    try {
      const record = (await kv.get(`slug:${slug}`, 'json')) as SlugConfig | null;
      if (record) {
        record.accessCount++;
        await kv.put(`slug:${slug}`, JSON.stringify(record));
        return;
      }
    } catch {
      // Ignore
    }
  }

  const memoryRecord = memoryStorage.get(slug);
  if (memoryRecord) {
    memoryRecord.accessCount++;
  }

  const nodeFs = await getFsModule();
  if (nodeFs) {
    try {
      const filePath = getFilePath(nodeFs.path);
      const data = await nodeFs.fs.readFile(filePath, "utf-8");
      const slugs: Record<string, SlugConfig> = JSON.parse(data);
      if (slugs[slug]) {
        slugs[slug].accessCount++;
        await nodeFs.fs.writeFile(filePath, JSON.stringify(slugs, null, 2));
      }
    } catch {
      // Ignore
    }
  }
}
