import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}', 'components/**/*.{test,spec}.{js,ts,jsx,tsx}', 'server/**/*.{test,spec}.{js,ts,jsx,tsx}', 'utils/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'build', '.worktrees']
  },
  resolve: {
    alias: {
      '@': './'
    }
  }
})