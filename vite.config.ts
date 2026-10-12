import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
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
      if (target) return;
      server.middlewares.use((request, response, next) => {
        if (!request.url?.startsWith('/api/')) return next();
        response.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ available: false, message: 'No local API server is configured.' }));
      });
    },
  };
  return { plugins: [react(), tailwindcss(), unavailableApi], build: { manifest: true }, server: { port: 5173, ...(target ? { proxy: { '/api': { target, changeOrigin: true } } } : {}) }, preview: { port: 4173 } };
});
