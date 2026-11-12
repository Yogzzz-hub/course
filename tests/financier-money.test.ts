import { describe, expect, it, vi, afterEach } from "vitest";
import {
  allocatePaymentPaiseOldestFirst,
  applyBasisPointsPaise,
  assertPaise,
  distributePaiseByWeight,
  formatPaise,
  MoneyInvariantError,
  parseRupeesToPaise,
  sumPaise,
} from "../backend/services/financier/money";
import {
  buildCounterEntryReversal,
  createBalancedJournalEntry,
  ImmutableLedgerError,
  UnbalancedJournalError,
  validateBalancedJournalLines,
  verifyTrialBalance,
} from "../backend/services/financier/ledger";
import {
  assertValidPayrollTransition,
  calculateTrainerBatchPayrollPaise,
  PayrollInvariantError,
  validatePayrollAdjustmentInput,
} from "../backend/services/financier/payroll";
import {
  AuditWriteError,
  runWithAtomicAudit,
} from "../backend/services/financier/audit";
import {
  computeCollectionsAgeingReport,
  generateSafeCsv,
  sanitizeCsvCell,
} from "../backend/services/financier/ageing";
import { computeDashboardMetrics } from "../backend/services/financier/reports";
import {
  ConflictStateError,
  createFinancierStore,
  DualControlViolationError,
  DuplicateReferenceError,
  ValidationError,
} from "../backend/services/financier/store";
import {
  generateInvoicePdfBytes,
  generatePayslipPdfBytes,
  generateReceiptPdfBytes,
} from "../backend/services/financier/pdf";
import { createInitialFinancierState } from "../src/data/financierMock";
import { enforceFinancierRateLimit } from "../backend/services/rate-limit";
import {
  renderFeeReminderEmailHtml,
  renderInvoiceEmailHtml,
  sendFeeReminderEmail,
  sendInvoiceEmail,
} from "../backend/services/brevo-mail";

// Mock unavailable optional backend packages (prisma, pdfkit, clsx/tailwind-merge in ./utils)
// so we can verify exports on the extended legacy service modules in backend/services/*.ts as well.
vi.mock("../backend/services/prisma", () => ({
  prisma: {
    auditEvent: {
      create: vi.fn().mockResolvedValue({ id: "aud-prisma-1" }),
    },
  },
}));
vi.mock("pdfkit", () => ({ default: vi.fn() }));
vi.mock("../backend/services/utils", () => ({
  formatCurrency: (val: number) => `INR ${val}`,
  formatDate: (d: string) => d,
  cn: (...xs: string[]) => xs.filter(Boolean).join(" "),
}));

