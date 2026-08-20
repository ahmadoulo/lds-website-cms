import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * The app always calls the API on its own origin, at `/api/v1`.
 *
 * - In production, nginx (the frontend container) proxies /api to the backend
 *   container over the Docker network.
 * - In development, the dev server below does the same job.
 *
 * That keeps one single URL to configure instead of one per environment, and
 * removes CORS from the picture entirely.
 */
const API_TARGET = process.env.DEV_API_TARGET || 'http://localhost:3000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
