import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

// Default APP_ORIGIN to Render's external HTTPS URL before loading API modules.
if (!process.env.APP_ORIGIN && process.env.RENDER_EXTERNAL_URL) {
  process.env.APP_ORIGIN = process.env.RENDER_EXTERNAL_URL;
}

const distRoot = resolve('dist');
if (!existsSync(distRoot)) {
  console.error('Build output "dist/" not found. Run "npm run build" before starting the server.');
  process.exit(1);
}

const [
  { default: handleBooking },
  { handleRequest: handleEnquiry },
  { handleRequest: handleNotify },
  { default: learningAdapter },
  { dispatchNodeFinancierRequest },
  { dispatchNodeManagerRequest },
  { dispatchNodeTrainerRequest },
  { dispatchNodeStudentRequest },
  { dispatchNodeAdminRequest },
  { pool },
] = await Promise.all([
  import('../api/booking.ts'),
  import('../api/enquiry.ts'),
  import('../api/notify.ts'),
  import('../api/learning.ts'),
  import('../api/financier/index.ts'),
  import('../api/manager/index.ts'),
  import('../api/trainer/index.ts'),
  import('../api/student/index.ts'),
  import('../api/admin/index.ts'),
  import('../server/db.ts'),
]);

const port = Number(process.env.PORT || 10000);
const host = process.env.HOST || '0.0.0.0';
const MAX_BODY_BYTES = 1024 * 1024;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

const COMPRESSIBLE_EXTS = new Set([
  '.html',
  '.js',
  '.mjs',
  '.css',
  '.svg',
  '.xml',
  '.txt',
  '.json',
  '.webmanifest',
]);

const SPA_ROUTES = new Set([
  '/',
  '/admin',
  '/admin-panel',
  '/student-panel',
  '/login',
  '/trainer',
  '/manager',
  '/financier',
  '/assessment',
  '/leaderboard',
  '/shared-roadmap',
  '/programmes',
  '/book-session',
  '/direct-booking',
  '/learning-experience',
  '/career-support',
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms-and-conditions',
  '/developer-readiness-test',
  '/python-aptitude-test',
  '/backend-developer-roadmap',
  '/full-stack-developer-roadmap',
  '/python-interview-practice',
  '/python-coding-challenge',
]);

const SPA_PREFIXES = [
  '/admin/',
  '/financier/',
  '/shared-roadmap/',
  '/programmes/',
  '/auth/',
  '/student-panel/',
  '/admin-panel/',
  '/trainer/',
  '/manager/',
];

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'expect',
]);

class PayloadTooLargeError extends Error {}

function firstHeader(value) {
  if (Array.isArray(value)) return value[0] || '';
  return typeof value === 'string' ? value.split(',')[0].trim() : '';
}

function getRequestOrigin(req) {
  const forwardedProto = firstHeader(req.headers['x-forwarded-proto']);
  const proto =
    forwardedProto === 'https' || forwardedProto === 'http'
      ? forwardedProto
      : process.env.RENDER
        ? 'https'
        : 'http';
  const rawHost =
    firstHeader(req.headers['x-forwarded-host']) ||
    firstHeader(req.headers.host) ||
    `127.0.0.1:${port}`;
  const safeHost = /^[a-zA-Z0-9.-]+(?::\d+)?$/.test(rawHost) ? rawHost : `127.0.0.1:${port}`;
  return `${proto}://${safeHost}`;
}

async function readRequestBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
    total += buf.length;
    if (total > MAX_BODY_BYTES) {
      req.destroy();
      throw new PayloadTooLargeError('Request payload exceeded maximum allowed size.');
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

async function toWebRequest(req, rawUrl) {
  const method = (req.method || 'GET').toUpperCase();
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined || HOP_BY_HOP_HEADERS.has(key.toLowerCase())) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.set(key, value);
    }
  }
  if (!headers.has('x-forwarded-for') && req.socket?.remoteAddress) {
    headers.set('x-forwarded-for', req.socket.remoteAddress);
  }
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? await readRequestBody(req) : undefined;
  return new Request(`${getRequestOrigin(req)}${rawUrl}`, {
    method,
    headers,
    body: body && body.length > 0 ? body : undefined,
  });
}

