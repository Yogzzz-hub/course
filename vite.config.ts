import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { allBookingProgrammes } from './src/data/bookingProgrammes.ts';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // Server-side env (DATABASE_URL etc.) is read by the /api/* handlers that run
  // inside this dev server via process.env, but Vite's loadEnv does not populate
  // process.env. Copy non-VITE_ keys across so the local API can reach Postgres.
  const serverEnv = loadEnv(mode, process.cwd(), '');
  for (const key of Object.keys(serverEnv)) {
    if (!key.startsWith('VITE_') && process.env[key] === undefined) process.env[key] = serverEnv[key];
  }
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
        if (request.url === '/api/financier' || request.url.startsWith('/api/financier/')) {
          void import('./api/financier/index.ts')
            .then(({ dispatchNodeFinancierRequest }) => dispatchNodeFinancierRequest(request, response))
            .catch((err) => {
              response.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
              response.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Financier API error' }));
            });
          return;
        }
        if (request.url === '/api/manager' || request.url.startsWith('/api/manager/')) {
          void import('./api/manager/index.ts')
            .then(({ dispatchNodeManagerRequest }) => dispatchNodeManagerRequest(request, response))
            .catch((err) => {
              response.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
              response.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Manager API error' }));
            });
          return;
        }
        if (request.url === '/api/trainer' || request.url.startsWith('/api/trainer/')) {
          void import('./api/trainer/index.ts')
            .then(({ dispatchNodeTrainerRequest }) => dispatchNodeTrainerRequest(request, response))
            .catch((err) => {
              response.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
              response.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Trainer API error' }));
            });
          return;
        }
        if (request.url === '/api/student' || request.url.startsWith('/api/student/')) {
          void import('./api/student/index.ts')
            .then(({ dispatchNodeStudentRequest }) => dispatchNodeStudentRequest(request, response))
            .catch((err) => {
              response.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
              response.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Student API error' }));
            });
          return;
        }
        if (request.url === '/api/admin' || request.url.startsWith('/api/admin/')) {
          void import('./api/admin/index.ts')
            .then(({ dispatchNodeAdminRequest }) => dispatchNodeAdminRequest(request, response))
            .catch((err) => {
              response.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
              response.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Admin API error' }));
            });
          return;
        }
        if (request.url === '/api/booking' || request.url?.startsWith('/api/booking/')) {
          if (request.url === '/api/booking/programmes' || request.url.startsWith('/api/booking/programmes')) {
            response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
            response.end(JSON.stringify({ programmes: allBookingProgrammes }));
            return;
          }
          void import('./api/booking.ts')
            .then(({ handleRequest }) => handleRequest(request, response))
            .catch((err) => {
              response.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
              response.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Booking API error' }));
            });
          return;
        }
        if (request.url === '/api/enquiry' || request.url?.startsWith('/api/enquiry')) {
          if (request.method === 'GET') {
            response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
            response.end(JSON.stringify({ available: true, siteKey: '0x4AAAAAAABkZp0000000000' }));
            return;
          }
          if (request.method === 'POST') {
            let body = '';
            request.on('data', (chunk: Buffer) => { body += chunk; });
            request.on('end', async () => {
              try {
                const data = JSON.parse(body || '{}');
                if (process.env.DATABASE_URL) {
                  try {
                    const pg = await import('pg');
                    const pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });
                    await pool.query(
                      'INSERT INTO enquiries(id, name, email, phone, programme, contact_method, message, status, created_at, updated_at) VALUES(gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())',
                      [data.name || 'Candidate', data.email || 'lead@example.com', data.phone || null, data.programme || 'General', data.contactMethod || 'email', data.message || null, 'NEW']
                    );
                    await pool.end();
                  } catch (dbErr) {
                    console.warn('[Enquiry Dev Proxy] Database insert note:', dbErr);
                  }
                }
                response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
                response.end(JSON.stringify({ success: true, message: 'Your enquiry has been received.' }));
              } catch {
                response.writeHead(400, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
                response.end(JSON.stringify({ success: false, message: 'Invalid payload.' }));
              }
            });
            return;
          }
        }
        if (request.url?.startsWith('/api/notify')) {
          response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
          response.end(JSON.stringify({ success: true, receiver: 'aintrixacademy2026@gmail.com', message: 'Notification received' }));
          return;
        }
        response.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ available: false, message: 'No local API server is configured.' }));
      });
    },
  };
  return {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    plugins: [react(), tailwindcss(), unavailableApi],
    build: { manifest: true },
    server: {
      port: 5173,
      watch: { ignored: ['**/.local/**', '**/test-results*/**', '**/playwright-report/**', '**/.build/**', '**/dist/**'] },
      proxy: {
        '/api/learning': { target: env.VITE_LEARNING_PROXY_TARGET || 'http://127.0.0.1:8787' },
        ...(target ? { '/api': { target, changeOrigin: true } } : {}),
      },
    },
    preview: { port: 4173 },
  };
});
