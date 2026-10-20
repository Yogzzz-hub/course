import { onRequest, type Env } from '../functions/api/enquiry.ts';
import { pool } from '../server/db.ts';

// Same validation and fail-closed approval policy on both deployment targets.
// PostgreSQL provides expiring shared storage on Vercel.
const memLimits = new Map<string, { value: string; expiresAt: number }>();
const limits: Env['ENQUIRY_LIMITS'] = {
  async get(key) {
    if (process.env.DATABASE_URL) {
      try {
        const result = await pool.query('SELECT value FROM enquiry_keys WHERE key=$1 AND expires_at>now()', [key]);
        return result.rows[0]?.value ?? null;
      } catch {
        // fallback
      }
    }
    const item = memLimits.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      memLimits.delete(key);
      return null;
    }
    return item.value;
  },
  async put(key, value, { expirationTtl }) {
    if (process.env.DATABASE_URL) {
      try {
        await pool.query("INSERT INTO enquiry_keys(key,value,expires_at) VALUES($1,$2,now()+($3 * interval '1 second')) ON CONFLICT(key) DO UPDATE SET value=$2,expires_at=now()+($3 * interval '1 second')", [key, value, expirationTtl]);
        return;
      } catch {
        // fallback
      }
    }
    memLimits.set(key, { value, expiresAt: Date.now() + expirationTtl * 1000 });
  },
};
export async function handleRequest(request:Request){
  const env:Env={
    RESEND_API_KEY:process.env.RESEND_API_KEY||'',
    ENQUIRY_FROM:process.env.ENQUIRY_FROM||'Aintrix Academy <notifications@aintrix.com>',
    ENQUIRY_TO:process.env.ENQUIRY_TO||'aintrixacademy2026@gmail.com',
    TURNSTILE_SECRET_KEY:process.env.TURNSTILE_SECRET_KEY||'',
    TURNSTILE_SITE_KEY:process.env.TURNSTILE_SITE_KEY||'',
    ALLOWED_ORIGIN:process.env.ALLOWED_ORIGIN||'',
    RATE_LIMIT_SALT:process.env.RATE_LIMIT_SALT||'',
    LEGAL_APPROVED:process.env.LEGAL_APPROVED||'false',
    ENQUIRY_LIMITS:limits,
    onPersist: async (data) => {
      try {
        await pool.query(
          'INSERT INTO enquiries(name, email, phone, programme, contact_method, message) VALUES($1, $2, $3, $4, $5, $6)',
          [data.name, data.email, data.phone || null, data.programme, data.contactMethod, data.message || null]
        );
      } catch {
        // Non-blocking if table is not yet migrated
      }
    },
  };
  if(!process.env.DATABASE_URL)env.LEGAL_APPROVED='false';
  const headers=new Headers(request.headers);
  headers.set('CF-Connecting-IP',request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||'unknown');
  return onRequest({request:new Request(request,{headers}),env});
}
export const GET=handleRequest;
export const POST=handleRequest;