function sendJson(res, status, data, method = 'GET') {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(method === 'HEAD' ? undefined : body);
}

async function sendWebResponse(res, webRes, method = 'GET') {
  const headers = {};
  const cookies =
    typeof webRes.headers.getSetCookie === 'function' ? webRes.headers.getSetCookie() : [];
  for (const [key, value] of webRes.headers.entries()) {
    const lower = key.toLowerCase();
    if (lower === 'set-cookie' || lower === 'content-encoding' || lower === 'content-length') {
      continue;
    }
    headers[key] = value;
  }
  if (cookies.length > 0) {
    headers['set-cookie'] = cookies;
  }
  const buffer = Buffer.from(await webRes.arrayBuffer());
  res.writeHead(webRes.status, headers);
  res.end(method === 'HEAD' ? undefined : buffer);
}

async function handleEnquiriesSync(req, res, method) {
  if (method !== 'POST') {
    return sendJson(
      res,
      method === 'GET' || method === 'HEAD' ? 401 : 405,
      { error: method === 'GET' || method === 'HEAD' ? 'Authentication required.' : 'Method not allowed.' },
      method,
    );
  }
  const rawBody = await readRequestBody(req);
  let payload = {};
  if (rawBody.length > 0) {
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return sendJson(res, 400, { error: 'Invalid JSON request body.' });
    }
  }
  const name = typeof payload.fullName === 'string' ? payload.fullName.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  if (!name || !email || !email.includes('@')) {
    return sendJson(res, 400, { error: 'Valid fullName and email are required.' });
  }
  let stored = false;
  if (process.env.DATABASE_URL) {
    try {
      await pool.query(
        `INSERT INTO enquiries(name, email, phone, programme, contact_method, message)
         VALUES($1, $2, $3, $4, $5, $6)`,
        [
          name,
          email,
          typeof payload.phone === 'string' ? payload.phone.trim() || null : null,
          typeof payload.source === 'string' ? payload.source.trim() : 'Website CRM Sync',
          'email',
          typeof payload.message === 'string' ? payload.message.trim() || null : null,
        ],
      );
      stored = true;
    } catch (err) {
      console.warn('[enquiries sync] DB insert skipped:', err instanceof Error ? err.message : err);
    }
  }
  return sendJson(res, 202, { ok: true, received: true, stored });
}

async function handleApiRequest(req, res, pathname, rawUrl, method) {
  if (pathname === '/api/health' || pathname === '/healthz') {
    if (method !== 'GET' && method !== 'HEAD') {
      return sendJson(res, 405, { error: 'Method not allowed.' });
    }
    return sendJson(
      res,
      200,
      { ok: true, status: 'healthy', service: 'academy-website', timestamp: new Date().toISOString() },
      method,
    );
  }

  if (pathname === '/api/financier' || pathname.startsWith('/api/financier/')) {
    return dispatchNodeFinancierRequest(req, res);
  }

  if (pathname === '/api/manager' || pathname.startsWith('/api/manager/')) {
    return dispatchNodeManagerRequest(req, res);
  }

  if (pathname === '/api/trainer' || pathname.startsWith('/api/trainer/')) {
    return dispatchNodeTrainerRequest(req, res);
  }

  if (pathname === '/api/student' || pathname.startsWith('/api/student/')) {
    return dispatchNodeStudentRequest(req, res);
  }

  if (pathname === '/api/admin' || pathname.startsWith('/api/admin/')) {
    return dispatchNodeAdminRequest(req, res);
  }

  if (pathname === '/api/booking' || pathname.startsWith('/api/booking/')) {
    const webRes = await handleBooking(await toWebRequest(req, rawUrl));
    return sendWebResponse(res, webRes, method);
  }

  if (pathname === '/api/enquiry' || pathname.startsWith('/api/enquiry/')) {
    const webRes = await handleEnquiry(await toWebRequest(req, rawUrl));
    return sendWebResponse(res, webRes, method);
  }

  if (pathname === '/api/enquiries') {
    return handleEnquiriesSync(req, res, method);
  }

  if (pathname === '/api/notify' || pathname.startsWith('/api/notify/')) {
    const webRes = await handleNotify(await toWebRequest(req, rawUrl));
    return sendWebResponse(res, webRes, method);
  }

  if (pathname === '/api/learning' || pathname.startsWith('/api/learning/')) {
    const webRes = await learningAdapter.fetch(await toWebRequest(req, rawUrl));
    return sendWebResponse(res, webRes, method);
  }

  return sendJson(
    res,
    503,
    { available: false, message: 'This API endpoint is not enabled in the current deployment.' },
    method,
  );
}

