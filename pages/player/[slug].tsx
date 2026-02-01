// @ts-ignore - This module is server-side only and will be tree-shaken from client bundle
import { fileURLToPath } from 'url'
import path from 'path'

// Server-side only: Import SlugStorage only for onBeforeRender
// This file is never included in the client bundle
let getSlugConfig: (slug: string) => Promise<{ streamUrl: string; logoUrl?: string } | undefined>;

if (typeof import.meta.env === 'undefined' || import.meta.env.SSR === 'true' || import.meta.env.VITE === undefined) {
  // Server-side: dynamically import to avoid bundling in client
  const { SlugStorage } = await import('../../../server/storage/slug-storage');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const root = path.join(__dirname, '..');
  const storage = new SlugStorage(path.join(root, '..', '..', 'data', 'slugs.json'));
  getSlugConfig = storage.get.bind(storage);
} else {
  // Client-side: should never reach here (onBeforeRender is server-only)
  getSlugConfig = async () => undefined;
}

export { PlayerPage } from '../../components/PlayerPage';

export const onBeforeRender = async (pageContext: { routeParams: { slug: string } }) => {
  const { slug } = pageContext.routeParams

  // Fetch slug config from storage (server-side only)
  const config = await getSlugConfig(slug);

  if (!config) {
    return {
      pageContext: {
        httpResponse: {
          statusCode: 404,
          body: 'Player not found'
        }
      }
    }
  }

  // Return page props with stream and logo URLs
  return {
    pageContext: {
      pageProps: {
        streamUrl: config.streamUrl,
        logoUrl: config.logoUrl || undefined,
        slug
      }
    }
  }
}