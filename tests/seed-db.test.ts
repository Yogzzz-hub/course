import { describe, it, expect } from 'vitest';
import pg from 'pg';
import { seedFinancierDb } from '../scripts/seed-financier-db.ts';

describe.skipIf(!process.env.DATABASE_URL)('Seed PostgreSQL Database', () => {
  it('seeds academy and financier tables in PostgreSQL cleanly', async () => {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:mkccsql@127.0.0.1:5432/academy',
    });

    await seedFinancierDb(true); // force reseed

    const courseRes = await pool.query('SELECT count(*) FROM "Course"');
    expect(parseInt(courseRes.rows[0].count, 10)).toBeGreaterThanOrEqual(3);

    const invRes = await pool.query('SELECT count(*) FROM "Invoice"');
    expect(parseInt(invRes.rows[0].count, 10)).toBeGreaterThanOrEqual(5);

    const payRes = await pool.query('SELECT count(*) FROM "StudentPayment"');
    expect(parseInt(payRes.rows[0].count, 10)).toBeGreaterThanOrEqual(4);

    const ledgerRes = await pool.query('SELECT count(*) FROM "FinancialLedgerEntry"');
    expect(parseInt(ledgerRes.rows[0].count, 10)).toBeGreaterThanOrEqual(10);

    const prRes = await pool.query('SELECT count(*) FROM "PayrollPeriod"');
    expect(parseInt(prRes.rows[0].count, 10)).toBeGreaterThanOrEqual(2);

    await pool.end();
  });
});
