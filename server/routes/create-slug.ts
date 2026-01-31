import { FastifyPluginAsync } from 'fastify';
import { customAlphabet } from 'nanoid';
import { SlugStorage } from '../storage/slug-storage';

interface CreateSlugOptions {
  storage: SlugStorage;
}

const nanoidLowercase = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 7);

export const createSlugRoute: FastifyPluginAsync<CreateSlugOptions> = async (fastify, options) => {
  const { storage } = options;

  fastify.post('/create-slug', async (request, reply) => {
    const body = request.body as { streamUrl: string; logoUrl?: string };

    if (!body.streamUrl) {
      return reply.status(400).send({ error: 'streamUrl is required' });
    }

    // Validate URL formats
    try {
      new URL(body.streamUrl);
    } catch {
      return reply.status(400).send({ error: 'Invalid streamUrl format' });
    }

    if (body.logoUrl) {
      try {
        new URL(body.logoUrl);
      } catch {
        return reply.status(400).send({ error: 'Invalid logoUrl format' });
      }
    }

    // Generate unique slug
    let slug: string;
    let attempts = 0;
    do {
      slug = nanoidLowercase();
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

    try {
      await storage.set(slug, config);
    } catch (error) {
      fastify.log.error({ error, slug }, 'Failed to save slug');
      return reply.status(500).send({ error: 'Failed to save slug' });
    }

    return {
      slug,
      url: `/player/${slug}`
    };
  });
};
