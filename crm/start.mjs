import { execSync } from 'node:child_process';

const dbUrl = process.env.DATABASE_URL || '';
if (!/^postgres(ql)?:\/\//.test(dbUrl)) {
  console.error('[CRM] DATABASE_URL must be a Supabase PostgreSQL URL (postgresql://...). Refusing to start.');
  process.exit(1);
}
if (!process.env.DIRECT_URL) {
  console.warn('[CRM] DIRECT_URL is not set. Migrations (db:push) need it; runtime queries use DATABASE_URL.');
}
console.log('[CRM] Using Supabase PostgreSQL database.');

// Demo/test seed data is opt-in only. Production must not inject sample users or records.
if (process.env.RUN_SEED === 'true') {
  console.warn('[CRM] RUN_SEED=true: running seed script (demo data).');
  execSync('node db/seeds/seed.mjs', { stdio: 'inherit' });
}

const port = process.env.PORT || '10000';
execSync(`npx next start -H 0.0.0.0 -p ${port}`, { stdio: 'inherit' });