describe("Money Rules & Domain Invariants (Strict Integer Paise)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Stores & parses money strictly in integer paise with zero floats", () => {
    expect(() => assertPaise(100.5)).toThrow(MoneyInvariantError);
    expect(() => assertPaise(Number.NaN)).toThrow(MoneyInvariantError);
    expect(() => assertPaise(Number.MAX_SAFE_INTEGER + 1)).toThrow(MoneyInvariantError);

    expect(parseRupeesToPaise("45000")).toBe(4_500_000);
    expect(parseRupeesToPaise("45000.75")).toBe(4_500_075);
    expect(parseRupeesToPaise("0.01")).toBe(1);
    expect(parseRupeesToPaise("10.123")).toBeNull();
    expect(parseRupeesToPaise("1e4")).toBeNull();
    expect(parseRupeesToPaise("-500", false)).toBeNull();
    expect(parseRupeesToPaise("-500.25", true)).toBe(-50025);

    expect(formatPaise(17_250_000)).toContain("1,72,500.00");
    expect(applyBasisPointsPaise(9_000_000, 1000)).toBe(900_000); // exact 10%
    expect(distributePaiseByWeight(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(sumPaise(distributePaiseByWeight(100_001, [3, 5, 7]))).toBe(100_001);
  });

  it("2. Rejects any unbalanced double-entry journal posting (fails if debits != credits)", () => {
    expect(() =>
      validateBalancedJournalLines([
        { accountCode: "CASH", direction: "DEBIT", amountPaise: 500_000 },
        { accountCode: "STUDENT_RECEIVABLES", direction: "CREDIT", amountPaise: 499_999 },
      ])
    ).toThrow(UnbalancedJournalError);

    expect(() =>
      createBalancedJournalEntry({
        id: "je-bad",
        entryNumber: "JE-BAD",
        entryDate: new Date().toISOString(),
        transactionType: "PAYMENT",
        referenceType: "StudentPayment",
        referenceId: "pay-x",
        createdById: "usr-financier",
        lines: [
          { accountCode: "BANK", direction: "DEBIT", amountPaise: 10_000 },
          { accountCode: "REVENUE", direction: "CREDIT", amountPaise: 9_500 },
        ],
      })
    ).toThrow(UnbalancedJournalError);

    // Seed dataset itself must reconcile strictly
    const seed = createInitialFinancierState("2026-11-11T10:00:00.000Z");
    const tb = verifyTrialBalance(seed.journalEntries);
    expect(tb.balanced).toBe(true);
    expect(tb.differencePaise).toBe(0);
    expect(tb.totalDebitsPaise).toBeGreaterThan(0);

    // Confirm ledger reproduces STUDENT_RECEIVABLES === dashboard.outstandingDuesPaise
    const dash = computeDashboardMetrics(seed);
    expect(dash.trialBalanceOk).toBe(true);
    expect(dash.collectedTodayPaise).toBeGreaterThan(0);
    expect(dash.collectedWeekPaise).toBeGreaterThanOrEqual(dash.collectedTodayPaise);
    expect(dash.collectedMonthPaise).toBeGreaterThanOrEqual(dash.collectedWeekPaise);
  });

  it("3. Enforces payment & refund idempotency by blocking duplicate references", () => {
    const store = createFinancierStore(
      createInitialFinancierState("2026-11-11T10:00:00.000Z")
    );
    const financier = store.getState().actors[0];
    const admin = store.getState().actors[1];

    // Existing seeded ref UTR-UPI-661904412 cannot post again (even with whitespace/lowercase)
    expect(() =>
      store.recordPayment(financier, {
        studentProfileId: "stu-1",
        amountPaise: 100_000,
        paymentMethod: "UPI",
        paymentDate: "2026-11-11T11:00:00.000Z",
        externalReference: "  utr-upi-661904412 ",
      })
    ).toThrow(DuplicateReferenceError);

    // New unique payment succeeds and allocates oldest unpaid instalment first
    const pay = store.recordPayment(financier, {
      studentProfileId: "stu-1",
      amountPaise: 1_500_000, // INR 15,000 against OVERDUE inst-1-2
      paymentMethod: "BANK_TRANSFER",
      paymentDate: "2026-11-11T11:15:00.000Z",
      externalReference: "NEFT-UNIQ-2026-001",
    });
    expect(pay.allocations[0]?.installmentNumber).toBe(2);
    expect(pay.allocations[0]?.allocatedPaise).toBe(1_500_000);

    // Same new ref blocked immediately on retry
    expect(() =>
      store.recordPayment(financier, {
        studentProfileId: "stu-1",
        amountPaise: 1_500_000,
        paymentMethod: "BANK_TRANSFER",
        paymentDate: "2026-11-11T11:16:00.000Z",
        externalReference: "NEFT-UNIQ-2026-001",
      })
    ).toThrow(DuplicateReferenceError);

    // Refund approval + execution idempotency
    const refReq = store.requestRefund(financier, {
      paymentId: pay.id,
      amountPaise: 500_000,
      refundMethod: "BANK_TRANSFER",
      reason: "Partial overpayment refund test",
    });
    store.decideRefund(admin, {
      refundId: refReq.id,
      decision: "APPROVED",
      reason: "Admin dual-control verification completed",
    });

    // Cannot execute refund with an already used external reference
    expect(() =>
      store.executeRefund(financier, {
        refundId: refReq.id,
        externalReference: "NEFT-UNIQ-2026-001",
      })
    ).toThrow(DuplicateReferenceError);

    const executed = store.executeRefund(financier, {
      refundId: refReq.id,
      externalReference: "REF-PAYOUT-9901",
    });
    expect(executed.status).toBe("EXECUTED");

    // Second execution attempt on executed refund is blocked
    expect(() =>
      store.executeRefund(financier, {
        refundId: refReq.id,
        externalReference: "REF-PAYOUT-9902",
      })
    ).toThrow(ConflictStateError);
  });

  it("4. Allocates payment strictly to oldest overdue/unpaid instalment first", () => {
    const result = allocatePaymentPaiseOldestFirst(3_500_000, [
      { id: "inst-b", installmentNumber: 3, dueDate: "2026-12-10T00:00:00Z", remainingBalancePaise: 3_000_000 },
      { id: "inst-a", installmentNumber: 1, dueDate: "2026-10-01T00:00:00Z", remainingBalancePaise: 2_000_000 },
      { id: "inst-c", installmentNumber: 2, dueDate: "2026-11-01T00:00:00Z", remainingBalancePaise: 2_000_000 },
    ]);
    expect(result).toEqual([
      {
        installmentId: "inst-a",
        installmentNumber: 1,
        dueDate: "2026-10-01T00:00:00Z",
        allocatedPaise: 2_000_000,
        newRemainingBalancePaise: 0,
      },
      {
        installmentId: "inst-c",
        installmentNumber: 2,
        dueDate: "2026-11-01T00:00:00Z",
        allocatedPaise: 1_500_000,
        newRemainingBalancePaise: 500_000,
      },
    ]);
  });

  it("5. Rolls back entire financial mutation atomically if audit write fails", () => {
    const seed = createInitialFinancierState("2026-11-11T10:00:00.000Z");
    const store = createFinancierStore(seed, {
      onPersistAudit: () => {
        throw new AuditWriteError("Simulated audit DB failure");
      },
    });

    const financier = seed.actors[0];
    const beforeCount = store.listPayments().length;

    expect(() =>
      store.recordPayment(financier, {
        studentProfileId: "stu-1",
        amountPaise: 500_000,
        paymentMethod: "CASH",
        paymentDate: "2026-11-11T12:00:00.000Z",
        externalReference: "CSH-ROLLBACK-001",
      })
    ).toThrow(AuditWriteError);

    expect(store.listPayments().length).toBe(beforeCount);

    // Also test direct runWithAtomicAudit rollback
    const dummyState = { balance: 1000, auditLogs: [] as any[] };
    expect(() =>
      runWithAtomicAudit(
        dummyState,
        (draft) => {
          draft.balance = 500;
          return {
            result: draft.balance,
            audit: {
              id: "a1",
              actorId: "u1",
              actorName: "User",
              actorRole: "FINANCIER",
              action: "TEST",
              entityType: "Test",
              entityId: "1",
              timestamp: new Date().toISOString(),
              requestId: "r1",
              before: { balance: 1000 },
              after: { balance: 500 },
            },
          };
        },
        () => {
          throw new Error("Disk full");
        }
      )
    ).toThrow("Disk full");
    expect(dummyState.balance).toBe(1000);
    expect(dummyState.auditLogs).toHaveLength(0);
  });

  it("6. Enforces mandatory reason & dual-control separation (approver != requester) for refunds, discounts & payroll adjustments", () => {
    const store = createFinancierStore(
      createInitialFinancierState("2026-11-11T10:00:00.000Z")
    );
    const financier = store.getState().actors[0];
    const admin = store.getState().actors[1];

    // Refunds: short/missing reason rejected
    expect(() =>
      store.requestRefund(financier, {
        paymentId: "pay-1",
        amountPaise: 100_000,
        refundMethod: "UPI",
        reason: "no",
      })
    ).toThrow(ValidationError);

    const newRef = store.requestRefund(financier, {
      paymentId: "pay-1",
      amountPaise: 100_000,
      refundMethod: "UPI",
      reason: "Duplicate swipe by student reported via bank receipt",
    });

    // Self-approval blocked!
    expect(() =>
      store.decideRefund(financier, { refundId: newRef.id, decision: "APPROVED" })
    ).toThrow(DualControlViolationError);
    // Different approver succeeds
    expect(
      store.decideRefund(admin, { refundId: newRef.id, decision: "APPROVED" }).status
    ).toBe("APPROVED");

    // Discounts: short reason rejected; self-approval blocked
    expect(() =>
      store.requestDiscount(financier, {
        studentProfileId: "stu-1",
        kind: "FIXED",
        amountPaise: 200_000,
        reason: "ok",
      })
    ).toThrow(ValidationError);

    const newDisc = store.requestDiscount(financier, {
      studentProfileId: "stu-1",
      kind: "PERCENTAGE",
      basisPoints: 1000,
      reason: "Need-based tuition concession supported by income certificate",
    });
    expect(() =>
      store.decideDiscount(financier, {
        discountId: newDisc.id,
        decision: "APPROVED",
        decisionNotes: "Approving my own discount request",
      })
    ).toThrow(DualControlViolationError);

    const approvedDisc = store.decideDiscount(admin, {
      discountId: newDisc.id,
      decision: "APPROVED",
      decisionNotes: "Verified supporting concession documents.",
    });
    expect(approvedDisc.status).toBe("APPROVED");
    expect(verifyTrialBalance(store.getState().journalEntries).balanced).toBe(true);

    // Payroll adjustments: reason + dual control
    expect(() =>
      validatePayrollAdjustmentInput({
        type: "BONUS",
        amountPaise: 100_000,
        reason: "hi",
        requesterId: financier.id,
      })
    ).toThrow(PayrollInvariantError);

    const adj = store.addPayrollAdjustment(financier, {
      payrollRunId: "pr-2",
      trainerPayoutId: "pr-2-po-1",
      type: "BONUS",
      amountPaise: 150_000,
      reason: "Mentored extra mock interviews across cohort A",
    });
    expect(() =>
      store.decidePayrollAdjustment(financier, {
        payrollRunId: "pr-2",
        adjustmentId: adj.id,
        decision: "APPROVED",
      })
    ).toThrow(DualControlViolationError);

    const approvedAdj = store.decidePayrollAdjustment(admin, {
      payrollRunId: "pr-2",
      adjustmentId: adj.id,
      decision: "APPROVED",
    });
    expect(approvedAdj.status).toBe("APPROVED");
  });

  it("7. Never deletes ledger entries; voids & reverses exclusively with flipped counter-entries", () => {
    const store = createFinancierStore(
      createInitialFinancierState("2026-11-11T10:00:00.000Z")
    );
    const financier = store.getState().actors[0];
    const initialEntriesCount = store.getLedgerView().entries.length;
    const targetEntry = store
      .getLedgerView()
      .entries.find((e) => !e.reversedByEntryId && e.transactionType === "CHARGE")!;

    const counter = store.reverseJournalEntry(
      financier,
      targetEntry.id,
      "Incorrect billing period; re-issuing invoice"
    );

    const updatedEntries = store.getLedgerView().entries;
    expect(updatedEntries.length).toBe(initialEntriesCount + 1);
    expect(counter.reversesEntryId).toBe(targetEntry.id);
    expect(counter.lines[0].direction).toBe(
      targetEntry.lines[0].direction === "DEBIT" ? "CREDIT" : "DEBIT"
    );
    expect(verifyTrialBalance(updatedEntries).balanced).toBe(true);

    // Reversing already reversed entry fails
    expect(() =>
      buildCounterEntryReversal({
        original: { ...targetEntry, reversedByEntryId: counter.id },
        newEntryId: "je-dup-rev",
        newEntryNumber: "JE-DUP",
        reversalDate: "2026-11-11T12:00:00Z",
        reason: "Attempt duplicate reversal",
        createdById: financier.id,
      })
    ).toThrow(ImmutableLedgerError);

    // Voiding a paid invoice is rejected; voiding an unpaid invoice posts counter-entry reversal
    expect(() =>
      store.updateInvoiceStatus(financier, "inv-1", "VOID", "Attempting to void paid invoice")
    ).toThrow(ConflictStateError);

    const [createdInv] = store.createInvoices(financier, {
      mode: "STUDENT",
      studentProfileId: "stu-1",
      dueDate: "2026-12-01T10:00:00Z",
      status: "SENT",
      amountPaise: 400_000,
    });
    const voided = store.updateInvoiceStatus(
      financier,
      createdInv.id,
      "VOID",
      "Student switched programme track before payment"
    );
    expect(voided.status).toBe("VOID");
    expect(verifyTrialBalance(store.getState().journalEntries).balanced).toBe(true);
  });

  it("8. Computes trainer payroll from held locked classes only (excluding cancelled) & handles run transitions", () => {
    const comp = calculateTrainerBatchPayrollPaise({
      policyType: "PER_SESSION",
      applicableRatePaise: 300_000,
      sessions: [
        {
          id: "s1",
          trainerProfileId: "trn-1",
          batchId: "b1",
          batchCode: "B1",
          trackCode: "T1",
          trackTitle: "Track 1",
          sessionDate: "2026-11-01",
          durationMinutes: 120,
          sessionType: "LECTURE",
          status: "HELD",
          isLocked: true,
        },
        {
          id: "s2",
          trainerProfileId: "trn-1",
          batchId: "b1",
          batchCode: "B1",
          trackCode: "T1",
          trackTitle: "Track 1",
          sessionDate: "2026-11-02",
          durationMinutes: 120,
          sessionType: "LECTURE",
          status: "CANCELLED",
          isLocked: true,
        },
        {
          id: "s3",
          trainerProfileId: "trn-1",
          batchId: "b2",
          batchCode: "B2",
          trackCode: "T1",
          trackTitle: "Track 1",
          sessionDate: "2026-11-03",
          durationMinutes: 120,
          sessionType: "LECTURE",
          status: "SCHEDULED",
          isLocked: false,
        },
      ],
    });
    expect(comp.eligibleSessionsCount).toBe(1);
    expect(comp.baseAmountPaise).toBe(300_000);

    expect(() => assertValidPayrollTransition("DRAFT", "PAID")).toThrow(PayrollInvariantError);

    const store = createFinancierStore(
      createInitialFinancierState("2026-11-11T10:00:00.000Z")
    );
    const financier = store.getState().actors[0];
    const admin = store.getState().actors[1];

    const approved = store.transitionPayrollRun(financier, "pr-2", "APPROVED");
    expect(approved.status).toBe("APPROVED");
    const paid = store.transitionPayrollRun(admin, "pr-2", "PAID");
    expect(paid.status).toBe("PAID");
    expect(verifyTrialBalance(store.getState().journalEntries).balanced).toBe(true);
  });

  it("9. Computes all four collections ageing buckets (0-30, 31-60, 61-90, 90+) and sanitizes CSV formulas", () => {
    const seed = createInitialFinancierState("2026-11-11T10:00:00.000Z");
    const ageing = computeCollectionsAgeingReport(seed);
    expect(ageing.buckets.map((b) => b.bucket)).toEqual(["0-30", "31-60", "61-90", "90+"]);
    for (const bucket of ageing.buckets) {
      expect(bucket.amountPaise).toBeGreaterThan(0);
    }

    expect(sanitizeCsvCell("=CMD|' /C calc'!A0")).toBe("'=CMD|' /C calc'!A0");
    expect(sanitizeCsvCell("+SUM(A1:A2)")).toBe("'+SUM(A1:A2)");
    expect(sanitizeCsvCell("@mention")).toBe("'@mention");
    expect(sanitizeCsvCell("Normal Text")).toBe("Normal Text");

    const csv = generateSafeCsv([{ name: "=HACK()", amount: "100.00" }]);
    expect(csv).toContain("\"'=HACK()\"");
  });

  it("10. Generates valid PDF 1.4 bytes for invoices, receipts & payslips, renders Brevo emails, and checks rate-limit & audit exports", async () => {
    const seed = createInitialFinancierState("2026-11-11T10:00:00.000Z");
    const invPdf = new TextDecoder().decode(generateInvoicePdfBytes(seed.invoices[0]));
    const rcpPdf = new TextDecoder().decode(generateReceiptPdfBytes(seed.payments[0]));
    const payPdf = new TextDecoder().decode(
      generatePayslipPdfBytes(seed.payrollRuns[0], seed.payrollRuns[0].payouts[0])
    );

    for (const pdfText of [invPdf, rcpPdf, payPdf]) {
      expect(pdfText.startsWith("%PDF-1.4")).toBe(true);
      expect(pdfText).toContain("xref");
      expect(pdfText.trimEnd().endsWith("%%EOF")).toBe(true);
    }

    expect(
      renderInvoiceEmailHtml({
        studentName: "Asha Rao",
        invoiceNumber: "INV-2026-0099",
        programmeTitle: "Python Full-Stack",
        batchCode: "BATCH-PY-2026-A",
        dueDate: "2026-12-01",
        amountFormatted: "INR 30,000.00",
        status: "SENT",
      })
    ).toContain("INV-2026-0099");

    expect(
      renderFeeReminderEmailHtml({
        studentName: "Rohan Iyer",
        registrationNumber: "APX-2026-0105",
        outstandingFormatted: "INR 60,000.00",
        overdueDays: 108,
        batchCode: "BATCH-DSA-2026-C",
      })
    ).toContain("108 days");

    const simRes = await sendInvoiceEmail({
      to: "karthik@apexacademy.edu",
      studentName: "Karthik",
      invoiceNumber: "INV-1",
      programmeTitle: "Python",
      batchCode: "B1",
      dueDate: "2026-11-30",
      amountFormatted: "INR 30,000.00",
      status: "SENT",
    });
    expect(simRes.success).toBe(true);
    expect(simRes.provider).toBe("simulated");

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ messageId: "msg-live-123" }), { status: 201 })
    );
    vi.stubGlobal("fetch", fetchMock);
    const liveRes = await sendFeeReminderEmail(
      {
        to: "student@example.org",
        studentName: "Test Student",
        registrationNumber: "REG-1",
        outstandingFormatted: "INR 5,000.00",
        overdueDays: 15,
        batchCode: "BATCH-1",
      },
      { FINANCIER_LIVE_BREVO: "true", BREVO_API_KEY: "test-key" }
    );
    expect(liveRes.success).toBe(true);
    expect(liveRes.provider).toBe("brevo-api");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    expect(enforceFinancierRateLimit("u1", "127.0.0.1", "test-bucket", 2).success).toBe(true);
    expect(enforceFinancierRateLimit("u1", "127.0.0.1", "test-bucket", 2).success).toBe(true);
    expect(enforceFinancierRateLimit("u1", "127.0.0.1", "test-bucket", 2).success).toBe(false);

    // Import extended backend/services/*.ts entrypoints cleanly at runtime
    const serviceBase = "../backend/services";
    const financeMod = await import(/* @vite-ignore */ `${serviceBase}/finance`);
    const payrollMod = await import(/* @vite-ignore */ `${serviceBase}/payroll`);
    const auditMod = await import(/* @vite-ignore */ `${serviceBase}/audit`);
    const pdfInvMod = await import(/* @vite-ignore */ `${serviceBase}/pdf-invoice`);
    const pdfRecMod = await import(/* @vite-ignore */ `${serviceBase}/pdf-receipt`);
    expect(financeMod.verifyTrialBalance).toBe(verifyTrialBalance);
    expect(payrollMod.calculateTrainerBatchPayrollPaise).toBe(calculateTrainerBatchPayrollPaise);
    expect(auditMod.logAuditEventStrict).toBeTypeOf("function");
    expect(pdfInvMod.generateInvoicePdfBytes).toBe(generateInvoicePdfBytes);
    expect(pdfRecMod.generateReceiptPdfBytes).toBe(generateReceiptPdfBytes);
  });
});
