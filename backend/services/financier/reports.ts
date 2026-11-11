import { computeCollectionsAgeingReport, generateSafeCsv } from "./ageing";
import { verifyTrialBalance } from "./ledger";
import { addPaise, formatPaiseToInputRupees, subtractPaise, sumPaise } from "./money";
import type { FinancierDatabaseState, LedgerAccountCode } from "./types";

export interface DashboardMetrics {
  asOfIso: string;
  collectedTodayPaise: number;
  collectedWeekPaise: number;
  collectedMonthPaise: number;
  outstandingDuesPaise: number;
  overdueInvoiceCount: number;
  payrollDueThisCyclePaise: number;
  totalRevenueBilledPaise: number;
  totalPayrollCostPaise: number;
  trialBalanceOk: boolean;
  trialBalanceDebitsPaise: number;
  trialBalanceCreditsPaise: number;
  revenueVsPayrollByBatch: Array<{
    batchId: string;
    batchCode: string;
    trackCode: string;
    trackTitle: string;
    billedPaise: number;
    collectedPaise: number;
    outstandingPaise: number;
    payrollCostPaise: number;
    marginPaise: number;
  }>;
}

export interface TrackRevenueRow {
  trackCode: string;
  trackTitle: string;
  studentCount: number;
  billedPaise: number;
  discountsPaise: number;
  collectedPaise: number;
  outstandingPaise: number;
  payrollCostPaise: number;
  netContributionPaise: number;
}

export interface BatchRevenueRow {
  batchId: string;
  batchCode: string;
  trackCode: string;
  trackTitle: string;
  studentCount: number;
  billedPaise: number;
  collectedPaise: number;
  outstandingPaise: number;
  payrollCostPaise: number;
  netContributionPaise: number;
}

export interface ReportsSummary {
  asOfIso: string;
  revenueByTrack: TrackRevenueRow[];
  revenueByBatch: BatchRevenueRow[];
  ageing: ReturnType<typeof computeCollectionsAgeingReport>;
  totalBilledPaise: number;
  totalCollectedPaise: number;
  totalPayrollPaise: number;
  netSurplusPaise: number;
}

