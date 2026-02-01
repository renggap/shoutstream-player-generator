# Remix Migration Design

**Date:** 2026-02-01
**Status:** Approved
**Migration Approach:** Fresh Start

## Overview

Migrate ShoutStream Player Generator from Vike to Remix for better SSR, simpler routing, and improved developer experience.

## Decisions Made

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| Migration Approach | Fresh Start | Clean slate, no Vike baggage |
| Deployment | Docker Container | Portable, reproducible |
| Data Storage | JSON file + volume mount | Simple, sufficient for single-instance |
| Stream Proxy | Keep existing logic | Adapt to Remix resource routes |
| Audio Streaming | Client-side Howler.js | Component already works well |

## Project Structure

```
remix-app/
├── app/
│   ├── routes/
│   │   ├── _index.tsx           # Home page (stream input)
│   │   ├── player.$slug.tsx     # Dynamic player pages
│   │   └── api.proxy.ts         # Stream proxy (resource route)
│   ├── components/
│   │   ├── AudioPlayer.tsx      # Existing Howler.js player
│   │   ├── ThemeToggle.tsx      # Dark/light mode
│   │   └── ErrorBoundary.tsx    # Error handling
│   ├── services/
│   │   └── slug-storage.ts      # JSON file storage
│   └── root.tsx                 # Root layout with Tailwind
├── data/                        # Docker volume mount
│   └── slugs.json
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Route Handlers

### Home Route (`app/routes/_index.tsx`)
```tsx
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const streamUrl = formData.get('streamUrl')
  const logoUrl = formData.get('logoUrl')

  const slug = nanoid()
  await saveSlug(slug, { streamUrl, logoUrl })
  return redirect(`/player/${slug}`)
}
```

### Player Route (`app/routes/player.$slug.tsx`)
```tsx
export async function loader({ params }: LoaderFunctionArgs) {
  const { slug } = params
  const config = await getSlug(slug)

  if (!config) {
    throw new Response('Not found', { status: 404 })
  }

  return json({ streamUrl: config.streamUrl, logoUrl: config.logoUrl })
}
```

### Proxy Route (`app/routes/api.proxy.ts`)
```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url).searchParams.get('url')
  // Fetch stream and pipe back
  return new Response(stream, {
    headers: { 'Content-Type': 'audio/aac' }
  })
}
```

## Docker Configuration

**Dockerfile:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3200
CMD ["npm", "run", "start"]
```

**docker-compose.yml:**
```yaml
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

**nginx configuration:**
```nginx
location / {
    proxy_pass http://localhost:3200;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
}
```

## Component Migration

| Component | Changes Required |
|-----------|-----------------|
| `AudioPlayer.tsx` | None (client-side React) |
| `ThemeToggle.tsx` | None (uses useState) |
| `ErrorBoundary.tsx` | Adapt to Remix `ErrorBoundary` export |
| `HomePage.tsx` | Convert to Remix form handling |
| `PlayerPage.tsx` | Merge into `player.$slug.tsx` route |

## Key Differences from Vike

| Vike | Remix |
|------|-------|
| `+Page.tsx`, `+data.ts`, `+config.ts` | Single route file with loader/action |
| `passToClient` config | Loader data automatically available |
| `+onRenderHtml` hook | Built-in, no configuration needed |
| Manual CSS imports | Import in `root.tsx` |

## Implementation Tasks

1. [ ] Create new Remix app with `npx create-remix@latest`
2. [ ] Copy existing components to `app/components/`
3. [ ] Create slug storage service
4. [ ] Implement home route with form
5. [ ] Implement player dynamic route
6. [ ] Implement proxy resource route
7. [ ] Set up Tailwind CSS
8. [ ] Create Dockerfile and docker-compose.yml
9. [ ] Test locally with Docker
10. [ ] Deploy to production with nginx

## Migration Notes

- Port changed from 3000 to 3200 to avoid conflicts
- Existing `data/slugs.json` will be mounted as Docker volume
- nginx configuration needs proxy_pass update to port 3200
- SSL configuration remains unchanged (Let's Encrypt)
