import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { spawn } from 'node:child_process';
import pg from 'pg';

if (existsSync('.env.learning.local')) loadEnvFile('.env.learning.local');
const children = new Set();
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill();
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop());
function start(args, env = {}) {
  const child = spawn(process.execPath, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  children.add(child);
  child.on('error', () => { console.error('A development service could not start.'); stop(1); });
  child.on('exit', code => { children.delete(child); if (!stopping) stop(code || 1); });
  return child;
}
try {
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in .env.learning.local. See docs/LEARNING-OPERATIONS.md.');
  const origin = new URL(process.env.APP_ORIGIN || 'http://127.0.0.1:5173');
  if (origin.origin !== origin.href.slice(0, -1) || origin.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(origin.hostname))
    throw new Error('Local development requires an HTTP APP_ORIGIN on localhost or 127.0.0.1, without a path.');
  const port = Number(process.env.PORT || 8787);
  const apiHost = process.env.API_HOST || '127.0.0.1';
  if (!['127.0.0.1', 'localhost'].includes(apiHost) || !Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('Use a loopback API_HOST and a valid PORT for local development.');
  const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  try {
    await db.query('SELECT 1 FROM learning_questions LIMIT 1');
    const versions = await db.query('SELECT version FROM platform_migrations ORDER BY version');
    if (![1, 2, 3, 4, 5, 6, 7].every(v => versions.rows.some(row => row.version === v)))
      throw new Error('migrations');
  } catch {
    throw new Error('The learning database is unreachable or needs migrations. Start PostgreSQL, then run npm run db:migrate. See docs/LEARNING-OPERATIONS.md.');
  } finally { await db.end(); }
  const target = `http://${apiHost}:${port}`;
  start(['server/index.ts'], { APP_ORIGIN: origin.origin, NODE_ENV: 'development' });
  let healthy = false;
  for (let i = 0; i < 40 && !stopping; i++) {
    try { healthy = (await fetch(`${target}/api/learning/health`, { signal: AbortSignal.timeout(1000) })).ok; } catch { /* Wait for the listener. */ }
    if (healthy) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!healthy || stopping) throw new Error('The learning API did not become healthy. Check the service output above.');
  start(['node_modules/vite/bin/vite.js', '--host', origin.hostname, '--port', origin.port || '80', '--strictPort'], { VITE_LEARNING_PROXY_TARGET: target });
  console.log(`Learning platform: ${origin.origin}/developer-readiness-test (Ctrl+C stops both services).`);
} catch (error) {
  console.error(error.message);
  stop(1);
}