function startOfUtcDay(iso: string): number {
  const d = new Date(iso);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function startOfUtcMonth(iso: string): number {
  const d = new Date(iso);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

export function computeDashboardMetrics(
  state: FinancierDatabaseState,
  asOfIso = state.referenceNowIso
): DashboardMetrics {
  const dayStartMs = startOfUtcDay(asOfIso);
  const weekStartMs = dayStartMs - 6 * 86_400_000;
  const monthStartMs = startOfUtcMonth(asOfIso);
  const asOfMs = Date.parse(asOfIso);

  const todayAmounts: number[] = [];
  const weekAmounts: number[] = [];
  const monthAmounts: number[] = [];

  for (const pay of state.payments) {
    if (pay.verificationStatus === "REVERSED") continue;
    const netAmount = subtractPaise(pay.amountPaise, pay.refundedPaise);
    if (netAmount <= 0) continue;
    const payDayMs = startOfUtcDay(pay.paymentDate);
    if (payDayMs === dayStartMs) todayAmounts.push(netAmount);
    if (payDayMs >= weekStartMs && payDayMs <= dayStartMs) weekAmounts.push(netAmount);
    if (payDayMs >= monthStartMs && payDayMs <= dayStartMs) monthAmounts.push(netAmount);
  }

  const outstandingAmounts: number[] = [];
  let overdueInvoiceCount = 0;

  for (const inv of state.invoices) {
    if (inv.status === "VOID" || inv.status === "DRAFT") continue;
    const unpaid = Math.max(0, subtractPaise(inv.netTotalPaise, inv.paidAmountPaise));
    if (unpaid > 0) {
      outstandingAmounts.push(unpaid);
      const dueMs = Date.parse(inv.dueDate);
      if (!Number.isNaN(dueMs) && dueMs < asOfMs) {
        overdueInvoiceCount += 1;
      }
    }
  }

  const payrollDueAmounts = state.payrollRuns
    .filter((run) => run.status !== "PAID")
    .map((run) => run.totalPayablePaise);

  const batchReport = computeReportsSummary(state, asOfIso).revenueByBatch;

  const billedTotals = state.invoices
    .filter((i) => i.status !== "VOID" && i.status !== "DRAFT")
    .map((i) => i.netTotalPaise);

  const allPayrollTotals = state.payrollRuns.map((r) => r.totalPayablePaise);
  const trialBalance = verifyTrialBalance(state.journalEntries);

  return {
    asOfIso,
    collectedTodayPaise: sumPaise(todayAmounts, "collectedToday"),
    collectedWeekPaise: sumPaise(weekAmounts, "collectedWeek"),
    collectedMonthPaise: sumPaise(monthAmounts, "collectedMonth"),
    outstandingDuesPaise: sumPaise(outstandingAmounts, "outstandingDues"),
    overdueInvoiceCount,
    payrollDueThisCyclePaise: sumPaise(payrollDueAmounts, "payrollDue"),
    totalRevenueBilledPaise: sumPaise(billedTotals, "totalRevenueBilled"),
    totalPayrollCostPaise: sumPaise(allPayrollTotals, "totalPayrollCost"),
    trialBalanceOk: trialBalance.balanced,
    trialBalanceDebitsPaise: trialBalance.totalDebitsPaise,
    trialBalanceCreditsPaise: trialBalance.totalCreditsPaise,
    revenueVsPayrollByBatch: batchReport.map((b) => ({
      batchId: b.batchId,
      batchCode: b.batchCode,
      trackCode: b.trackCode,
      trackTitle: b.trackTitle,
      billedPaise: b.billedPaise,
      collectedPaise: b.collectedPaise,
      outstandingPaise: b.outstandingPaise,
      payrollCostPaise: b.payrollCostPaise,
      marginPaise: b.netContributionPaise,
    })),
  };
}

export function computeReportsSummary(
  state: FinancierDatabaseState,
  asOfIso = state.referenceNowIso
): ReportsSummary {
  const payrollByBatch = new Map<string, number[]>();
  for (const run of state.payrollRuns) {
    for (const payout of run.payouts) {
      for (const bb of payout.batchBreakdowns) {
        const list = payrollByBatch.get(bb.batchId) ?? [];
        list.push(bb.totalCostPaise);
        payrollByBatch.set(bb.batchId, list);
      }
    }
  }

  const revenueByBatch: BatchRevenueRow[] = state.batches.map((batch) => {
    const batchStudents = state.students.filter((s) => s.batchId === batch.id);
    const batchInvoices = state.invoices.filter(
      (i) => i.batchId === batch.id && i.status !== "VOID" && i.status !== "DRAFT"
    );
    const billedPaise = sumPaise(
      batchInvoices.map((i) => i.netTotalPaise),
      `${batch.code}.billed`
    );
    const batchPayments = state.payments.filter(
      (p) => p.batchId === batch.id && p.verificationStatus !== "REVERSED"
    );
    const collectedPaise = sumPaise(
      batchPayments.map((p) => subtractPaise(p.amountPaise, p.refundedPaise)),
      `${batch.code}.collected`
    );
    const outstandingPaise = sumPaise(
      batchInvoices.map((i) => Math.max(0, subtractPaise(i.netTotalPaise, i.paidAmountPaise))),
      `${batch.code}.outstanding`
    );
    const payrollCostPaise = sumPaise(payrollByBatch.get(batch.id) ?? [], `${batch.code}.payroll`);
    const netContributionPaise = subtractPaise(collectedPaise, payrollCostPaise);

    return {
      batchId: batch.id,
      batchCode: batch.code,
      trackCode: batch.trackCode,
      trackTitle: batch.trackTitle,
      studentCount: batchStudents.length,
      billedPaise,
      collectedPaise,
      outstandingPaise,
      payrollCostPaise,
      netContributionPaise,
    };
  });

  const trackMap = new Map<string, TrackRevenueRow>();
  for (const track of state.tracks) {
    trackMap.set(track.code, {
      trackCode: track.code,
      trackTitle: track.title,
      studentCount: 0,
      billedPaise: 0,
      discountsPaise: 0,
      collectedPaise: 0,
      outstandingPaise: 0,
      payrollCostPaise: 0,
      netContributionPaise: 0,
    });
  }

  for (const batchRow of revenueByBatch) {
    const tr = trackMap.get(batchRow.trackCode);
    if (!tr) continue;
    tr.studentCount += batchRow.studentCount;
    tr.billedPaise = addPaise(tr.billedPaise, batchRow.billedPaise);
    tr.collectedPaise = addPaise(tr.collectedPaise, batchRow.collectedPaise);
    tr.outstandingPaise = addPaise(tr.outstandingPaise, batchRow.outstandingPaise);
    tr.payrollCostPaise = addPaise(tr.payrollCostPaise, batchRow.payrollCostPaise);
    tr.netContributionPaise = subtractPaise(tr.collectedPaise, tr.payrollCostPaise);
  }

  for (const inv of state.invoices) {
    if (inv.status === "VOID" || inv.status === "DRAFT") continue;
    const tr = trackMap.get(inv.trackCode);
    if (tr) {
      tr.discountsPaise = addPaise(tr.discountsPaise, inv.discountAmountPaise);
    }
  }

  const revenueByTrack = Array.from(trackMap.values());
  const ageing = computeCollectionsAgeingReport(state, asOfIso);

  const totalBilledPaise = sumPaise(
    revenueByBatch.map((b) => b.billedPaise),
    "reports.totalBilled"
  );
  const totalCollectedPaise = sumPaise(
    revenueByBatch.map((b) => b.collectedPaise),
    "reports.totalCollected"
  );
  const totalPayrollPaise = sumPaise(
    revenueByBatch.map((b) => b.payrollCostPaise),
    "reports.totalPayroll"
  );

  return {
    asOfIso,
    revenueByTrack,
    revenueByBatch,
    ageing,
    totalBilledPaise,
    totalCollectedPaise,
    totalPayrollPaise,
    netSurplusPaise: subtractPaise(totalCollectedPaise, totalPayrollPaise),
  };
}

export function generateLedgerCsv(
  state: FinancierDatabaseState,
  filters?: { fromDate?: string; toDate?: string; accountCode?: LedgerAccountCode; studentProfileId?: string }
): string {
  const fromMs = filters?.fromDate ? Date.parse(filters.fromDate) : null;
  const toMs = filters?.toDate ? Date.parse(filters.toDate) : null;

  const studentNames = new Map(state.students.map((s) => [s.id, `${s.name} (${s.registrationNumber})`]));
  const rows: Record<string, unknown>[] = [];

  for (const entry of state.journalEntries) {
    const ms = Date.parse(entry.entryDate);
    if (fromMs !== null && !Number.isNaN(fromMs) && ms < fromMs) continue;
    if (toMs !== null && !Number.isNaN(toMs) && ms > toMs + 86_399_999) continue;

    for (const line of entry.lines) {
      if (filters?.accountCode && line.accountCode !== filters.accountCode) continue;
      if (filters?.studentProfileId && line.studentProfileId !== filters.studentProfileId) continue;
      rows.push({
        entryNumber: line.entryNumber,
        entryDate: line.entryDate.slice(0, 10),
        transactionType: line.transactionType,
        accountCode: line.accountCode,
        direction: line.direction,
        amountINR: formatPaiseToInputRupees(line.amountPaise),
        amountPaise: line.amountPaise,
        student: line.studentProfileId ? studentNames.get(line.studentProfileId) ?? line.studentProfileId : "",
        batchId: line.batchId ?? "",
        referenceType: line.referenceType,
        referenceId: line.referenceId,
        notes: line.notes ?? "",
        reversesEntryId: line.reversesEntryId ?? "",
      });
    }
  }

  return generateSafeCsv(rows);
}

export function generateAgeingCsv(state: FinancierDatabaseState, asOfIso = state.referenceNowIso): string {
  const ageing = computeCollectionsAgeingReport(state, asOfIso);
  return generateSafeCsv(
    ageing.students.map((s) => ({
      registrationNumber: s.registrationNumber,
      studentName: s.studentName,
      studentEmail: s.studentEmail,
      batchCode: s.batchCode,
      trackTitle: s.trackTitle,
      maxDaysOverdue: s.maxDaysOverdue,
      overdueInvoiceCount: s.overdueInvoiceCount,
      bucket_0_30_INR: formatPaiseToInputRupees(s.bucket0To30Paise),
      bucket_31_60_INR: formatPaiseToInputRupees(s.bucket31To60Paise),
      bucket_61_90_INR: formatPaiseToInputRupees(s.bucket61To90Paise),
      bucket_90_plus_INR: formatPaiseToInputRupees(s.bucket90PlusPaise),
      totalOutstandingINR: formatPaiseToInputRupees(s.totalOutstandingPaise),
      lastReminderAt: s.lastReminderAt ?? "",
      lastFollowUpNote: s.lastNote ?? "",
    }))
  );
}

export function generatePayrollVsRevenueCsv(
  state: FinancierDatabaseState,
  asOfIso = state.referenceNowIso
): string {
  const summary = computeReportsSummary(state, asOfIso);
  return generateSafeCsv(
    summary.revenueByBatch.map((b) => ({
      batchCode: b.batchCode,
      trackCode: b.trackCode,
      trackTitle: b.trackTitle,
      students: b.studentCount,
      billedINR: formatPaiseToInputRupees(b.billedPaise),
      collectedINR: formatPaiseToInputRupees(b.collectedPaise),
      outstandingINR: formatPaiseToInputRupees(b.outstandingPaise),
      payrollCostINR: formatPaiseToInputRupees(b.payrollCostPaise),
      netContributionINR: formatPaiseToInputRupees(b.netContributionPaise),
    }))
  );
}
