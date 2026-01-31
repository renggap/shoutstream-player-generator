import { Plugin } from 'vite';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Request, Response, NextFunction } from 'express';

export interface CorsProxyOptions {
  allowedOrigins?: string[];
  rateLimit?: number;
}

export function corsProxyPlugin(options: CorsProxyOptions = {}): Plugin {
  const { allowedOrigins = [], rateLimit = 120 } = options;
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  return {
    name: 'cors-proxy',
    configureServer(server) {
      // Clean up expired rate limit entries every 5 minutes
      setInterval(() => {
        const now = Date.now();
        for (const [ip, limit] of rateLimitMap.entries()) {
          if (now >= limit.resetTime) {
            rateLimitMap.delete(ip);
          }
        }
      }, 300000);

      server.middlewares.use('/api/proxy', (req: Request, res: Response, next: NextFunction) => {
        // Rate limiting with X-Forwarded-For support for reverse proxies
        const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                         req.socket.remoteAddress ||
                         'unknown';
        const now = Date.now();
        const limit = rateLimitMap.get(clientIp);

        if (limit && now < limit.resetTime) {
          if (limit.count >= rateLimit) {
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Too many requests' }));
            return;
          }
          limit.count++;
        } else {
          rateLimitMap.set(clientIp, { count: 1, resetTime: now + 60000 });
        }

        // Get target URL from query parameter using proper URL parsing
        const queryString = req.url?.split('?')[1];
        const targetUrl = queryString ? new URLSearchParams(queryString).get('url') : null;

        if (!targetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing target URL' }));
          return;
        }

        // Validate URL
        let parsedUrl: URL;
        try {
          parsedUrl = new URL(targetUrl);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid target URL' }));
          return;
        }

        // Protocol validation - only allow http and https
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Only HTTP and HTTPS protocols are allowed' }));
          return;
        }

        // Check allowed origins if configured
        if (allowedOrigins.length > 0) {
          const originAllowed = allowedOrigins.some(origin => {
            try {
              const allowed = new URL(origin);
              return allowed.hostname === parsedUrl.hostname;
            } catch {
              return false;
            }
          });

          if (!originAllowed) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Origin not allowed' }));
            return;
          }
        }

        // Create proxy middleware
        const proxy = createProxyMiddleware({
          target: targetUrl,
          changeOrigin: true,
          ignorePath: true,
          headers: {
            'Accept': '*/*',
            'Range': req.headers.range || '',
          },
          followRedirects: false,
          selfHandleResponse: false,
        });

        proxy(req, res, next);
      });
    },
  };
}
