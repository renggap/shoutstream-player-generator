# Vike SSR Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Migrate ShoutStream Player Generator from Vite SPA to Vike SSR with Fastify server, enabling server-side rendering, slug-based URLs, and CORS proxy for stream requests.

**Architecture:** Replace client-side routing with Vike SSR pages. Add Fastify server with slug storage (JSON files) and proxy middleware. Existing React components become Vike page components with onBeforeRender hooks for data fetching.

**Tech Stack:** Vike 0.122, Fastify 5, TypeScript, React 19, Vite 6

---

## Task 1: Install Vike and Fastify Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install dependencies**

```bash
npm install vike@^0.122.0 nanoid@^5.0.9
npm install -D fastify@^5.3.2 tsx@^4.19.4
```

Expected: Packages added to node_modules and package.json

**Step 2: Verify installation**

```bash
cat package.json | grep -E "(vike|fastify|nanoid|tsx)"
```

Expected output shows:
```json
"vike": "^0.122.0",
"nanoid": "^5.0.9",
"fastify": "^5.3.2",
"tsx": "^4.19.4"
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install vike, fastify, nanoid, tsx dependencies"
```

---

## Task 2: Create Slug Storage System

**Files:**
- Create: `server/storage/slug-storage.ts`
- Create: `server/__tests__/slug-storage.test.ts`

**Step 1: Write the failing test**

Create `server/__tests__/slug-storage.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

```bash
npm test -- --run server/__tests__/slug-storage.test.ts
```

Expected: FAIL with "Cannot find module '../storage/slug-storage'"

**Step 3: Write minimal implementation**

Create `server/storage/slug-storage.ts`:

```typescript
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
```

**Step 4: Run test to verify it passes**

```bash
npm test -- --run server/__tests__/slug-storage.test.ts
```

Expected: PASS (5 tests passing)

**Step 5: Commit**

```bash
git add server/storage/slug-storage.ts server/__tests__/slug-storage.test.ts
git commit -m "feat: implement slug storage with JSON file persistence"
```

---

## Task 3: Create Fastify Server with Routes

**Files:**
- Create: `server/routes/create-slug.ts`
- Create: `server/routes/proxy.ts`
- Create: `server/index.ts`
- Create: `server/__tests__/routes.test.ts`

**Step 1: Write the failing test**

Create `server/__tests__/routes.test.ts`:

```typescript
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

    await app.register(createSlugRoute, { storage });
    await app.register(proxyRoute);
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
```

**Step 2: Run test to verify it fails**

```bash
npm test -- --run server/__tests__/routes.test.ts
```

Expected: FAIL with "Cannot find modules"

**Step 3: Write minimal implementation**

Create `server/routes/create-slug.ts`:

```typescript
import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { nanoid } from 'nanoid';
import { SlugStorage } from '../storage/slug-storage';

interface CreateSlugOptions {
  storage: SlugStorage;
}

export const createSlugRoute: FastifyPluginAsync<CreateSlugOptions> = fp(async (fastify, options) => {
  const { storage } = options;

  fastify.post('/create-slug', async (request, reply) => {
    const body = request.body as { streamUrl: string; logoUrl?: string };

    if (!body.streamUrl) {
      return reply.status(400).send({ error: 'streamUrl is required' });
    }

    // Generate unique slug
    let slug: string;
    let attempts = 0;
    do {
      slug = nanoid(7);
      attempts++;
    } while (await storage.exists(slug) && attempts < 10);

    if (attempts >= 10) {
      return reply.status(500).send({ error: 'Failed to generate unique slug' });
    }

    const config = {
      streamUrl: body.streamUrl,
      logoUrl: body.logoUrl || '',
      createdAt: new Date().toISOString(),
      accessCount: 0
    };

    await storage.set(slug, config);

    return {
      slug,
      url: `/player/${slug}`
    };
  });
});
```

Create `server/routes/proxy.ts`:

```typescript
import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';

