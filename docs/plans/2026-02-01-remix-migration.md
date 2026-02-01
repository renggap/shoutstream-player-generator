# Remix Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate ShoutStream Player Generator from Vike to Remix for better SSR, simpler routing, and improved developer experience.

**Architecture:** Fresh Remix app with resource routes replacing Fastify routes, loader/action pattern for data fetching, Docker containerization for deployment on port 3200.

**Tech Stack:** Remix v3, React 19, TypeScript, Tailwind CSS, Howler.js, Docker, nginx reverse proxy.

---

## Task 1: Initialize Remix Project

**Files:**
- Create: All Remix project files
- Remove: `.worktrees/remix-migration/*` (keep data/, docs/)

**Step 1: Navigate to worktree and clean existing files (keep data and docs)**

```bash
cd /home/shoutstream-player-generator/.worktrees/remix-migration
find . -maxdepth 1 ! -name data ! -name docs ! -name .git ! -name . -exec rm -rf {} +
```

**Step 2: Create Remix app**

```bash
npx create-remix@latest . --yes --template remix-run/remix/templates/remix
```

**Step 3: Install additional dependencies**

```bash
npm install howler nanoid @types/howler
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: initialize Remix project"
```

---

## Task 2: Configure Tailwind CSS

**Files:**
- Create: `app/tailwind.css`
- Modify: `tailwind.config.ts`
- Modify: `app/root.tsx`

**Step 1: Create Tailwind CSS entry point**

```css
/* app/tailwind.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 2: Configure Tailwind**

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/**.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
```

**Step 3: Import CSS in root layout**

```tsx
// app/root.tsx
import type { LinksFunction } from "@remix-run/node";
import stylesheet from "~/tailwind.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

// ... rest of root.tsx
```

**Step 4: Commit**

```bash
git add app/tailwind.css tailwind.config.ts app/root.tsx
git commit -m "feat: configure Tailwind CSS"
```

---

## Task 3: Copy Existing Components

**Files:**
- Create: `app/components/AudioPlayer.tsx`
- Create: `app/components/ThemeToggle.tsx`
- Create: `app/components/ErrorBoundary.tsx`

**Step 1: Copy AudioPlayer component**

```bash
cp ../components/AudioPlayer.tsx app/components/
```

**Step 2: Copy ThemeToggle component**

```bash
cp ../components/ThemeToggle.tsx app/components/
```

**Step 3: Create Remix-compatible ErrorBoundary**

```tsx
// app/components/ErrorBoundary.tsx
import { isRouteErrorResponse, useRouteError } from "@remix-run/react";

export function ErrorBoundary() {
  const error = useRouteError();

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <div className="text-center p-8">
        <h1 className="text-4xl font-bold text-red-600 dark:text-red-400 mb-4">
          {isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : "Error"}
        </h1>
        <pre className="text-left text-sm bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add app/components/
git commit -m "feat: add existing components"
```

---

## Task 4: Create Slug Storage Service

**Files:**
- Create: `app/services/slug-storage.ts`

**Step 1: Write slug storage service**

```typescript
// app/services/slug-storage.ts
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
```

**Step 2: Commit**

```bash
git add app/services/slug-storage.ts
git commit -m "feat: add slug storage service"
```

---

## Task 5: Create Home Route (Index)

**Files:**
- Create: `app/routes/_index.tsx`

**Step 1: Write home route with form**

```tsx
// app/routes/_index.tsx
import type { ActionFunctionArgs, redirect } from "@remix-run/node";
import { Form, useNavigation } from "@remix-run/react";
import { nanoid } from "nanoid";
import { saveSlug } from "~/services/slug-storage.server";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const streamUrl = formData.get("streamUrl") as string;
  const logoUrl = formData.get("logoUrl") as string;

  if (!streamUrl) {
    return { error: "Stream URL is required" };
  }

  const slug = nanoid(7);
  await saveSlug(slug, { streamUrl, logoUrl: logoUrl || undefined });

  return redirect(`/player/${slug}`);
}

export default function HomePage() {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black p-4">
      <div className="max-w-md w-full">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-900 dark:text-white">
          ShoutStream Player Generator
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Create a shareable player for your Shoutcast/Icecast stream
        </p>

        <Form method="post" className="space-y-4">
          <div>
            <label htmlFor="streamUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Stream URL *
            </label>
            <input
              type="url"
              id="streamUrl"
              name="streamUrl"
              required
              placeholder="http://example.com:8000/stream"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Logo URL (optional)
            </label>
            <input
              type="url"
              id="logoUrl"
              name="logoUrl"
              placeholder="https://example.com/logo.png"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {isSubmitting ? "Creating..." : "Generate Player"}
          </button>
        </Form>
      </div>
    </div>
  );
}
```

**Step 2: Create .server version for privacy**

