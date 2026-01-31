import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { corsProxyPlugin } from './plugins/cors-proxy-plugin';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
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