export const proxyRoute: FastifyPluginAsync = fp(async (fastify) => {
  fastify.get('/proxy', async (request, reply) => {
    const { url } = request.query as { url?: string };

    if (!url) {
      return reply.status(400).send({ error: 'url parameter is required' });
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return reply.status(400).send({ error: 'Invalid URL' });
    }

    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return reply.status(400).send({ error: 'Only HTTP/HTTPS allowed' });
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ShoutStream-Player/1.0'
        }
      });

      // Forward status and headers
      reply.status(response.status);
      const headers = response.headers;
      reply.headers({
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, HEAD, OPTIONS'
      });

      if (headers.get('content-type')) {
        reply.header('content-type', headers.get('content-type'));
      }

      const body = await response.arrayBuffer();
      return reply.send(Buffer.from(body));

    } catch (error) {
      fastify.log.error({ error, url }, 'Proxy request failed');
      return reply.status(502).send({ error: 'Bad gateway' });
    }
  });
});
```

Create `server/index.ts`:

```typescript
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import { fileURLToPath } from 'url';
import path from 'path';
import { createSlugRoute } from './routes/create-slug';
import { proxyRoute } from './routes/proxy';
import { SlugStorage } from './storage/slug-storage';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

export async function createServer(port = 3000) {
  const app = Fastify({
    logger: true
  });

  // CORS
  await app.register(fastifyCors, {
    origin: true,
    credentials: true
  });

  // Storage
  const storage = new SlugStorage(path.join(root, 'data/slugs.json'));

  // API routes
  await app.register(createSlugRoute, { storage, prefix: '/api' });
  await app.register(proxyRoute, { prefix: '/api' });

  // Static files (for dev only, production uses Vike SSR)
  await app.register(fastifyStatic, {
    root: path.join(root, 'public'),
    prefix: '/'
  });

  return app;
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await createServer();
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  await app.listen({ port, host: '0.0.0.0' });
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- --run server/__tests__/routes.test.ts
```

Expected: PASS (5 tests passing)

**Step 5: Commit**

```bash
git add server/routes/ server/index.ts server/__tests__/routes.test.ts
git commit -m "feat: implement Fastify server with API routes"
```

---

## Task 4: Update vite.config.ts for Vike

**Files:**
- Modify: `vite.config.ts`

**Step 1: Update Vite config**

Replace `vite.config.ts` content with:

```typescript
import path from 'path';
import { defineConfig } from 'vite';
import vike from 'vike/plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    vike({
      // Disable client routing
      clientRouting: false,
      // Root layout
      root: path.resolve(__dirname, './renderer/_default.page.tsx')
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  },
  build: {
    outDir: 'dist/client'
  },
  ssr: {
    noExternal: ['react', 'react-dom']
  }
});
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds with dist/client/ created

**Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "feat: update vite config for vike ssr"
```

---

## Task 5: Create Vike Page Structure

**Files:**
- Create: `renderer/_default.page.tsx`
- Create: `pages/index.tsx`
- Create: `pages/player/[slug].tsx`

**Step 1: Create root layout**

Create `renderer/_default.page.tsx`:

```typescript
import { Html, Head, Body } from 'vike/utils';
import type { PageContext } from 'vike/types';

export default function Root({ pageContext }: { pageContext: PageContext }) {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ShoutStream Player Generator</title>
      </Head>
      <Body>
        <div id="page-view"></div>
      </Body>
    </Html>
  );
}
```

**Step 2: Create homepage**

Create `pages/index.tsx`:

```typescript
import { HomePage } from '../components/HomePage';
import type { PageContext } from 'vike/types';

export { HomePage };

export const onBeforeRender = async () => {
  return {
    pageContext: {
      // Any initial data needed
    }
  };
};

export interface PageContext {
  pageProps: Record<string, unknown>;
}
```

**Step 3: Create player page**

Create `pages/player/[slug].tsx`:

```typescript
import { PlayerPage } from '../../components/PlayerPage';
import type { PageContext } from 'vike/types';
import { fetchStreamMetadata } from '../../utils/metadata';
import { SlugStorage } from '../../server/storage/slug-storage';
import path from 'path';

export { PlayerPage };

