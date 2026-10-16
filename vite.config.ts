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
        if (request.url?.startsWith('/api/booking/programmes')) {
          response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
          response.end(JSON.stringify({
            programmes: [{
              id: 'python-full-stack',
              title: 'Python Full-Stack Software Engineering',
              summary: 'Connect the dots between code, interfaces, databases and deployment. A structured path from programming fundamentals to full-stack development and career preparation.',
              duration: '7 months',
              currency: 'INR',
              technologies: ['Python', 'Django', 'React', 'PostgreSQL', 'Docker', 'Git'],
              packages: [
                { id: 'standard', name: 'Standard', priceMinor: 5999900, inclusions: [{ label: 'Training', included: true }, { label: 'Projects', included: true }, { label: 'Placement support', included: true }, { label: 'Free internship*', included: true }] },
                { id: 'premium', name: 'Premium', priceMinor: 7999900, inclusions: [{ label: 'Full programme', included: true }, { label: 'Intensive placement preparation', included: true }, { label: 'Paid internship*', included: true }] },
                { id: 'elite', name: 'Elite', priceMinor: 9999900, inclusions: [{ label: 'Mentorship', included: true }, { label: 'Advanced projects', included: true }, { label: 'Stronger placement support', included: true }] }
              ],
              addons: [],
              feeDisclosure: 'Listed fees from the supplied programme brief. Taxes, payment schedules, refunds, and exact package scope require academy confirmation.'
            }]
          }));
          return;
        }
        response.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ available: false, message: 'No local API server is configured.' }));
      });
    },
  };
  return { plugins: [react(), tailwindcss(), unavailableApi], build: { manifest: true }, server: { port: 5173, ...(target ? { proxy: { '/api': { target, changeOrigin: true } } } : {}) }, preview: { port: 4173 } };
});
