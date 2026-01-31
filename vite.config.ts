import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { corsProxyPlugin } from './plugins/cors-proxy-plugin';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    // Add proxy for development to handle CORS
    proxy: {
      // Proxy common stream metadata endpoints to avoid CORS
      '^/(status-json\\.xsl|stats|api/statistics|7\\.html)': {
        target: (req) => {
          // Extract the original stream URL from query param or headers
          const originalUrl = req.headers['x-original-url'] || req.query['originalUrl'];
          if (originalUrl && typeof originalUrl === 'string') {
            const url = new URL(originalUrl);
            return `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`;
          }
          return '';
        },
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Add CORS headers
            proxyReq.setHeader('Origin', req.headers['origin'] || '*');
            proxyReq.setHeader('Access-Control-Request-Method', req.headers['access-control-request-method'] || 'GET');
            proxyReq.setHeader('Access-Control-Request-Headers', req.headers['access-control-request-headers'] || '*');
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Add CORS headers to response
            const origin = req.headers['origin'] || '*';
            proxyRes.setHeader('Access-Control-Allow-Origin', origin);
            proxyRes.setHeader('Access-Control-Allow-Credentials', 'true');
            proxyRes.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            proxyRes.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          });
        },
        selfResponding: false,
      },
    },
  },
  plugins: [
    react(),
    corsProxyPlugin({
      // SECURITY WARNING: allowedOrigins: [] allows any origin - suitable for development only
      // In production, configure explicit allowlist: e.g., ['https://example.com', 'https://stream.example.com']
      allowedOrigins: [],
      rateLimit: 120,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  build: {
    rollupOptions: {
      external: []
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test-setup.ts'],
  }
});
