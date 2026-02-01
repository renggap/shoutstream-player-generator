import path from 'path';
import { defineConfig } from 'vite';
import vike from 'vike/plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    vike()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  },
  build: {
    outDir: 'dist/client'
  },
  ssr: {
    noExternal: ['react', 'react-dom']
  }
});