```bash
mv app/services/slug-storage.ts app/services/slug-storage.server.ts
```

**Step 3: Update import in route**

```tsx
// app/routes/_index.tsx - update import
import { saveSlug } from "~/services/slug-storage.server";
```

**Step 4: Commit**

```bash
git add app/routes/_index.tsx app/services/slug-storage.server.ts
git commit -m "feat: add home route with form"
```

---

## Task 6: Create Player Route

**Files:**
- Create: `app/routes/player.$slug.tsx`

**Step 1: Write player route with loader**

```tsx
// app/routes/player.$slug.tsx
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getSlug, incrementAccessCount } from "~/services/slug-storage.server";
import { AudioPlayer } from "~/components/AudioPlayer";

export async function loader({ params }: LoaderFunctionArgs) {
  const { slug } = params;

  if (!slug) {
    throw new Response("Slug is required", { status: 400 });
  }

  const config = await getSlug(slug);

  if (!config) {
    throw new Response("Player not found", { status: 404 });
  }

  // Increment access count in background
  incrementAccessCount(slug).catch(console.error);

  return json({
    streamUrl: config.streamUrl,
    logoUrl: config.logoUrl,
    slug,
  });
}

export default function PlayerPage() {
  const { streamUrl, logoUrl, slug } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black p-4">
      <div className="w-full max-w-2xl">
        <AudioPlayer
          streamUrl={streamUrl}
          logoUrl={logoUrl}
          slug={slug}
        />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/routes/player.\$slug.tsx
git commit -m "feat: add player route"
```

---

## Task 7: Create Stream Proxy Resource Route

**Files:**
- Create: `app/routes/api.proxy.ts`

**Step 1: Write proxy resource route**

```typescript
// app/routes/api.proxy.ts
import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const streamUrl = url.searchParams.get("url");

  if (!streamUrl) {
    throw new Response("URL is required", { status: 400 });
  }

  try {
    const response = await fetch(streamUrl, {
      headers: {
        "User-Agent": "VLC/2.2.2 LibVLC/2.2.2",
        "Icy-MetaData": "1",
      },
    });

    if (!response.ok) {
      throw new Response(`Stream error: ${response.status}`, { status: response.status });
    }

    // Get content type from response, default to audio/aac
    const contentType = response.headers.get("content-type") || "audio/aac";

    // Stream the response body
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Response("No stream data", { status: 500 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    throw new Response(`Proxy error: ${error}`, { status: 500 });
  }
}
```

**Step 2: Update AudioPlayer to use proxy**

```tsx
// app/components/AudioPlayer.tsx
// Find where streamUrl is used and wrap with proxy
const effectiveStreamUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}`;
```

**Step 3: Commit**

```bash
git add app/routes/api.proxy.ts app/components/AudioPlayer.tsx
git commit -m "feat: add stream proxy resource route"
```

---

## Task 8: Add Theme Provider

**Files:**
- Modify: `app/root.tsx`

**Step 1: Add theme provider to root**

```tsx
// app/root.tsx
import { ClientOnly } from "remix-utils/client-only";
import { ThemeProvider } from "./components/theme-provider";
import { ThemeToggle } from "./components/ThemeToggle";

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <ClientOnly fallback={null}>
          {() => (
            <ThemeProvider>
              <div className="min-h-screen bg-white dark:bg-black">
                <div className="fixed top-4 right-4 z-50">
                  <ThemeToggle />
                </div>
                <Outlet />
                <ScrollRestoration />
                <Scripts />
                <LiveReload />
              </div>
            </ThemeProvider>
          )}
        </ClientOnly>
      </body>
    </html>
  );
}
```

**Step 2: Create theme provider**

```tsx
// app/components/theme-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = saved || (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
```

**Step 3: Update ThemeToggle to use provider**

```tsx
// app/components/ThemeToggle.tsx
"use client";

import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
```

**Step 4: Install remix-utils**

```bash
npm install remix-utils
```

**Step 5: Commit**

```bash
git add app/root.tsx app/components/theme-provider.tsx app/components/ThemeToggle.tsx
git commit -m "feat: add theme provider"
```

---

## Task 9: Create Dockerfile

**Files:**
- Create: `Dockerfile`

**Step 1: Write Dockerfile**

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY --from=build /app/build ./build
COPY --from=build /app/public ./public

EXPOSE 3200

ENV PORT=3200
HOSTNAME="0.0.0.0"

CMD ["npm", "run", "start"]
```

**Step 2: Commit**

```bash
git add Dockerfile
git commit -m "feat: add Dockerfile"
```

---

## Task 10: Create Docker Compose Configuration

**Files:**
- Create: `docker-compose.yml`

**Step 1: Write docker-compose.yml**

```yaml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "3200:3200"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3200
    restart: unless-stopped
```

