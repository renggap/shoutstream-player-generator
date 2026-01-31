import { SlugStorage } from '../../../server/storage/slug-storage'
import { fileURLToPath } from 'url'
import path from 'path'

export { PlayerPage } from '../../components/PlayerPage';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const storage = new SlugStorage(path.join(root, '..', '..', 'data', 'slugs.json'));

export const onBeforeRender = async (pageContext: { routeParams: { slug: string } }) => {
  const { slug } = pageContext.routeParams

  // Fetch slug config from storage
  const config = await storage.get(slug);

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