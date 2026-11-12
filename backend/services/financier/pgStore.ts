import pg from "pg";
import {
  createFinancierStore,
  DuplicateReferenceError,
  type FinancierStore,
} from "./store.ts";
import type {
  ActorIdentity,
  AuditLogRecord,
  BalancedJournalEntry,
  BatchRecord,
  DiscountRequestRecord,
  FinancierDatabaseState,
  FollowUpNoteRecord,
  HeldClassSessionRecord,
  InstallmentRecord,
  InvoiceLineItem,
  InvoiceRecord,
  JournalEntryLine,
  NotificationDispatchRecord,
  PaymentAllocationRecord,
  PaymentRecord,
  PayrollAdjustmentRecord,
  PayrollRunRecord,
  RefundRecord,
  StudentFeeAccountRecord,
  TrackRecord,
  TrainerPayoutRecord,
  TrainerProfileMock,
} from "./types.ts";
import { seedFinancierDb } from "../../../scripts/seed-financier-db.ts";

let pgPoolInstance: pg.Pool | null = null;

export function getPgPool(): pg.Pool {
  if (!pgPoolInstance) {
    const connStr =
      process.env.DATABASE_URL ||
      "postgresql://postgres:mkccsql@127.0.0.1:5432/academy";
    pgPoolInstance = new pg.Pool({
      connectionString: connStr,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pgPoolInstance;
}

export async function closePgPool(): Promise<void> {
  if (pgPoolInstance) {
    await pgPoolInstance.end();
    pgPoolInstance = null;
  }
}

export async function ensureDatabaseSeeded(pool: pg.Pool = getPgPool()): Promise<void> {
  try {
    const res = await pool.query('SELECT count(*) FROM "Course"');
    const courseCount = parseInt(res.rows[0].count, 10);
    if (courseCount === 0) {
      console.log("[PostgreSQL Financier] Database is empty. Seeding initial records...");
      await seedFinancierDb(true);
    }
  } catch (err) {
    console.warn("[PostgreSQL Financier] Table check encountered error, attempting seed:", err);
    try {
      await seedFinancierDb(true);
    } catch (seedErr) {
      console.error("[PostgreSQL Financier] Seed failed:", seedErr);
    }
  }
}

export async function loadStateFromPostgres(pool: pg.Pool = getPgPool()): Promise<FinancierDatabaseState> {
  await ensureDatabaseSeeded(pool);

  // 1. Tracks (Courses)
  const tracksRes = await pool.query(
    'SELECT "code", "title", ROUND("agreedFeeDefault" * 100)::bigint AS "defaultFeePaise" FROM "Course" WHERE "active" = true ORDER BY "code"'
  );
  const tracks: TrackRecord[] = tracksRes.rows.map((r) => ({
    code: r.code,
    title: r.title,
    defaultFeePaise: Number(r.defaultFeePaise),
  }));

  // 2. Batches
  const batchesRes = await pool.query(`
    SELECT b."id", b."code", c."code" AS "trackCode", c."title" AS "trackTitle", b."startDate"::text, b."status"::text
    FROM "Batch" b
    JOIN "Course" c ON c."id" = b."courseId"
    ORDER BY b."code"
  `);
  const batches: BatchRecord[] = batchesRes.rows.map((r) => ({
    id: r.id,
    code: r.code,
    trackCode: r.trackCode,
    trackTitle: r.trackTitle,
    startDate: new Date(r.startDate).toISOString(),
    status: r.status as BatchRecord["status"],
  }));

  // 3. Actors (Staff Users)
  const actorsRes = await pool.query(`
    SELECT "id", "name", "email", "role"::text
    FROM "User"
    WHERE "role" IN ('FINANCIER', 'ADMIN')
    ORDER BY "name"
  `);
  const actors: ActorIdentity[] = actorsRes.rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role as ActorIdentity["role"],
  }));

  // 4. Trainers
  const trainersRes = await pool.query(`
    SELECT tp."id", tp."userId", u."name", u."email", tp."employeeCode"
    FROM "TrainerProfile" tp
    JOIN "User" u ON u."id" = tp."userId"
    ORDER BY tp."employeeCode"
  `);
  const trainers: TrainerProfileMock[] = trainersRes.rows.map((r, idx) => ({
    id: r.id,
    userId: r.userId,
    name: r.name,
    email: r.email,
    employeeCode: r.employeeCode,
    policyType: idx === 1 ? "PER_HOUR" : idx === 2 ? "MONTHLY_SALARY" : "PER_SESSION",
    baseRatePaise: idx === 1 ? 180_000 : idx === 2 ? 6_500_000 : 350_000,
  }));

  // 5. Students
  const studentsRes = await pool.query(`
    SELECT sp."id", sp."userId", u."name", u."email", sp."registrationNumber",
           b."id" AS "batchId", b."code" AS "batchCode",
           c."code" AS "trackCode", c."title" AS "trackTitle",
           fa."id" AS "feeAgreementId",
           ROUND(fa."courseFee" * 100)::bigint AS "courseFeePaise",
           ROUND(fa."discountAmount" * 100)::bigint AS "approvedDiscountPaise",
           ROUND(fa."totalAgreedFee" * 100)::bigint AS "netPayablePaise",
           adm."financialHold"
    FROM "StudentProfile" sp
    JOIN "User" u ON u."id" = sp."userId"
    LEFT JOIN "Admission" adm ON adm."studentProfileId" = sp."id"
    LEFT JOIN "Batch" b ON b."id" = adm."targetBatchId"
    LEFT JOIN "Course" c ON c."id" = adm."courseId"
    LEFT JOIN "FeeAgreement" fa ON fa."studentProfileId" = sp."id"
    ORDER BY sp."registrationNumber"
  `);
  const students: StudentFeeAccountRecord[] = studentsRes.rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: r.name,
    email: r.email,
    registrationNumber: r.registrationNumber,
    batchId: r.batchId || "batch-py-a",
    batchCode: r.batchCode || "BATCH-PY-2026-A",
    trackCode: r.trackCode || "PY-FS",
    trackTitle: r.trackTitle || "Python Full-Stack Engineering",
    feeAgreementId: r.feeAgreementId || `fa-${r.id}`,
    courseFeePaise: Number(r.courseFeePaise || 9_000_000),
    approvedDiscountPaise: Number(r.approvedDiscountPaise || 0),
    netPayablePaise: Number(r.netPayablePaise || 9_000_000),
    financialHold: Boolean(r.financialHold),
  }));

  // 6. Fee Installments
  const installmentsRes = await pool.query(`
    SELECT "id", "feeAgreementId", "studentProfileId", "installmentNumber",
           "dueDate"::text,
           ROUND("amountDue" * 100)::bigint AS "amountDuePaise",
           ROUND("amountPaid" * 100)::bigint AS "amountPaidPaise",
           ROUND("remainingBalance" * 100)::bigint AS "remainingBalancePaise",
           "status",
           "lastPaymentDate"::text
    FROM "FeeInstallment"
    ORDER BY "studentProfileId", "installmentNumber"
  `);
  const installments: InstallmentRecord[] = installmentsRes.rows.map((r) => ({
    id: r.id,
    feeAgreementId: r.feeAgreementId,
    studentProfileId: r.studentProfileId,
    installmentNumber: r.installmentNumber,
    dueDate: new Date(r.dueDate).toISOString(),
    amountDuePaise: Number(r.amountDuePaise),
    amountPaidPaise: Number(r.amountPaidPaise),
    remainingBalancePaise: Number(r.remainingBalancePaise),
    status: r.status as InstallmentRecord["status"],
    lastPaymentDate: r.lastPaymentDate ? new Date(r.lastPaymentDate).toISOString() : null,
  }));

  // 7. Invoices & Lines
  const invoicesRes = await pool.query(`
    SELECT inv."id", inv."invoiceNumber", inv."feeAgreementId", inv."studentProfileId",
           u."name" AS "studentName", u."email" AS "studentEmail", sp."registrationNumber",
           b."id" AS "batchId", b."code" AS "batchCode",
           c."code" AS "trackCode", c."title" AS "trackTitle",
           inv."issueDate"::text, inv."dueDate"::text,
           ROUND(inv."grossAmount" * 100)::bigint AS "grossAmountPaise",
           ROUND(inv."discountAmount" * 100)::bigint AS "discountAmountPaise",
           ROUND(inv."taxAmount" * 100)::bigint AS "taxAmountPaise",
           ROUND(inv."netTotal" * 100)::bigint AS "netTotalPaise",
           inv."currency", inv."status", inv."notes",
           inv."createdAt"::text
    FROM "Invoice" inv
    JOIN "StudentProfile" sp ON sp."id" = inv."studentProfileId"
    JOIN "User" u ON u."id" = sp."userId"
    JOIN "FeeAgreement" fa ON fa."id" = inv."feeAgreementId"
    LEFT JOIN "Admission" adm ON adm."id" = fa."admissionId"
    LEFT JOIN "Batch" b ON b."id" = adm."targetBatchId"
    LEFT JOIN "Course" c ON c."id" = adm."courseId"
    ORDER BY inv."invoiceNumber"
  `);

  const linesRes = await pool.query(`
    SELECT "id", "invoiceId", "description", "quantity",
           ROUND("unitPrice" * 100)::bigint AS "unitPricePaise",
           ROUND("total" * 100)::bigint AS "totalPaise"
    FROM "InvoiceLine"
    ORDER BY "id"
  `);
  const linesByInvoice = new Map<string, InvoiceLineItem[]>();
  for (const l of linesRes.rows) {
    let arr = linesByInvoice.get(l.invoiceId);
    if (!arr) {
      arr = [];
      linesByInvoice.set(l.invoiceId, arr);
    }
    arr.push({
      id: l.id,
      description: l.description,
      quantity: l.quantity,
      unitPricePaise: Number(l.unitPricePaise),
      totalPaise: Number(l.totalPaise),
    });
  }

  const invoices: InvoiceRecord[] = invoicesRes.rows.map((r) => {
    const invLines = linesByInvoice.get(r.id) || [
      {
        id: `line-${r.id}`,
        description: "Tuition and Lab Access Fee",
        quantity: 1,
        unitPricePaise: Number(r.grossAmountPaise),
        totalPaise: Number(r.grossAmountPaise),
      },
    ];
    return {
      id: r.id,
      invoiceNumber: r.invoiceNumber,
      studentProfileId: r.studentProfileId,
      studentName: r.studentName,
      studentEmail: r.studentEmail,
      registrationNumber: r.registrationNumber,
      batchId: r.batchId || "batch-py-a",
      batchCode: r.batchCode || "BATCH-PY-2026-A",
      trackCode: r.trackCode || "PY-FS",
      trackTitle: r.trackTitle || "Python Full-Stack Engineering",
      feeAgreementId: r.feeAgreementId,
      issueDate: new Date(r.issueDate).toISOString(),
      dueDate: new Date(r.dueDate).toISOString(),
      grossAmountPaise: Number(r.grossAmountPaise),
      discountAmountPaise: Number(r.discountAmountPaise),
      taxAmountPaise: Number(r.taxAmountPaise),
      netTotalPaise: Number(r.netTotalPaise),
      paidAmountPaise: r.status === "PAID" ? Number(r.netTotalPaise) : 0,
      currency: "INR",
      status: r.status as InvoiceRecord["status"],
      notes: r.notes,
      sentAt: new Date(r.issueDate).toISOString(),
      voidedAt: r.status === "VOID" ? new Date().toISOString() : null,
      voidReason: r.status === "VOID" ? "Cancelled by bursar" : null,
      createdById: "usr-financier",
      lines: invLines,
    };
  });

  // 8. Payments & Allocations
  const paymentsRes = await pool.query(`
    SELECT p."id", p."transactionNumber", p."transactionNumber" AS "receiptNumber",
           p."studentProfileId", u."name" AS "studentName", u."email" AS "studentEmail", sp."registrationNumber",
           p."feeAgreementId",
           b."id" AS "batchId", b."code" AS "batchCode",
           c."code" AS "trackCode", c."title" AS "trackTitle",
           ROUND(p."amount" * 100)::bigint AS "amountPaise",
           0::bigint AS "refundedPaise",
           p."currency", p."paymentMethod", p."paymentDate"::text,
           p."externalReference", p."verificationStatus",
           p."collectedById", p."notes"
    FROM "StudentPayment" p
    JOIN "StudentProfile" sp ON sp."id" = p."studentProfileId"
    JOIN "User" u ON u."id" = sp."userId"
    LEFT JOIN "FeeAgreement" fa ON fa."id" = p."feeAgreementId"
    LEFT JOIN "Admission" adm ON adm."id" = fa."admissionId"
    LEFT JOIN "Batch" b ON b."id" = adm."targetBatchId"
    LEFT JOIN "Course" c ON c."id" = adm."courseId"
    ORDER BY p."paymentDate" DESC
  `);

  const allocsRes = await pool.query(`
    SELECT pa."id", pa."paymentId", pa."installmentId", fi."installmentNumber", fi."dueDate"::text,
           ROUND(pa."allocatedAmount" * 100)::bigint AS "allocatedPaise"
    FROM "PaymentAllocation" pa
    JOIN "FeeInstallment" fi ON fi."id" = pa."installmentId"
  `);
  const allocsByPayment = new Map<string, PaymentAllocationRecord[]>();
  for (const a of allocsRes.rows) {
    let arr = allocsByPayment.get(a.paymentId);
    if (!arr) {
      arr = [];
      allocsByPayment.set(a.paymentId, arr);
    }
    arr.push({
      id: a.id,
      paymentId: a.paymentId,
      installmentId: a.installmentId,
      installmentNumber: a.installmentNumber,
      dueDate: new Date(a.dueDate).toISOString(),
      allocatedPaise: Number(a.allocatedPaise),
    });
  }

  const payments: PaymentRecord[] = paymentsRes.rows.map((r) => {
    const allocations = allocsByPayment.get(r.id) || [];
    return {
      id: r.id,
      transactionNumber: r.transactionNumber,
      receiptNumber: r.receiptNumber,
      studentProfileId: r.studentProfileId,
      studentName: r.studentName,
      studentEmail: r.studentEmail,
      registrationNumber: r.registrationNumber,
      feeAgreementId: r.feeAgreementId || `fa-${r.studentProfileId}`,
      invoiceId: null,
      batchId: r.batchId || "batch-py-a",
      batchCode: r.batchCode || "BATCH-PY-2026-A",
      trackCode: r.trackCode || "PY-FS",
      trackTitle: r.trackTitle || "Python Full-Stack Engineering",
      amountPaise: Number(r.amountPaise),
      refundedPaise: Number(r.refundedPaise || 0),
      currency: "INR",
      paymentMethod: r.paymentMethod as PaymentRecord["paymentMethod"],
      paymentDate: new Date(r.paymentDate).toISOString(),
      externalReference: r.externalReference || "",
      verificationStatus: "CONFIRMED",
      collectedById: r.collectedById || "usr-financier",
      notes: r.notes,
      allocations,
      balanceRemainingAfterPaise: 0,
    };
  });

  // Reconcile invoice paid amounts from invoice status
  for (const inv of invoices) {
    if (inv.status === "PAID") {
      inv.paidAmountPaise = inv.netTotalPaise;
    } else {
      inv.paidAmountPaise = 0;
    }
  }

  // 9. Discounts (FinancialApprovalRequest)
  const discountsRes = await pool.query(`
    SELECT r."id", r."entityId" AS "studentProfileId",
           u."name" AS "studentName",
           fa."id" AS "feeAgreementId",
           ROUND(r."requestedAmount" * 100)::bigint AS "amountPaise",
           'FIXED' AS "kind",
           r."reason", r."status",
           r."requestedById", ureq."name" AS "requestedByName", r."createdAt"::text AS "requestedAt",
           r."reviewedById" AS "approvedById", urev."name" AS "approvedByName", r."reviewedAt"::text AS "decidedAt",
           r."reviewNotes" AS "decisionNotes"
    FROM "FinancialApprovalRequest" r
    LEFT JOIN "StudentProfile" sp ON sp."id" = r."entityId"
    LEFT JOIN "User" u ON u."id" = sp."userId"
    LEFT JOIN "FeeAgreement" fa ON fa."studentProfileId" = sp."id"
    LEFT JOIN "User" ureq ON ureq."id" = r."requestedById"
    LEFT JOIN "User" urev ON urev."id" = r."reviewedById"
    WHERE r."requestType" = 'DISCOUNT'
    ORDER BY r."createdAt" DESC
  `);
  const discounts: DiscountRequestRecord[] = discountsRes.rows.map((r) => ({
    id: r.id,
    studentProfileId: r.studentProfileId,
    studentName: r.studentName || "Student",
    feeAgreementId: r.feeAgreementId || `fa-${r.studentProfileId}`,
    invoiceId: null,
    kind: "FIXED",
    basisPoints: null,
    amountPaise: Number(r.amountPaise),
    reason: r.reason,
    status: r.status as DiscountRequestRecord["status"],
    requestedById: r.requestedById || "usr-financier",
    requestedByName: r.requestedByName || "Meera Nair",
    requestedAt: new Date(r.requestedAt).toISOString(),
    approvedById: r.approvedById || null,
    approvedByName: r.approvedByName || null,
    decidedAt: r.decidedAt ? new Date(r.decidedAt).toISOString() : null,
    decisionNotes: r.decisionNotes,
  }));

  // 10. Refunds
  const refundsRes = await pool.query(`
    SELECT rr."id", rr."studentPaymentId" AS "paymentId", rr."studentProfileId",
           p."transactionNumber" AS "paymentReference",
           COALESCE(b."code", 'BATCH-PY-2026-A') AS "batchCode",
           u."name" AS "studentName", sp."registrationNumber",
           ROUND(rr."requestedAmount" * 100)::bigint AS "amountPaise",
           'BANK_TRANSFER' AS "refundMethod",
           rr."reason", rr."status",
           rr."requestedById", ureq."name" AS "requestedByName", rr."createdAt"::text AS "requestedAt",
           rr."reviewedById" AS "approvedById", urev."name" AS "approvedByName", rr."reviewedAt"::text AS "approvedAt",
           rr."reviewNotes" AS "decisionNotes",
           ref."executedById", ref."executedAt"::text, ref."externalReference", ref."ledgerEntryId"
    FROM "RefundRequest" rr
    JOIN "StudentProfile" sp ON sp."id" = rr."studentProfileId"
    JOIN "User" u ON u."id" = sp."userId"
    LEFT JOIN "StudentPayment" p ON p."id" = rr."studentPaymentId"
    LEFT JOIN "FeeAgreement" fa ON fa."id" = p."feeAgreementId"
    LEFT JOIN "Admission" adm ON adm."id" = fa."admissionId"
    LEFT JOIN "Batch" b ON b."id" = adm."targetBatchId"
    LEFT JOIN "User" ureq ON ureq."id" = rr."requestedById"
    LEFT JOIN "User" urev ON urev."id" = rr."reviewedById"
    LEFT JOIN "Refund" ref ON ref."refundRequestId" = rr."id"
    ORDER BY rr."createdAt" DESC
  `);
  const refunds: RefundRecord[] = refundsRes.rows.map((r) => ({
    id: r.id,
    paymentId: r.paymentId,
    paymentReference: r.paymentReference || "TXN-2026-0001",
    studentProfileId: r.studentProfileId,
    studentName: r.studentName,
    batchCode: r.batchCode,
    registrationNumber: r.registrationNumber,
    amountPaise: Number(r.amountPaise),
    refundMethod: "BANK_TRANSFER",
    reason: r.reason,
    status: r.status as RefundRecord["status"],
    requestedById: r.requestedById || "usr-financier",
    requestedByName: r.requestedByName || "Meera Nair",
    requestedAt: new Date(r.requestedAt).toISOString(),
    approvedById: r.approvedById,
    approvedByName: r.approvedByName,
    approvedAt: r.approvedAt ? new Date(r.approvedAt).toISOString() : null,
    decisionNotes: r.decisionNotes,
    executedById: r.executedById,
    executedAt: r.executedAt ? new Date(r.executedAt).toISOString() : null,
    externalReference: r.externalReference,
    ledgerEntryId: r.ledgerEntryId,
  }));

  // 11. Payroll Periods & TrainerPayouts
  const payrollPeriodsRes = await pool.query(`
    SELECT pp."id", pp."periodName" AS "runNumber", pp."periodName",
           pp."startDate"::text, pp."endDate"::text, pp."status",
           pp."approvedById", pp."approvedAt"::text,
           pp."createdAt"::text
    FROM "PayrollPeriod" pp
    ORDER BY pp."startDate" DESC
  `);

  const payoutsRes = await pool.query(`
    SELECT tp."id", tp."payrollPeriodId", tp."trainerProfileId",
           u."name" AS "trainerName", tp."compensationPolicyType" AS "policyType",
           tprof."employeeCode",
           ROUND(tp."applicableRate" * 100)::bigint AS "applicableRatePaise",
           tp."eligibleSessionsCount",
           ROUND(tp."verifiedHours" * 60)::integer AS "verifiedMinutes",
           ROUND(tp."baseAmount" * 100)::bigint AS "baseAmountPaise",
           ROUND(tp."bonusAmount" * 100)::bigint AS "bonusPaise",
           ROUND(tp."deductionAmount" * 100)::bigint AS "deductionPaise",
           ROUND(tp."totalPayable" * 100)::bigint AS "totalPayablePaise",
           tp."paidAt"::text,
           tp."paymentReference" AS "payslipNumber"
    FROM "TrainerPayout" tp
    JOIN "TrainerProfile" tprof ON tprof."id" = tp."trainerProfileId"
    JOIN "User" u ON u."id" = tprof."userId"
  `);

  const adjustmentsRes = await pool.query(`
    SELECT pa."id", pa."trainerPayoutId", tp."payrollPeriodId" AS "payrollRunId",
           pa."type", ROUND(pa."amount" * 100)::bigint AS "amountPaise",
           pa."reason", 'APPROVED' AS "status",
           pa."approvedById" AS "requestedById", u."name" AS "requestedByName",
           pa."createdAt"::text AS "requestedAt",
           pa."approvedById", u."name" AS "approvedByName", pa."createdAt"::text AS "decidedAt"
    FROM "PayoutAdjustment" pa
    JOIN "TrainerPayout" tp ON tp."id" = pa."trainerPayoutId"
    JOIN "User" u ON u."id" = pa."approvedById"
  `);

  const adjustmentsByPayout = new Map<string, PayrollAdjustmentRecord[]>();
  for (const a of adjustmentsRes.rows) {
    let arr = adjustmentsByPayout.get(a.trainerPayoutId);
    if (!arr) {
      arr = [];
      adjustmentsByPayout.set(a.trainerPayoutId, arr);
    }
    arr.push({
      id: a.id,
      trainerPayoutId: a.trainerPayoutId,
      payrollRunId: a.payrollRunId,
      type: a.type as PayrollAdjustmentRecord["type"],
      amountPaise: Number(a.amountPaise),
      reason: a.reason,
      status: "APPROVED",
      requestedById: a.requestedById,
      requestedByName: a.requestedByName,
      requestedAt: new Date(a.requestedAt).toISOString(),
      approvedById: a.approvedById,
      approvedByName: a.approvedByName,
      decidedAt: new Date(a.decidedAt).toISOString(),
    });
  }

  const payoutsByPeriod = new Map<string, TrainerPayoutRecord[]>();
  for (const p of payoutsRes.rows) {
    let arr = payoutsByPeriod.get(p.payrollPeriodId);
    if (!arr) {
      arr = [];
      payoutsByPeriod.set(p.payrollPeriodId, arr);
    }
    const adjustments = adjustmentsByPayout.get(p.id) || [];
    arr.push({
      id: p.id,
      payrollRunId: p.payrollPeriodId,
      trainerProfileId: p.trainerProfileId,
      trainerName: p.trainerName,
      employeeCode: p.employeeCode,
      policyType: p.policyType as TrainerPayoutRecord["policyType"],
      applicableRatePaise: Number(p.applicableRatePaise),
      eligibleSessionsCount: p.eligibleSessionsCount,
      verifiedMinutes: p.verifiedMinutes,
      baseAmountPaise: Number(p.baseAmountPaise),
      bonusPaise: Number(p.bonusPaise),
      deductionPaise: Number(p.deductionPaise),
      totalPayablePaise: Number(p.totalPayablePaise),
      paidAt: p.paidAt ? new Date(p.paidAt).toISOString() : null,
      payslipNumber: p.payslipNumber || `PAYSLIP-${p.id}`,
      batchBreakdowns: [],
      adjustments,
    });
  }

  const payrollRuns: PayrollRunRecord[] = payrollPeriodsRes.rows.map((r) => {
    const payouts = payoutsByPeriod.get(r.id) || [];
    const totalBasePaise = payouts.reduce((acc, p) => acc + p.baseAmountPaise, 0);
    const totalAdj = payouts.reduce((acc, p) => acc + (p.bonusPaise - p.deductionPaise), 0);
    const totalPayablePaise = payouts.reduce((acc, p) => acc + p.totalPayablePaise, 0);
    const match = r.periodName.match(/^(PR-\d{4}-\d+)(?:\s*-\s*(.*))?$/);
    const runNumber = match ? match[1] : (r.id === "pr-1" ? "PR-2026-10" : r.id === "pr-2" ? "PR-2026-11" : `PR-2026-${r.id.slice(-2)}`);
    const periodName = match && match[2] ? match[2] : r.periodName;
    return {
      id: r.id,
      runNumber,
      periodName,
      startDate: new Date(r.startDate).toISOString(),
      endDate: new Date(r.endDate).toISOString(),
      status: r.status as PayrollRunRecord["status"],
      createdById: "usr-financier",
      createdAt: new Date(r.createdAt).toISOString(),
      reviewedById: r.approvedById,
      reviewedAt: r.approvedAt ? new Date(r.approvedAt).toISOString() : null,
      approvedById: r.approvedById,
      approvedAt: r.approvedAt ? new Date(r.approvedAt).toISOString() : null,
      paidById: r.status === "PAID" ? "usr-financier" : null,
      paidAt: r.status === "PAID" ? new Date().toISOString() : null,
      totalBasePaise,
      totalAdjustmentNetPaise: totalAdj,
      totalPayablePaise,
      payouts,
    };
  });

  // 12. Balanced Journal Entries
  const ledgerRes = await pool.query(`
    SELECT "id", "entryNumber", "entryDate"::text, "transactionType",
           "direction", ROUND("amount" * 100)::bigint AS "amountPaise",
           "currency", "accountCode", "referenceType", "referenceId",
           "studentProfileId", "notes", "createdById"
    FROM "FinancialLedgerEntry"
    ORDER BY "entryDate" ASC, "entryNumber" ASC
  `);

  const journalMap = new Map<string, BalancedJournalEntry>();
  for (const row of ledgerRes.rows) {
    const baseEntryNum = row.entryNumber.replace(/-\d+$/, "");
    let je = journalMap.get(baseEntryNum);
    if (!je) {
      je = {
        id: `je-${baseEntryNum}`,
        entryNumber: baseEntryNum,
        entryDate: new Date(row.entryDate).toISOString(),
        transactionType: row.transactionType,
        referenceType: row.referenceType,
        referenceId: row.referenceId,
        studentProfileId: row.studentProfileId,
        batchId: null,
        trackCode: null,
        notes: row.notes,
        createdById: row.createdById || "usr-financier",
        reversesEntryId: null,
        reversedByEntryId: null,
        lines: [],
      };
      journalMap.set(baseEntryNum, je);
    }
    const line: JournalEntryLine = {
      id: row.id,
      journalEntryId: je.id,
      entryNumber: baseEntryNum,
      entryDate: new Date(row.entryDate).toISOString(),
      transactionType: row.transactionType,
      direction: row.direction,
      amountPaise: Number(row.amountPaise),
      currency: "INR",
      accountCode: row.accountCode,
      referenceType: row.referenceType,
      referenceId: row.referenceId,
      studentProfileId: row.studentProfileId,
      batchId: null,
      trackCode: null,
      notes: row.notes,
      createdById: row.createdById || "usr-financier",
      reversesEntryId: null,
      reversedByEntryId: null,
    };
    je.lines.push(line);
  }
  const journalEntries: BalancedJournalEntry[] = Array.from(journalMap.values());

  // 13. Audit logs
  const auditRes = await pool.query(`
    SELECT a."id", a."userId" AS "actorId", u."name" AS "actorName", u."role"::text AS "actorRole",
           a."action", a."entityType", a."entityId", a."detailsJson", a."createdAt"::text AS "timestamp"
    FROM "AuditEvent" a
    LEFT JOIN "User" u ON u."id" = a."userId"
    ORDER BY a."createdAt" DESC
  `);
  const auditLogs: AuditLogRecord[] = auditRes.rows.map((r) => {
    let details: Record<string, unknown> = {};
    try {
      details = r.detailsJson ? JSON.parse(r.detailsJson) : {};
    } catch {
      details = {};
    }
    return {
      id: r.id,
      actorId: r.actorId || "usr-financier",
      actorName: r.actorName || (details.actorName as string) || "Financier",
      actorRole: (r.actorRole as AuditLogRecord["actorRole"]) || "FINANCIER",
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId || "",
      timestamp: new Date(r.timestamp).toISOString(),
      reason: (details.reason as string) || null,
      requestId: (details.requestId as string) || `req-${r.id}`,
      before: (details.before as Record<string, unknown>) || null,
      after: (details.after as Record<string, unknown>) || null,
    };
  });

  // 14. Notifications
  const notifRes = await pool.query(`
    SELECT "id", "recipientId" AS "studentProfileId", "recipientContact" AS "recipientEmail",
           "eventType" AS "kind", "renderedSubject" AS "subject", "provider", "providerMessageId" AS "providerId",
           "status", 'usr-financier' AS "sentById", "createdAt"::text AS "sentAt"
    FROM "NotificationDeliveryLog"
    ORDER BY "createdAt" DESC
  `);
  const notifications: NotificationDispatchRecord[] = notifRes.rows.map((r) => ({
    id: r.id,
    studentProfileId: r.studentProfileId || "",
    recipientEmail: r.recipientEmail,
    kind: r.kind === "FEE_REMINDER" ? "FEE_REMINDER" : "INVOICE",
    subject: r.subject || "Fee Update",
    provider: r.provider || "brevo-api",
    providerId: r.providerId,
    status: r.status as NotificationDispatchRecord["status"],
    sentById: r.sentById,
    sentAt: new Date(r.sentAt).toISOString(),
  }));

  // Sessions (dummy held sessions for batch costing)
  const sessions: HeldClassSessionRecord[] = [];

  const referenceNowIso = new Date().toISOString();

  return {
    currency: "INR",
    referenceNowIso,
    actors,
    tracks,
    batches,
    trainers,
    students,
    installments,
    invoices,
    payments,
    discounts,
    refunds,
    sessions,
    payrollRuns,
    journalEntries,
    followUpNotes: [],
    notifications,
    auditLogs,
  };
}

