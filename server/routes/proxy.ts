import { FastifyPluginAsync } from 'fastify';

export const proxyRoute: FastifyPluginAsync = async (fastify) => {
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
};
