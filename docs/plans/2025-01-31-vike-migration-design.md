# Vike SSR Migration Design

**Date:** 2025-01-31
**Author:** Claude
**Status:** Approved

## Goal

Migrate ShoutStream Player Generator from Vite SPA to Vike SSR with Fastify server, enabling server-side rendering, dynamic slug-based URLs, and built-in CORS proxy for stream requests.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser                              │
│  - Homepage: / (static)                                 │
│  - Player page: /player/abc12 (server-rendered)         │
│  - API: POST /api/create-slug → returns slug ID         │
│  - Proxy: GET /api/proxy?url=... → fetches stream       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Vike SSR Server (Fastify)                   │
│  - Renders pages on-demand                              │
│  - Slug storage: ./data/slugs.json                      │
│  - CORS proxy: middleware at /api/proxy                 │
│  - Metadata prefetch: fetch on server, pass to client   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│            External Stream Servers                       │
│  - Shoutcast/Icecast servers (any origin)               │
│  - Accessed via proxy to bypass CORS                    │
└─────────────────────────────────────────────────────────┘
```

## Technology Choices

| Decision | Rationale |
|----------|-----------|
| **Vike SSR** | On-demand rendering, dynamic player generation, SEO benefits |
| **Fastify (not Express)** | Faster performance, better JSON schema validation |
| **Slug-based URLs** | Clean, memorable links like `/player/abc12` |
| **File system storage (JSON)** | Simple, persistent, perfect for single-server VPS |
| **Transparent proxy middleware** | Simple, browser sees same-origin requests |

## File Structure

```
├── pages/
│   ├── index.tsx              # Homepage with onBeforeRender
│   └── player/
│       └── [slug].tsx         # Player page (dynamic route)
├── renderer/
│   └── _default.page.tsx      # Root layout with HTML wrapper
├── server/
│   ├── index.ts               # Fastify server entry point
│   ├── routes/
│   │   ├── create-slug.ts     # POST /api/create-slug
│   │   └── proxy.ts           # GET /api/proxy middleware
│   └── storage/
│       └── slug-storage.ts    # JSON file storage manager
├── data/
│   └── slugs.json             # Stored slug configurations
├── components/                # Existing React components (keep)
├── utils/                     # Existing utilities (keep)
├── vite.config.ts             # Updated for Vike
└── package.json               # New dependencies
```

## Dependencies

**Add to dependencies:**
```json
{
  "vike": "^0.122.0",
  "@fastify/cors": "^9.0.1",
  "@fastify/static": "^7.0.4",
  "nanoid": "^5.0.9"
}
```

**Add to devDependencies:**
```json
{
  "fastify": "^5.3.2",
  "tsx": "^4.19.4"
}
```

## API Endpoints

### POST /api/create-slug

Creates a new slug for a stream configuration.

**Request:**
```json
{
  "streamUrl": "http://203.9.150.181:8030/",
  "logoUrl": "https://example.com/logo.png"
}
```

**Response:**
```json
{
  "slug": "abc12xy",
  "url": "/player/abc12xy"
}
```

### GET /api/proxy?url=<encoded-url>

Proxies requests to external stream servers, adding CORS headers.

**Flow:**
1. Validate URL (http/https only)
2. Fetch from target server
3. Stream response back with CORS headers
4. Handle errors gracefully

## Data Storage

**slugs.json structure:**
```json
{
  "abc12xy": {
    "streamUrl": "http://203.9.150.181:8030/radio.mp3",
    "logoUrl": "https://example.com/logo.png",
    "createdAt": "2025-01-31T10:30:00Z",
    "accessCount": 0
  }
}
```

## Page Components

### Homepage (pages/index.tsx)
- Uses existing `HomePage` component
- Simple onBeforeRender for any initial data

### Player Page (pages/player/[slug].tsx)
- Dynamic route parameter: `slug`
- onBeforeRender flow:
  1. Fetch slug config from storage
  2. Return 404 if not found
  3. Pre-fetch metadata server-side
  4. Pass data as pageProps

### Root Layout (renderer/_default.page.tsx)
- HTML wrapper with meta tags
- Renders `<div id="page-view"></div>` for Vike hydration

## Build & Deploy

**Commands:**
```bash
npm run dev          # Vite dev server
npm run build        # Build client + server
npm run preview      # Run production server
npm run server:dev   # Watch mode for server dev
npm run server:prod  # Run production build
```

**Build output:**
```
dist/
├── client/          # Static assets
└── server/          # Server entry point
```

## Migration Steps

1. Install Vike and Fastify dependencies
2. Create Vike page structure (pages/, renderer/)
3. Implement slug storage system
4. Build Fastify server with routes
5. Update vite.config.ts for Vike
6. Migrate existing components to Vike pages
7. Update package.json scripts
8. Test SSR and proxy functionality

## Testing Strategy

- Unit tests for slug storage operations
- Integration tests for API endpoints
- SSR rendering tests
- Proxy functionality tests
- E2E tests for full user flow

## Deployment (VPS/VM)

1. Build project: `npm run build`
2. Upload to server
3. Install dependencies: `npm ci --production`
4. Run with PM2/systemd: `npm run server:prod`
5. Configure nginx reverse proxy (optional)
6. Set up SSL with Certbot (optional)
