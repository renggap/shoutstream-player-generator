# Production CORS Proxy Setup

For production deployments, you'll need to set up a CORS proxy server. Below are examples for common platforms.

## Cloudflare Workers

Create a new Cloudflare Worker with the following code:

```javascript
export default {
  async fetch(request) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response('Missing url parameter', { status: 400, headers: corsHeaders });
    }

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'Accept': '*/*',
          'Range': request.headers.get('Range') || '',
        },
      });

      const newResponse = new Response(response.body, response);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newResponse.headers.set(key, value);
      });

      return newResponse;
    } catch (error) {
      return new Response('Proxy error: ' + error.message, { status: 502, headers: corsHeaders });
    }
  }
};
```

## Nginx Configuration

Add this to your Nginx server block:

```nginx
location /api/proxy {
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=proxy_limit:10m rate=120r/m;
    limit_req zone=proxy_limit burst=10 nodelay;

    # Proxy configuration
    set $target_url "";
    if ($args ~* "^url=(.*)$") {
        set $target_url $1;
    }

    proxy_pass $target_url;
    proxy_ssl_server_name on;
    proxy_hide_header X-Frame-Options;

    # CORS headers
    add_header Access-Control-Allow-Origin * always;
    add_header Access-Control-Allow-Methods "GET, HEAD, POST, OPTIONS" always;
    add_header Access-Control-Max-Age 86400 always;

    # Handle preflight
    if ($request_method = OPTIONS) {
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, HEAD, POST, OPTIONS" always;
        add_header Access-Control-Max-Age 86400 always;
        add_header Content-Length 0;
        add_header Content-Type text/plain;
        return 204;
    }

    # Proxy headers
    proxy_set_header Accept *;
    proxy_set_header Range $http_range;
    proxy_buffering off;
    proxy_redirect off;
}
```

## Node.js Express Server

```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: { error: 'Too many requests' }
});

app.use('/api/proxy', limiter, (req, res, next) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing target URL' });
  }

  // Create proxy middleware
  const proxy = createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    pathRewrite: { '^/api/proxy': '' },
    headers: {
      'Accept': '*/*',
      'Range': req.headers.range || '',
    },
    onProxyRes: (proxyRes) => {
      // Add CORS headers
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    },
    selfHandleResponse: false,
  });

  proxy(req, res, next);
});

app.listen(3001, () => {
  console.log('CORS proxy server running on port 3001');
});
```

## Environment Configuration

Set the `VITE_API_PROXY_URL` environment variable to point to your production proxy:

```bash
# For Cloudflare Workers
VITE_API_PROXY_URL=https://your-worker.your-subdomain.workers.dev/api/proxy

# For custom proxy server
VITE_API_PROXY_URL=https://your-proxy-server.com/api/proxy
```

## Security Considerations

1. **Rate Limiting**: Always implement rate limiting to prevent abuse
2. **Allowed Origins**: Consider restricting which domains can be proxied
3. **Authentication**: For production, consider adding API key authentication
4. **Monitoring**: Monitor proxy usage and logs for suspicious activity
5. **HTTPS**: Always use HTTPS in production for both proxy and client connections