function isSpaFallbackRoute(pathname) {
  return SPA_ROUTES.has(pathname) || SPA_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function resolveStaticFile(pathname) {
  const candidate = resolve(distRoot, `.${pathname}`);
  if (candidate !== distRoot && !candidate.startsWith(distRoot + sep)) {
    return { status: 403, file: null };
  }
  try {
    const info = await stat(candidate);
    if (info.isDirectory()) {
      const indexFile = resolve(candidate, 'index.html');
      const indexInfo = await stat(indexFile);
      if (indexInfo.isFile()) return { status: 200, file: indexFile };
    } else if (info.isFile()) {
      return { status: 200, file: candidate };
    }
  } catch {
    // Fall through to SPA fallback or 404.
  }

  if (extname(pathname)) {
    return { status: 404, file: null };
  }
  if (isSpaFallbackRoute(pathname)) {
    const spaShell = resolve('.build/server/spa-index.html');
    if (existsSync(spaShell)) return { status: 200, file: spaShell };
    const spaIndex = resolve(distRoot, 'index.html');
    if (existsSync(spaIndex)) return { status: 200, file: spaIndex };
  }
  const notFoundFile = resolve(distRoot, '404.html');
  if (existsSync(notFoundFile)) return { status: 404, file: notFoundFile };
  const indexFallback = resolve(distRoot, 'index.html');
  return { status: 404, file: existsSync(indexFallback) ? indexFallback : null };
}

async function handleStaticRequest(req, res, pathname, method) {
  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method not allowed');
    return;
  }

  if (pathname === '/crm' || pathname.startsWith('/crm/')) {
    res.writeHead(302, {
      Location: '/login',
      'Cache-Control': 'no-store',
    });
    res.end();
    return;
  }

  const { status, file } = await resolveStaticFile(pathname);
  if (status === 403) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(method === 'HEAD' ? undefined : 'Not found');
    return;
  }

  const body = await readFile(file);
  const extension = extname(file).toLowerCase();
  const isHashedAsset = pathname.startsWith('/assets/') && extension !== '.html';
  const compress =
    method !== 'HEAD' &&
    body.length > 1024 &&
    COMPRESSIBLE_EXTS.has(extension) &&
    /gzip/i.test(req.headers['accept-encoding'] || '');

  res.writeHead(status, {
    'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
    Vary: 'Accept-Encoding',
    ...(compress ? { 'Content-Encoding': 'gzip' } : {}),
  });
  res.end(method === 'HEAD' ? undefined : compress ? gzipSync(body) : body);
}

const server = createServer(async (req, res) => {
  const method = (req.method || 'GET').toUpperCase();
  const rawUrl = req.url || '/';
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(rawUrl, 'http://127.0.0.1').pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return;
  }

  try {
    if (pathname === '/healthz' || pathname === '/api' || pathname.startsWith('/api/')) {
      await handleApiRequest(req, res, pathname, rawUrl, method);
      return;
    }
    await handleStaticRequest(req, res, pathname, method);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return sendJson(res, 413, { error: error.message });
    }
    console.error('[Production Server Error]:', error);
    if (!res.headersSent) {
      sendJson(res, 500, { error: 'Internal server error.' });
    } else if (!res.writableEnded) {
      res.end();
    }
  }
});

server.listen(port, host, () => {
  console.log(`Production server listening on http://${host}:${port}`);
});

function shutdown() {
  server.close(() => {
    pool.end().catch(() => {}).finally(() => process.exit(0));
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
