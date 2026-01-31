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