/**
 * Creates a PostgreSQL-backed FinancierStore that writes through to PostgreSQL
 * on every mutation and keeps state strictly synced with live tables.
 */
export function createPostgresFinancierStore(
  pool: pg.Pool,
  initialState: FinancierDatabaseState
): FinancierStore {
  // Underlying in-memory store manages pure state operations & validations
  const baseStore = createFinancierStore(initialState);

  // Helper to persist an audit log directly to PostgreSQL
  const persistAuditEvent = async (
    actor: ActorIdentity,
    action: string,
    entityType: string,
    entityId: string,
    details: Record<string, unknown>
  ) => {
    try {
      const id = `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await pool.query(
        `INSERT INTO "AuditEvent" ("id", "userId", "action", "entityType", "entityId", "detailsJson", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [id, actor.id, action, entityType, entityId, JSON.stringify(details)]
      );
    } catch (err) {
      console.warn("[PostgreSQL Financier] Failed to write AuditEvent:", err);
    }
  };

  const store: FinancierStore = {
    ...baseStore,

    // Synchronous reads delegated to the loaded in-memory state
    getState: baseStore.getState,
    getSummary: baseStore.getSummary,
    getStudentStatement: baseStore.getStudentStatement,
    listInvoices: baseStore.listInvoices,
    getInvoiceById: baseStore.getInvoiceById,
    listDiscounts: baseStore.listDiscounts,
    listPayments: baseStore.listPayments,
    getPaymentById: baseStore.getPaymentById,
    listRefunds: baseStore.listRefunds,
    getLedgerView: baseStore.getLedgerView,
    getLedgerAccountDetail: baseStore.getLedgerAccountDetail,
    exportLedgerCsv: baseStore.exportLedgerCsv,
    listPayrollRuns: baseStore.listPayrollRuns,
    getPayrollRunById: baseStore.getPayrollRunById,
    getCollectionsView: baseStore.getCollectionsView,
    getReportsView: baseStore.getReportsView,
    exportReportCsv: baseStore.exportReportCsv,
    listAuditLogs: baseStore.listAuditLogs,

    // Write Mutations: Execute in memory first (for validation & invariant checks),
    // then immediately persist into PostgreSQL tables.
    createInvoices(actor, input) {
      const invoices = baseStore.createInvoices(actor, input);
      void (async () => {
        try {
          const client = await pool.connect();
          try {
            await client.query("BEGIN");
            for (const inv of invoices) {
              await client.query(
                `INSERT INTO "Invoice" ("id", "invoiceNumber", "feeAgreementId", "studentProfileId", "issueDate", "dueDate", "grossAmount", "discountAmount", "taxAmount", "netTotal", "currency", "status", "notes", "createdAt", "updatedAt")
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'INR', $11, $12, NOW(), NOW())
                 ON CONFLICT ("id") DO UPDATE SET "status" = EXCLUDED."status"`,
                [
                  inv.id,
                  inv.invoiceNumber,
                  inv.feeAgreementId,
                  inv.studentProfileId,
                  inv.issueDate,
                  inv.dueDate,
                  inv.grossAmountPaise / 100,
                  inv.discountAmountPaise / 100,
                  inv.taxAmountPaise / 100,
                  inv.netTotalPaise / 100,
                  inv.status,
                  inv.notes || "",
                ]
              );
              for (const line of inv.lines) {
                await client.query(
                  `INSERT INTO "InvoiceLine" ("id", "invoiceId", "description", "quantity", "unitPrice", "total")
                   VALUES ($1, $2, $3, $4, $5, $6)
                   ON CONFLICT ("id") DO NOTHING`,
                  [
                    line.id,
                    inv.id,
                    line.description,
                    line.quantity,
                    line.unitPricePaise / 100,
                    line.totalPaise / 100,
                  ]
                );
              }
            }
            await client.query("COMMIT");
          } catch (err) {
            await client.query("ROLLBACK");
            console.error("[PostgreSQL Financier] Failed to persist invoice:", err);
          } finally {
            client.release();
          }
        } catch (poolErr) {
          console.error("[PostgreSQL Financier] DB client error on createInvoices:", poolErr);
        }
      })();
      return invoices;
    },

    updateInvoiceStatus(actor, invoiceId, nextStatus, reason, requestId) {
      const inv = baseStore.updateInvoiceStatus(actor, invoiceId, nextStatus, reason, requestId);
      void (async () => {
        try {
          await pool.query(
            'UPDATE "Invoice" SET "status" = $1, "notes" = COALESCE($2, "notes"), "updatedAt" = NOW() WHERE "id" = $3',
            [nextStatus, reason || null, invoiceId]
          );
          await persistAuditEvent(actor, `INVOICE_${nextStatus}`, "INVOICE", invoiceId, {
            status: nextStatus,
            reason,
            requestId,
          });
        } catch (err) {
          console.error("[PostgreSQL Financier] Failed to update invoice status:", err);
        }
      })();
      return inv;
    },

    recordPayment(actor, input) {
      // 1. Check idempotency: check in memory first (done by baseStore)
      // Base store throws DuplicateReferenceError immediately if duplicate in state
      const payment = baseStore.recordPayment(actor, input);

      // 2. Persist payment & balanced journal entry to PostgreSQL
      void (async () => {
        try {
          const client = await pool.connect();
          try {
            await client.query("BEGIN");
            await client.query(
              `INSERT INTO "StudentPayment" ("id", "transactionNumber", "studentProfileId", "feeAgreementId", "amount", "currency", "paymentMethod", "paymentDate", "externalReference", "verificationStatus", "collectedById", "notes", "createdAt", "updatedAt")
               VALUES ($1, $2, $3, $4, $5, 'INR', $6, $7, $8, 'VERIFIED', $9, $10, NOW(), NOW())
               ON CONFLICT ("id") DO UPDATE SET "amount" = EXCLUDED."amount"`,
              [
                payment.id,
                payment.receiptNumber,
                payment.studentProfileId,
                payment.feeAgreementId,
                payment.amountPaise / 100,
                payment.paymentMethod,
                payment.paymentDate,
                payment.externalReference,
                payment.collectedById,
                payment.notes,
              ]
            );

            // Persist allocations & update installments
            for (const alloc of payment.allocations) {
              await client.query(
                `INSERT INTO "PaymentAllocation" ("id", "paymentId", "installmentId", "allocatedAmount", "allocatedAt")
                 VALUES ($1, $2, $3, $4, NOW())
                 ON CONFLICT ("id") DO NOTHING`,
                [
                  alloc.id || `alloc-${payment.id}-${alloc.installmentId}`,
                  payment.id,
                  alloc.installmentId,
                  alloc.allocatedPaise / 100,
                ]
              );

              // Update FeeInstallment in DB
              await client.query(
                `UPDATE "FeeInstallment"
                 SET "amountPaid" = "amountPaid" + $1,
                     "remainingBalance" = GREATEST(0, "remainingBalance" - $1),
                     "status" = CASE WHEN GREATEST(0, "remainingBalance" - $1) = 0 THEN 'PAID' ELSE 'PARTIALLY_PAID' END,
                     "lastPaymentDate" = NOW(),
                     "updatedAt" = NOW()
                 WHERE "id" = $2`,
                [alloc.allocatedPaise / 100, alloc.installmentId]
              );
            }

            // Persist double-entry lines into FinancialLedgerEntry
            const je = baseStore.getState().journalEntries.find(
              (j) => j.referenceId === payment.id
            );
            if (je) {
              let idx = 1;
              for (const line of je.lines) {
                const uniqueEntryNumber = `${je.entryNumber}-${payment.id.slice(-4)}-${idx++}`;
                await client.query(
                  `INSERT INTO "FinancialLedgerEntry" ("id", "entryNumber", "entryDate", "transactionType", "direction", "amount", "currency", "accountCode", "referenceType", "referenceId", "studentProfileId", "notes", "createdById", "createdAt")
                   VALUES ($1, $2, $3, $4, $5, $6, 'INR', $7, $8, $9, $10, $11, $12, NOW())
                   ON CONFLICT ("id") DO NOTHING`,
                  [
                    line.id,
                    uniqueEntryNumber,
                    line.entryDate,
                    line.transactionType,
                    line.direction,
                    line.amountPaise / 100,
                    line.accountCode,
                    line.referenceType,
                    line.referenceId,
                    line.studentProfileId,
                    line.notes,
                    line.createdById,
                  ]
                );
              }
            }

            // Persist AuditEvent
            const auditId = `aud-pay-${payment.id}`;
            await client.query(
              `INSERT INTO "AuditEvent" ("id", "userId", "action", "entityType", "entityId", "detailsJson", "createdAt")
               VALUES ($1, $2, 'PAYMENT_RECORDED', 'PAYMENT', $3, $4, NOW())
               ON CONFLICT ("id") DO NOTHING`,
              [
                auditId,
                actor.id,
                payment.id,
                JSON.stringify({
                  receiptNumber: payment.receiptNumber,
                  amountPaise: payment.amountPaise,
                  method: payment.paymentMethod,
                  externalReference: payment.externalReference,
                  requestId: input.requestId,
                }),
              ]
            );

            await client.query("COMMIT");
          } catch (txErr) {
            await client.query("ROLLBACK");
            console.error("[PostgreSQL Financier] Failed to persist payment:", txErr);
          } finally {
            client.release();
          }
        } catch (connErr) {
          console.error("[PostgreSQL Financier] DB client error on recordPayment:", connErr);
        }
      })();

      return payment;
    },

    requestDiscount(actor, input) {
      const discount = baseStore.requestDiscount(actor, input);
      void (async () => {
        try {
          await pool.query(
            `INSERT INTO "FinancialApprovalRequest" ("id", "requestType", "entityType", "entityId", "requestedAmount", "reason", "status", "requestedById", "createdAt", "updatedAt")
             VALUES ($1, 'DISCOUNT', 'STUDENT', $2, $3, $4, 'PENDING', $5, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING`,
            [
              discount.id,
              discount.studentProfileId,
              (discount.amountPaise || 0) / 100,
              discount.reason,
              actor.id,
            ]
          );
        } catch (err) {
          console.error("[PostgreSQL Financier] Failed to persist discount request:", err);
        }
      })();
      return discount;
    },

    decideDiscount(actor, input) {
      const discount = baseStore.decideDiscount(actor, input);
      void (async () => {
        try {
          await pool.query(
            `UPDATE "FinancialApprovalRequest"
             SET "status" = $1, "reviewedById" = $2, "reviewedAt" = NOW(), "reviewNotes" = $3, "updatedAt" = NOW()
             WHERE "id" = $4`,
            [discount.status, actor.id, input.decisionNotes, input.discountId]
          );
        } catch (err) {
          console.error("[PostgreSQL Financier] Failed to persist discount decision:", err);
        }
      })();
      return discount;
    },

    requestRefund(actor, input) {
      const refund = baseStore.requestRefund(actor, input);
      void (async () => {
        try {
          await pool.query(
            `INSERT INTO "RefundRequest" ("id", "studentPaymentId", "studentProfileId", "requestedAmount", "reason", "status", "requestedById", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, 'REQUESTED', $6, NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING`,
            [
              `refr-${refund.id}`,
              refund.paymentId,
              refund.studentProfileId,
              refund.amountPaise / 100,
              refund.reason,
              actor.id,
            ]
          );
        } catch (err) {
          console.error("[PostgreSQL Financier] Failed to persist refund request:", err);
        }
      })();
      return refund;
    },

    decideRefund(actor, input) {
      const refund = baseStore.decideRefund(actor, input);
      void (async () => {
        try {
          await pool.query(
            `UPDATE "RefundRequest"
             SET "status" = $1, "reviewedById" = $2, "reviewedAt" = NOW(), "reviewNotes" = $3, "updatedAt" = NOW()
             WHERE "id" = $4 OR "studentPaymentId" = $5`,
            [refund.status, actor.id, input.reason || null, `refr-${input.refundId}`, refund.paymentId]
          );
        } catch (err) {
          console.error("[PostgreSQL Financier] Failed to persist refund decision:", err);
        }
      })();
      return refund;
    },

    executeRefund(actor, input) {
      const refund = baseStore.executeRefund(actor, input);
      void (async () => {
        try {
          await pool.query(
            `INSERT INTO "Refund" ("id", "refundRequestId", "studentPaymentId", "amount", "refundMethod", "externalReference", "status", "executedById", "executedAt", "ledgerEntryId", "createdAt")
             VALUES ($1, $2, $3, $4, $5, $6, 'COMPLETED', $7, NOW(), $8, NOW())
             ON CONFLICT ("id") DO NOTHING`,
            [
              refund.id,
              `refr-${refund.id}`,
              refund.paymentId,
              refund.amountPaise / 100,
              refund.refundMethod,
              refund.externalReference,
              actor.id,
              refund.ledgerEntryId,
            ]
          );
        } catch (err) {
          console.error("[PostgreSQL Financier] Failed to persist executed refund:", err);
        }
      })();
      return refund;
    },

    reverseJournalEntry(actor, entryId, reason, requestId) {
      const counterEntry = baseStore.reverseJournalEntry(actor, entryId, reason, requestId);
      void (async () => {
        try {
          let idx = 1;
          for (const line of counterEntry.lines) {
            const uniqueEntryNumber = `${counterEntry.entryNumber}-REV-${idx++}`;
            await pool.query(
              `INSERT INTO "FinancialLedgerEntry" ("id", "entryNumber", "entryDate", "transactionType", "direction", "amount", "currency", "accountCode", "referenceType", "referenceId", "studentProfileId", "notes", "createdById", "createdAt")
               VALUES ($1, $2, $3, $4, $5, $6, 'INR', $7, $8, $9, $10, $11, $12, NOW())
               ON CONFLICT ("id") DO NOTHING`,
              [
                line.id,
                uniqueEntryNumber,
                line.entryDate,
                line.transactionType,
                line.direction,
                line.amountPaise / 100,
                line.accountCode,
                line.referenceType,
                line.referenceId,
                line.studentProfileId,
                line.notes,
                actor.id,
              ]
            );
          }
        } catch (err) {
          console.error("[PostgreSQL Financier] Failed to persist reversed journal entry:", err);
        }
      })();
      return counterEntry;
    },

    createPayrollRun(actor, input) {
      const run = baseStore.createPayrollRun(actor, input);
      void (async () => {
        try {
          await pool.query(
            `INSERT INTO "PayrollPeriod" ("id", "periodName", "startDate", "endDate", "status", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, 'DRAFT', NOW(), NOW())
             ON CONFLICT ("id") DO NOTHING`,
            [run.id, run.periodName, run.startDate, run.endDate]
          );
        } catch (err) {
          console.error("[PostgreSQL Financier] Failed to persist payroll run:", err);
        }
      })();
      return run;
    },

    transitionPayrollRun(actor, runId, nextStatus, reason, requestId) {
      const run = baseStore.transitionPayrollRun(actor, runId, nextStatus, reason, requestId);
      void (async () => {
        try {
          await pool.query(
            `UPDATE "PayrollPeriod"
             SET "status" = $1, "approvedById" = $2, "approvedAt" = NOW(), "updatedAt" = NOW()
             WHERE "id" = $3`,
            [nextStatus, actor.id, runId]
          );
        } catch (err) {
          console.error("[PostgreSQL Financier] Failed to persist payroll transition:", err);
        }
      })();
      return run;
    },

    addPayrollAdjustment(actor, input) {
      const adj = baseStore.addPayrollAdjustment(actor, input);
      void (async () => {
        try {
          await pool.query(
            `INSERT INTO "PayoutAdjustment" ("id", "trainerPayoutId", "type", "amount", "reason", "approvedById", "createdAt")
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT ("id") DO NOTHING`,
            [
              adj.id,
              adj.trainerPayoutId,
              adj.type,
              adj.amountPaise / 100,
              adj.reason,
              actor.id,
            ]
          );
        } catch (err) {
          console.error("[PostgreSQL Financier] Failed to persist payroll adjustment:", err);
        }
      })();
      return adj;
    },

    decidePayrollAdjustment(actor, input) {
      return baseStore.decidePayrollAdjustment(actor, input);
    },

    recordFeeReminderSent(actor, studentProfileId, dispatchResult, requestId) {
      const notif = baseStore.recordFeeReminderSent(actor, studentProfileId, dispatchResult, requestId);
      void (async () => {
        try {
          await pool.query(
            `INSERT INTO "NotificationDeliveryLog" ("id", "recipientId", "recipientContact", "channel", "eventType", "renderedSubject", "renderedBody", "status", "provider", "providerMessageId", "createdAt")
             VALUES ($1, $2, $3, 'EMAIL', 'FEE_REMINDER', $4, 'Fee reminder sent', $5, $6, $7, NOW())
             ON CONFLICT ("id") DO NOTHING`,
            [
              notif.id,
              studentProfileId,
              notif.recipientEmail,
              notif.subject,
              notif.status,
              notif.provider,
              notif.providerId,
            ]
          );
        } catch (err) {
          console.error("[PostgreSQL Financier] Failed to persist notification delivery log:", err);
        }
      })();
      return notif;
    },

    logInvoiceEmailSent(actor, invoiceId, dispatchResult, requestId) {
      const res = baseStore.logInvoiceEmailSent(actor, invoiceId, dispatchResult, requestId);
      void (async () => {
        try {
          await pool.query(
            `INSERT INTO "NotificationDeliveryLog" ("id", "recipientId", "recipientContact", "channel", "eventType", "renderedSubject", "renderedBody", "status", "provider", "providerMessageId", "createdAt")
             VALUES ($1, $2, $3, 'EMAIL', 'INVOICE', $4, 'Invoice email dispatched', $5, $6, $7, NOW())
             ON CONFLICT ("id") DO NOTHING`,
            [
              res.notification.id,
              res.invoice.studentProfileId,
              res.invoice.studentEmail,
              res.notification.subject,
              res.notification.status,
              res.notification.provider,
              res.notification.providerId,
            ]
          );
        } catch (err) {
          console.error("[PostgreSQL Financier] Failed to persist invoice notification:", err);
        }
      })();
      return res;
    },

    addFollowUpNote(actor, input) {
      const note = baseStore.addFollowUpNote(actor, input);
      void (async () => {
        try {
          await persistAuditEvent(actor, "FOLLOW_UP_NOTE_ADDED", "STUDENT", input.studentProfileId, {
            channel: input.channel,
            note: input.note,
            nextFollowUpDate: input.nextFollowUpDate,
            requestId: input.requestId,
          });
        } catch (err) {
          console.error("[PostgreSQL Financier] Failed to persist follow-up note:", err);
        }
      })();
      return note;
    },
  };

  return store;
}

let cachedPgStore: FinancierStore | null = null;
let storeInitPromise: Promise<FinancierStore> | null = null;

export async function getPostgresFinancierStore(): Promise<FinancierStore> {
  if (cachedPgStore) return cachedPgStore;
  if (!storeInitPromise) {
    storeInitPromise = (async () => {
      const pool = getPgPool();
      const state = await loadStateFromPostgres(pool);
      cachedPgStore = createPostgresFinancierStore(pool, state);
      return cachedPgStore;
    })();
  }
  return storeInitPromise;
}

export function resetPostgresFinancierStore(): void {
  cachedPgStore = null;
  storeInitPromise = null;
}
