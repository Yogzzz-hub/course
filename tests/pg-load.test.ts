import { describe, it, expect } from 'vitest';
import pg from 'pg';
import { verifyTrialBalance, computeAccountBalances } from '../backend/services/financier/ledger';

describe.skipIf(!process.env.DATABASE_URL)('PostgreSQL Ledger & Trial Balance Verification', () => {
  it('loads entries from PostgreSQL and verifies trial balance is 100% balanced', async () => {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:mkccsql@127.0.0.1:5432/academy',
    });

    const ledgerRes = await pool.query(`
      SELECT "id", "entryNumber", "entryDate"::text, "transactionType",
             "direction", ROUND("amount" * 100)::bigint AS "amountPaise",
             "currency", "accountCode", "referenceType", "referenceId",
             "studentProfileId", "notes", "createdById"
      FROM "FinancialLedgerEntry"
      ORDER BY "entryDate" ASC, "entryNumber" ASC
    `);

    const journalMap = new Map();
    for (const row of ledgerRes.rows) {
      const baseEntryNum = row.entryNumber.replace(/-\d+$/, '');
      let je = journalMap.get(baseEntryNum);
      if (!je) {
        je = {
          id: `je-${baseEntryNum}`,
          entryNumber: baseEntryNum,
          entryDate: row.entryDate,
          transactionType: row.transactionType,
          referenceType: row.referenceType,
          referenceId: row.referenceId,
          studentProfileId: row.studentProfileId,
          batchId: null,
          trackCode: null,
          notes: row.notes,
          createdById: row.createdById || 'usr-financier',
          reversesEntryId: null,
          reversedByEntryId: null,
          lines: [],
        };
        journalMap.set(baseEntryNum, je);
      }
      je.lines.push({
        id: row.id,
        journalEntryId: je.id,
        entryNumber: baseEntryNum,
        entryDate: row.entryDate,
        transactionType: row.transactionType,
        direction: row.direction,
        amountPaise: Number(row.amountPaise),
        currency: 'INR',
        accountCode: row.accountCode,
        referenceType: row.referenceType,
        referenceId: row.referenceId,
        studentProfileId: row.studentProfileId,
        batchId: null,
        trackCode: null,
        notes: row.notes,
        createdById: row.createdById || 'usr-financier',
        reversesEntryId: null,
        reversedByEntryId: null,
      });
    }

    const entries = Array.from(journalMap.values());
    expect(entries.length).toBeGreaterThan(0);

    const tb = verifyTrialBalance(entries);
    expect(tb.balanced).toBe(true);
    expect(tb.differencePaise).toBe(0);

    const ab = computeAccountBalances(entries);
    expect(ab.length).toBe(8);

    await pool.end();
  });
});