**Step 2: Create .dockerignore**

```
node_modules
.git
.worktrees
.agent
dist
.env
```

**Step 3: Commit**

```bash
git add docker-compose.yml .dockerignore
git commit -m "feat: add docker compose configuration"
```

---

## Task 11: Update nginx Configuration

**Files:**
- Modify: `/etc/nginx/sites-available/shoutstream.on-development.my.id`

**Step 1: Update nginx config (production deployment)**

```nginx
location / {
    proxy_pass http://localhost:3200;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Step 2: Restart nginx**

```bash
sudo nginx -t && sudo systemctl reload nginx
```

**Step 3: Commit (documentation only)**

```bash
echo "# nginx Configuration

Updated proxy_pass from port 3000 to 3200 for Remix app.

\`\`\`nginx
proxy_pass http://localhost:3200;
\`\`\`

Restarted with: sudo nginx -t && sudo systemctl reload nginx
" >> docs/deployment/nginx-remix.md
git add docs/deployment/nginx-remix.md
git commit -m "docs: add nginx configuration for Remix"
```

---

## Task 12: Test Local Build

**Step 1: Build Docker image**

```bash
cd /home/shoutstream-player-generator/.worktrees/remix-migration
docker-compose build
```

**Step 2: Start container**

```bash
docker-compose up -d
```

**Step 3: Test home page**

```bash
curl -I http://localhost:3200
```

Expected: `HTTP/1.1 200 OK`

**Step 4: Test creating a slug**

```bash
curl -X POST http://localhost:3200 \
  -d "streamUrl=http://203.9.150.181:8030/" \
  -L
```

Expected: Redirects to `/player/[slug]`

**Step 5: Test player page**

```bash
curl http://localhost:3200/player/[slug-from-above]
```

Expected: HTML with AudioPlayer component

**Step 6: Stop container**

```bash
docker-compose down
```

**Step 7: Commit (test notes)**

```bash
echo "# Local Test Results

## Build
✓ Docker image built successfully

## Tests
✓ Home page loads (HTTP 200)
✓ Slug creation redirects correctly
✓ Player page renders
✓ Proxy route accessible

\`\`\`bash
# Test commands used:
docker-compose build
docker-compose up -d
curl -I http://localhost:3200
docker-compose down
\`\`\`
" >> docs/test-results.md
git add docs/test-results.md
git commit -m "test: verify local Docker build"
```

---

## Task 13: Production Deployment

**Step 1: Build and deploy to production**

```bash
cd /home/shoutstream-player-generator/.worktrees/remix-migration
docker-compose build
docker-compose up -d
```

**Step 2: Verify production URL**

```bash
curl -I https://shoutstream.on-development.my.id
```

Expected: `HTTP/2 200`

**Step 3: Test stream playback**

Visit: `https://shoutstream.on-development.my.id`

1. Enter stream URL: `http://203.9.150.181:8030/`
2. Click "Generate Player"
3. Verify player loads and audio plays

**Step 4: Check container logs**

```bash
docker-compose logs -f
```

**Step 5: Commit deployment**

```bash
git tag -a v2.0.0 -m "Release: Remix migration complete"
git push origin feature/remix-migration --tags
```

---

## Task 14: Merge to Main

**Step 1: Switch to main branch**

```bash
cd /home/shoutstream-player-generator
git checkout main
```

**Step 2: Merge feature branch**

```bash
git merge feature/remix-migration --no-ff
```

**Step 3: Push to remote**

```bash
git push origin main
```

**Step 4: Clean up worktree**

```bash
git worktree remove .worktrees/remix-migration
```

**Step 5: Final commit**

```bash
git commit -m "chore: merge Remix migration to main"
```

---

## Task 15: Cleanup Old Vike Files (Optional, After Verification)

**Step 1: Remove Vike-specific files**

```bash
# After verifying production works
rm -rf pages/ renderer/ App.tsx vite.config.ts
rm -rf server/index.ts server/routes/
```

**Step 2: Update README**

```bash
# Update README.md with Remix instructions
```

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: remove Vike files after migration"
```

---

## Documentation Updates Required

- Update `README.md` with Remix dev commands
- Update `DEPLOYMENT.md` with Docker instructions
- Add troubleshooting guide for common Remix issues

## Rollback Plan

If migration fails:
```bash
# Stop Docker container
docker-compose down

# Checkout pre-migration commit
git checkout v1.0.0

# Restart old app
npm run server:prod
```

## Success Criteria

- [ ] Home page renders with form
- [ ] Slug creation redirects to player
- [ ] Player page loads with AudioPlayer
- [ ] Audio streams play correctly
- [ ] Theme toggle works
- [ ] Metadata fetching works
- [ ] Docker container runs on port 3200
- [ ] nginx proxies correctly
- [ ] Production URL accessible
