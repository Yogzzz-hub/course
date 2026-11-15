import fs from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), 'db/dev.db');
if (!fs.existsSync(dbPath)) {
  console.log('[CRM] Database file not found. Initializing schema and default seed data...');
  execSync('npx prisma db push --accept-data-loss --skip-generate && node db/seeds/seed.mjs', { stdio: 'inherit' });
} else {
  console.log('[CRM] Existing database detected. Ensuring seed user accounts...');
  try {
    execSync('node db/seeds/seed.mjs', { stdio: 'inherit' });
  } catch (err) {
    console.warn('[CRM] Seed update skipped:', err.message);
  }
}

const port = process.env.PORT || '10000';
execSync(`npx next start -H 0.0.0.0 -p ${port}`, { stdio: 'inherit' });
