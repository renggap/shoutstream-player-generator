// app/services/slug-storage.server.ts
import fs from "fs/promises";
import path from "path";

const SLUGS_FILE = path.join(process.cwd(), "data", "slugs.json");

export interface SlugConfig {
  streamUrl: string;
  logoUrl?: string;
  createdAt: string;
  accessCount: number;
}

export async function getSlug(slug: string): Promise<SlugConfig | null> {
  try {
    const data = await fs.readFile(SLUGS_FILE, "utf-8");
    const slugs: Record<string, SlugConfig> = JSON.parse(data);
    return slugs[slug] || null;
  } catch {
    return null;
  }
}

export async function saveSlug(
  slug: string,
  config: Omit<SlugConfig, "createdAt" | "accessCount">
): Promise<void> {
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
  const config = await getSlug(slug);
  if (config) {
    await saveSlug(slug, {
      streamUrl: config.streamUrl,
      logoUrl: config.logoUrl,
    });
    // Update access count separately
    const data = await fs.readFile(SLUGS_FILE, "utf-8");
    const slugs: Record<string, SlugConfig> = JSON.parse(data);
    if (slugs[slug]) {
      slugs[slug].accessCount++;
    }
    await fs.writeFile(SLUGS_FILE, JSON.stringify(slugs, null, 2));
  }
}
