// Cloudflare Pages Functions entry (advanced SSR).
// Without this, `wrangler pages deploy ./build/client` ships static assets
// only: no SSR, no /api/proxy, no /player/:slug. Pages picks up /functions
// automatically at deploy and dev time.
import { createPagesFunctionHandler } from "@react-router/cloudflare";
// @ts-ignore -- build output, no types
import * as build from "../build/server/index.js";

export const onRequest = createPagesFunctionHandler({
  build,
  getLoadContext: ({ context }: any) => {
    // slug-storage.server.ts looks up bindings on globalThis.__env__; // nothing else bridges Pages env into that lookup.
    (globalThis as any).__env__ = context.env;
    return { cloudflare: context };
  },
});
