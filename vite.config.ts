import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { allBookingProgrammes } from './src/data/bookingProgrammes.ts';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const target = env.VITE_DEV_API_PROXY_TARGET;
  if (target) {
    const url = new URL(target);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
      throw new Error('Configure a valid development API proxy URL.');
  }
  const unavailableApi: Plugin = {
    name: 'local-api-unavailable',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!request.url?.startsWith('/api/')) return next();
        if (request.url.startsWith('/api/learning/')) return next();
        if (target) return next();
        if (request.url?.startsWith('/api/booking/programmes')) {
          response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
          response.end(JSON.stringify({ programmes: allBookingProgrammes }));
          return;
        }
        response.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ available: false, message: 'No local API server is configured.' }));
      });
    },
  };
  return { plugins: [react(), tailwindcss(), unavailableApi], build: { manifest: true }, server: { port: 5173, proxy: { '/api/learning': { target: env.VITE_LEARNING_PROXY_TARGET || 'http://127.0.0.1:8787' }, ...(target ? { '/api': { target, changeOrigin: true } } : {}) } }, preview: { port: 4173 } };
});
