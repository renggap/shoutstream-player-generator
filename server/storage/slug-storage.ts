import fs from 'fs/promises';
import path from 'path';

export interface SlugConfig {
  streamUrl: string;
  logoUrl?: string;
  createdAt: string;
  accessCount?: number;
}

export class SlugStorage {
  private filePath: string;
  private cache: Map<string, SlugConfig> | null = null;

  constructor(filePath: string) {
    this.filePath = path.resolve(filePath);
  }

  private async load(): Promise<Map<string, SlugConfig>> {
    if (this.cache) return this.cache;

    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const obj = JSON.parse(data) as Record<string, SlugConfig>;
      this.cache = new Map(Object.entries(obj));
    } catch {
      this.cache = new Map();
    }
    return this.cache;
  }

  private async save(): Promise<void> {
    if (!this.cache) {
      this.cache = new Map();
    }
    const obj: Record<string, SlugConfig> = Object.fromEntries(this.cache.entries());
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(obj, null, 2));
  }

  async get(slug: string): Promise<SlugConfig | undefined> {
    const map = await this.load();
    return map.get(slug);
  }

  async set(slug: string, value: SlugConfig): Promise<void> {
    const map = await this.load();
    map.set(slug, value);
    await this.save();
  }

  async exists(slug: string): Promise<boolean> {
    const map = await this.load();
    return map.has(slug);
  }
}