export const onBeforeRender = async (pageContext: PageContext & { routeParams: { slug: string } }) => {
  const { slug } = pageContext.routeParams;

  // Fetch slug config from storage
  const storage = new SlugStorage(path.join(process.cwd(), 'data/slugs.json'));
  const config = await storage.get(slug);

  if (!config) {
    return {
      pageContext: {
        notFound: true
      }
    };
  }

  // Pre-fetch metadata server-side
  const metadata = await fetchStreamMetadata(config.streamUrl);

  return {
    pageContext: {
      pageProps: {
        streamUrl: config.streamUrl,
        logoUrl: config.logoUrl,
        initialMetadata: metadata
      }
    }
  };
};

export interface PageContext {
  pageProps: {
    streamUrl: string;
    logoUrl?: string;
    initialMetadata?: { songTitle: string; listeners: string | null };
  };
  routeParams: { slug: string };
  notFound?: boolean;
}
```

**Step 4: Commit**

```bash
git add renderer/ pages/
git commit -m "feat: create vike page structure with root layout and pages"
```

---

## Task 6: Migrate HomePage to Vike Page

**Files:**
- Modify: `components/HomePage.tsx`

**Step 1: Update HomePage for Vike**

Modify `components/HomePage.tsx` to export as page component and use API:

```typescript
import React, { useState } from 'react';
import { PlayIcon } from './icons/PlayIcon';
import { MusicNoteIcon } from './icons/MusicNoteIcon';
import { normalizeStreamUrl } from '../utils/stream-url';

interface HomePageProps {
  // No props needed for homepage
}

