// app/services/slug-storage.server.ts
import fs from "fs/promises";
import path from "path";

const SLUGS_FILE = path.join(process.cwd(), "data", "slugs.json");

export type ServerType = 'shoutcast-v1' | 'shoutcast-v2' | 'icecast';

export interface SlugConfig {
  streamUrl: string;
  logoUrl?: string;
  serverType: ServerType;
  createdAt: string;
  accessCount: number;
}

// Validate slug format to prevent path traversal
function validateSlug(slug: string): void {
  if (!slug || typeof slug !== 'string') {
    throw new Error('Slug must be a non-empty string');
  }
  // Only allow alphanumeric and hyphens
  if (!/^[a-zA-Z0-9-]+$/.test(slug)) {
    throw new Error('Slug contains invalid characters');
  }
  if (slug.length > 100) {
    throw new Error('Slug is too long');
  }
}

export async function getSlug(slug: string): Promise<SlugConfig | null> {
  validateSlug(slug);

  try {
    const data = await fs.readFile(SLUGS_FILE, "utf-8");
    const slugs: Record<string, SlugConfig> = JSON.parse(data);
    return slugs[slug] || null;
  } catch (error) {
    // Only catch file not found errors, let others propagate
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function saveSlug(
  slug: string,
  config: Omit<SlugConfig, "createdAt" | "accessCount">
): Promise<void> {
  validateSlug(slug);

  // Validate serverType is provided
  if (!config.serverType || !['shoutcast-v1', 'shoutcast-v2', 'icecast'].includes(config.serverType)) {
    throw new Error('Invalid serverType. Must be: shoutcast-v1, shoutcast-v2, or icecast');
  }

  let slugs: Record<string, SlugConfig> = {};

  try {
    const data = await fs.readFile(SLUGS_FILE, "utf-8");
    slugs = JSON.parse(data);
  } catch {
    // File doesn't exist yet
  }

  slugs[slug] = {
    ...config,
    createdAt: new Date().toISOString(),
    accessCount: 0,
  };

  await fs.mkdir(path.dirname(SLUGS_FILE), { recursive: true });
  await fs.writeFile(SLUGS_FILE, JSON.stringify(slugs, null, 2));
}

export async function incrementAccessCount(slug: string): Promise<void> {
  validateSlug(slug);

  // Single read-modify-write operation
  const data = await fs.readFile(SLUGS_FILE, "utf-8");
  const slugs: Record<string, SlugConfig> = JSON.parse(data);

  if (!slugs[slug]) {
    throw new Error(`Slug ${slug} not found`);
  }

  slugs[slug].accessCount++;

  await fs.writeFile(SLUGS_FILE, JSON.stringify(slugs, null, 2));
}
