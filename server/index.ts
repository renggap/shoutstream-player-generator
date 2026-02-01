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

    const { body, statusCode, contentType } = httpResponse;

    // Set content type
    if (contentType) {
      reply.header('Content-Type', contentType);
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
