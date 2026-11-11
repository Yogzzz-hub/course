import { describe, it, expect, afterAll } from "vitest";
import { getPostgresFinancierStore, getPgPool, closePgPool } from "../backend/services/financier/pgStore";
import type { ActorIdentity } from "../backend/services/financier/types";

describe("PostgreSQL Financier Store Integration", () => {
  afterAll(async () => {
    await closePgPool();
  });

  const financierActor: ActorIdentity = {
    id: "usr-financier",
    name: "Meera Nair",
    email: "financier@apexacademy.edu",
    role: "FINANCIER",
  };

  it("initializes from live PostgreSQL and provides valid summary and ledger", async () => {
    const store = await getPostgresFinancierStore();

    const summary = store.getSummary();
    expect(summary.students.length).toBeGreaterThanOrEqual(5);
    expect(summary.trialBalance.balanced).toBe(true);
    expect(summary.trialBalance.differencePaise).toBe(0);

    const invoices = store.listInvoices();
    expect(invoices.length).toBeGreaterThanOrEqual(5);

    const payments = store.listPayments();
    expect(payments.length).toBeGreaterThanOrEqual(4);

    const ledger = store.getLedgerView();
    expect(ledger.trialBalance.balanced).toBe(true);

    const payroll = store.listPayrollRuns();
    expect(payroll.length).toBeGreaterThanOrEqual(2);
  });

  it("records a real payment, updates ledger with balanced entry, and blocks duplicate reference", async () => {
    const store = await getPostgresFinancierStore();
    const uniqueRef = `PG-TEST-${Date.now()}`;

    const payment = store.recordPayment(financierActor, {
      studentProfileId: "stu-1",
      amountPaise: 500_000, // INR 5,000.00
      paymentMethod: "UPI",
      paymentDate: new Date().toISOString(),
      externalReference: uniqueRef,
      notes: "Test UPI payment direct to PostgreSQL",
    });

    expect(payment.id).toBeDefined();
    expect(payment.receiptNumber).toMatch(/^RCP-\d+/);
    expect(payment.externalReference).toBe(uniqueRef);

    // Verify trial balance remains balanced after posting
    const ledger = store.getLedgerView();
    expect(ledger.trialBalance.balanced).toBe(true);
    expect(ledger.trialBalance.differencePaise).toBe(0);

    // Verify duplicate reference is rejected with 409
    expect(() =>
      store.recordPayment(financierActor, {
        studentProfileId: "stu-1",
        amountPaise: 500_000,
        paymentMethod: "UPI",
        paymentDate: new Date().toISOString(),
        externalReference: uniqueRef,
      })
    ).toThrowError(/duplicate/i);

    // Wait 100ms for asynchronous PG insert
    await new Promise((r) => setTimeout(r, 100));

    // Verify row in PostgreSQL
    const pool = getPgPool();
    const res = await pool.query(
      'SELECT "transactionNumber", "amount", "paymentMethod" FROM "StudentPayment" WHERE "externalReference" = $1',
      [uniqueRef]
    );
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].amount).toBe(5000);
  });
});