export const HomePage: React.FC<HomePageProps> = () => {
  const [streamUrl, setStreamUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateStreamUrl = (url: string): { isValid: boolean; error?: string; normalizedUrl?: string } => {
    if (!url.trim()) {
      return { isValid: false, error: 'Please enter a stream URL.' };
    }

    try {
      const parsedUrl = new URL(url);

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return { isValid: false, error: 'Stream URL must use HTTP or HTTPS protocol.' };
      }

      if (!parsedUrl.hostname) {
        return { isValid: false, error: 'Please enter a valid stream URL with a hostname.' };
      }

      const normalizedUrl = normalizeStreamUrl(url);
      return { isValid: true, normalizedUrl };
    } catch {
      return { isValid: false, error: 'Please enter a valid URL format.' };
    }
  };

  const validateLogoUrl = (url: string): { isValid: boolean; error?: string } => {
    if (!url.trim()) return { isValid: true };

    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return { isValid: false, error: 'Logo URL must use HTTP or HTTPS protocol.' };
      }
      return { isValid: true };
    } catch {
      return { isValid: false, error: 'Please enter a valid logo URL.' };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const streamValidation = validateStreamUrl(streamUrl);
    if (!streamValidation.isValid) {
      setError(streamValidation.error!);
      return;
    }

    const logoValidation = validateLogoUrl(logoUrl);
    if (!logoValidation.isValid) {
      setError(logoValidation.error!);
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // Call API to create slug
      const response = await fetch('/api/create-slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streamUrl: streamValidation.normalizedUrl!,
          logoUrl: logoUrl.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create player');
      }

      const data = await response.json();

      // Redirect to player page
      window.location.href = data.url;
    } catch (err) {
      setError('Failed to create player. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Rest of component remains the same...
  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        {/* Header Section */}
        <div className="text-center mb-20">
          <div className="flex items-center justify-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-apple-gray dark:bg-dm-gray flex items-center justify-center">
              <MusicNoteIcon className="w-10 h-10 text-royal-blue dark:text-dm-royal-blue" />
            </div>
          </div>

          <h1 className="text-[3rem] leading-none font-semibold tracking-tight text-graphite dark:text-white mb-4">
            ShoutStream
          </h1>

          <p className="text-lg text-apple-text-secondary dark:text-dm-text-secondary max-w-md mx-auto leading-relaxed">
            Generate beautiful, shareable audio players for any Shoutcast or Icecast stream.
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Stream URL Input */}
          <div className="group">
            <input
              type="text"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="Stream URL"
              className="input-apple text-2xl dark:text-white placeholder:text-apple-border dark:placeholder:text-dm-gray-light transition-all duration-200"
              autoComplete="off"
              required
              disabled={isLoading}
            />
          </div>

          {/* Logo URL Input */}
          <div className="group">
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="Logo URL (optional)"
              className="input-apple text-base dark:text-white placeholder:text-apple-border dark:placeholder:text-dm-gray-light transition-all duration-200"
              autoComplete="off"
              disabled={isLoading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex justify-center">
              <p className="text-red-500 text-sm font-medium px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</p>
            </div>
          )}

          {/* Generate Button */}
          <div className="flex justify-center pt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary text-base px-10 py-4 flex items-center gap-3 hover:scale-105 active:scale-95 transition-transform duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlayIcon className="w-5 h-5" />
              {isLoading ? 'Creating...' : 'Generate Player'}
            </button>
          </div>
        </form>

        {/* Example Section */}
        <div className="mt-20 text-center">
          <p className="text-muted mb-2">Try it with an example stream:</p>
          <button
            type="button"
            onClick={() => setStreamUrl('https://alfaruq1.ssl.radioislam.my.id/')}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-apple-gray dark:bg-dm-gray hover:bg-apple-gray-dark dark:hover:bg-dm-gray-light text-apple-text-secondary dark:text-dm-text-secondary rounded-lg text-sm transition-all duration-200 hover:scale-105 disabled:opacity-50"
          >
            <MusicNoteIcon className="w-4 h-4" />
            <span>Load example stream</span>
          </button>
        </div>
      </div>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add components/HomePage.tsx
git commit -m "feat: update HomePage to use API for slug creation"
```

---

## Task 7: Create PlayerPage Component

**Files:**
- Create: `components/PlayerPage.tsx`

**Step 1: Create PlayerPage component**

Create `components/PlayerPage.tsx`:

```typescript
import React from 'react';
import { AudioPlayer } from './AudioPlayer';

interface PlayerPageProps {
  streamUrl: string;
  logoUrl?: string;
  initialMetadata?: {
    songTitle: string;
    listeners: string | null;
  };
}

export const PlayerPage: React.FC<PlayerPageProps> = ({ streamUrl, logoUrl, initialMetadata }) => {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-graphite dark:text-white mb-2">
            ShoutStream Player
          </h1>
          <p className="text-sm text-apple-text-secondary dark:text-dm-text-secondary">
            Share this URL with your audience
          </p>
        </div>

        {/* Audio Player */}
        <AudioPlayer streamUrl={streamUrl} logoUrl={logoUrl} />
      </div>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add components/PlayerPage.tsx
git commit -m "feat: create PlayerPage component for vike"
```

---

## Task 8: Update package.json Scripts

**Files:**
- Modify: `package.json`

**Step 1: Update scripts**

Modify the scripts section in `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:server": "vite build --ssr",
    "preview": "node server/index.js",
    "server:dev": "tsx watch server/index.ts",
    "server:prod": "NODE_ENV=production node dist/server/index.js",
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

**Step 2: Commit**

```bash
git add package.json
git commit -m "feat: update scripts for vike ssr workflow"
```

---

## Task 9: Update Server for Vike SSR

**Files:**
- Modify: `server/index.ts`

**Step 1: Replace server content with Vike integration**

Replace `server/index.ts` with:

```typescript
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import { renderPage } from 'vike/server';
import { fileURLToPath } from 'url';
import path from 'path';
import { createSlugRoute } from './routes/create-slug';
import { proxyRoute } from './routes/proxy';
import { SlugStorage } from './storage/slug-storage';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

export async function createServer(port = 3000) {
  const app = Fastify({
    logger: true
  });

  // CORS
  await app.register(fastifyCors, {
    origin: true,
    credentials: true
  });

  // Storage
  const storage = new SlugStorage(path.join(root, 'data/slugs.json'));

  // API routes
  await app.register(createSlugRoute, { storage });
  await app.register(proxyRoute);

  // Static files from dist/client
  await app.register(fastifyStatic, {
    root: path.join(root, 'dist/client/assets'),
    prefix: '/assets',
    decorateReply: false
  });

  // SSR catch-all route
  app.get('*', async (req, reply) => {
    const url = req.raw.url || '/';

    // Don't SSR API routes or static files
    if (url.startsWith('/api/') || url.startsWith('/assets/')) {
      return reply.status(404).send('Not found');
    }

    const pageContextInit = { urlOriginal: url };
    const pageContext = await renderPage(pageContextInit);

    const { httpResponse } = pageContext;

    if (!httpResponse) {
      return reply.status(404).send('Not found');
    }

    const { body, statusCode, contentType, earlyHints } = httpResponse;

    // Set content type
    if (contentType) {
      reply.header('Content-Type', contentType);
    }

    // Set early hints if available
    if (earlyHints) {
      reply.header('Link', earlyHints.map(h => `<${h.href}>; rel=${h.rel}; as=${h.as}`).join(', '));
    }

    return reply.status(statusCode).send(body);
  });

  return app;
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await createServer();
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  await app.listen({ port, host: '0.0.0.0' });
}
```

**Step 2: Commit**

```bash
git add server/index.ts
git commit -m "feat: integrate vike ssr into fastify server"
```

---

## Task 10: Create Data Directory and Gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: Add data directory to gitignore**

Add to `.gitignore`:

```
# Slug storage data
data/
```

**Step 2: Create data directory with placeholder**

```bash
mkdir -p data
echo '{"example": {"streamUrl": "", "logoUrl": "", "createdAt": ""}}' > data/slugs.json
```

**Step 3: Commit**

```bash
git add .gitignore data/slugs.json
git commit -m "chore: add data directory and gitignore entry"
```

---

## Task 11: End-to-End Testing

**Files:**
- Modify: `server/__tests__/routes.test.ts` (extend)
- Create: `pages/__tests__/player.test.tsx`

**Step 1: Test full flow**

```bash
# Build
npm run build

# Start server in background
npm run server:dev &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Test API
curl -X POST http://localhost:3000/api/create-slug \
  -H "Content-Type: application/json" \
  -d '{"streamUrl":"http://example.com:8000/","logoUrl":"https://example.com/logo.png"}'

# Expected output: {"slug":"abc1234","url":"/player/abc1234"}

# Test player page
SLUG=$(curl -s -X POST http://localhost:3000/api/create-slug \
  -H "Content-Type: application/json" \
  -d '{"streamUrl":"http://example.com:8000/"}' | jq -r '.slug')

curl http://localhost:3000/player/$SLUG

# Expected: HTML with player page

# Cleanup
kill $SERVER_PID
```

**Step 2: Run all tests**

```bash
npm test -- --run
```

Expected: All tests passing

**Step 3: Commit**

```bash
git add -A
git commit -m "test: add e2e tests for vike ssr flow"
```

---

## Task 12: Update README

**Files:**
- Modify: `README.md`

**Step 1: Update README with new architecture**

Update the Technical Details section in README.md:

```markdown
## Technical Details

### Architecture
- **Frontend:** React 19 + TypeScript
- **SSR Framework:** Vike 0.122
- **Server:** Fastify 5
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS
- **Storage:** JSON file-based slug storage

### Development

### Available Scripts
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production (client)
- `npm run build:server` - Build server code
- `npm run server:dev` - Run Fastify server in dev mode
- `npm run server:prod` - Run production server
- `npm test` - Run tests

### Production Deployment

1. Build the project:
   ```bash
   npm run build
   npm run build:server
   ```

2. Upload to your VPS/VM

3. Install dependencies:
   ```bash
   npm ci --production
   ```

4. Start the server:
   ```bash
   npm run server:prod
   ```

5. (Optional) Use PM2 for process management:
   ```bash
   pm2 start npm --name "shoutstream" -- run server:prod
   ```

6. (Optional) Configure nginx reverse proxy and SSL
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update readme with vike ssr architecture"
```

---

## Verification Checklist

After completing all tasks:

- [ ] All 48+ tests passing
- [ ] `npm run build` succeeds
- [ ] `npm run server:dev` starts without errors
- [ ] POST /api/create-slug returns slug
- [ ] GET /player/{slug} renders HTML
- [ ] Slug persists in data/slugs.json
- [ ] GET /api/proxy works (manually test with stream URL)

---

## Notes

- **Port conflicts:** If port 3000 is in use, set `PORT=4000 npm run server:dev`
- **Data directory:** Created automatically on first run
- **Hot reload:** Use `tsx watch` for server development
- **CORS:** Proxy handles CORS for stream metadata requests
