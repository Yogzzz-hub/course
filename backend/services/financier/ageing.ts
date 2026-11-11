import { addPaise, subtractPaise, sumPaise } from "./money";
import type { FinancierDatabaseState } from "./types";

export interface AgeingBucketRow {
  bucket: "0-30" | "31-60" | "61-90" | "90+";
  label: string;
  invoiceCount: number;
  amountPaise: number;
}

export interface StudentAgeingDetail {
  studentProfileId: string;
  studentName: string;
  studentEmail: string;
  registrationNumber: string;
  batchCode: string;
  trackTitle: string;
  totalOutstandingPaise: number;
  bucket0To30Paise: number;
  bucket31To60Paise: number;
  bucket61To90Paise: number;
  bucket90PlusPaise: number;
  maxDaysOverdue: number;
  overdueInvoiceCount: number;
  lastReminderAt: string | null;
  lastNote: string | null;
}

export interface CollectionsAgeingReport {
  asOfDate: string;
  buckets: AgeingBucketRow[];
  totalOverduePaise: number;
  students: StudentAgeingDetail[];
}

export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str.replace(/"/g, '""')}`;
  }
  return str.replace(/"/g, '""');
}

export function generateSafeCsv(records: readonly Record<string, unknown>[]): string {
  if (!records || records.length === 0) return "";
  const headers = Object.keys(records[0]);
  const headerLine = headers.map((h) => `"${sanitizeCsvCell(h)}"`).join(",");
  const rows = records.map((record) =>
    headers.map((header) => `"${sanitizeCsvCell(record[header])}"`).join(",")
  );
  return [headerLine, ...rows].join("\r\n");
}

function daysBetween(earlierIso: string, laterIso: string): number {
  const e = Date.parse(earlierIso);
  const l = Date.parse(laterIso);
  if (Number.isNaN(e) || Number.isNaN(l)) return 0;
  return Math.max(0, Math.floor((l - e) / 86_400_000));
}

export function computeCollectionsAgeingReport(
  state: FinancierDatabaseState,
  asOfIso = state.referenceNowIso
): CollectionsAgeingReport {
  const bucketTotals: Record<"0-30" | "31-60" | "61-90" | "90+", { count: number; amounts: number[] }> = {
    "0-30": { count: 0, amounts: [] },
    "31-60": { count: 0, amounts: [] },
    "61-90": { count: 0, amounts: [] },
    "90+": { count: 0, amounts: [] },
  };

  const perStudent = new Map<string, StudentAgeingDetail>();

  for (const stu of state.students) {
    const stuReminders = state.notifications
      .filter((n) => n.studentProfileId === stu.id && n.kind === "FEE_REMINDER")
      .sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt));
    const stuNotes = state.followUpNotes
      .filter((n) => n.studentProfileId === stu.id)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    perStudent.set(stu.id, {
      studentProfileId: stu.id,
      studentName: stu.name,
      studentEmail: stu.email,
      registrationNumber: stu.registrationNumber,
      batchCode: stu.batchCode,
      trackTitle: stu.trackTitle,
      totalOutstandingPaise: 0,
      bucket0To30Paise: 0,
      bucket31To60Paise: 0,
      bucket61To90Paise: 0,
      bucket90PlusPaise: 0,
      maxDaysOverdue: 0,
      overdueInvoiceCount: 0,
      lastReminderAt: stuReminders[0]?.sentAt ?? null,
      lastNote: stuNotes[0]?.note ?? null,
    });
  }

  for (const inv of state.invoices) {
    if (inv.status === "VOID" || inv.status === "DRAFT") continue;
    const unpaid = Math.max(0, subtractPaise(inv.netTotalPaise, inv.paidAmountPaise));
    if (unpaid <= 0) continue;

    const detail = perStudent.get(inv.studentProfileId);
    if (!detail) continue;

    detail.totalOutstandingPaise = addPaise(detail.totalOutstandingPaise, unpaid);

    const overdueDays = daysBetween(inv.dueDate, asOfIso);
    if (overdueDays <= 0) continue; // not yet overdue

    detail.overdueInvoiceCount += 1;
    detail.maxDaysOverdue = Math.max(detail.maxDaysOverdue, overdueDays);

    if (overdueDays <= 30) {
      bucketTotals["0-30"].count += 1;
      bucketTotals["0-30"].amounts.push(unpaid);
      detail.bucket0To30Paise = addPaise(detail.bucket0To30Paise, unpaid);
    } else if (overdueDays <= 60) {
      bucketTotals["31-60"].count += 1;
      bucketTotals["31-60"].amounts.push(unpaid);
      detail.bucket31To60Paise = addPaise(detail.bucket31To60Paise, unpaid);
    } else if (overdueDays <= 90) {
      bucketTotals["61-90"].count += 1;
      bucketTotals["61-90"].amounts.push(unpaid);
      detail.bucket61To90Paise = addPaise(detail.bucket61To90Paise, unpaid);
    } else {
      bucketTotals["90+"].count += 1;
      bucketTotals["90+"].amounts.push(unpaid);
      detail.bucket90PlusPaise = addPaise(detail.bucket90PlusPaise, unpaid);
    }
  }

  const buckets: AgeingBucketRow[] = [
    {
      bucket: "0-30",
      label: "0–30 days overdue",
      invoiceCount: bucketTotals["0-30"].count,
      amountPaise: sumPaise(bucketTotals["0-30"].amounts, "ageing0_30"),
    },
    {
      bucket: "31-60",
      label: "31–60 days overdue",
      invoiceCount: bucketTotals["31-60"].count,
      amountPaise: sumPaise(bucketTotals["31-60"].amounts, "ageing31_60"),
    },
    {
      bucket: "61-90",
      label: "61–90 days overdue",
      invoiceCount: bucketTotals["61-90"].count,
      amountPaise: sumPaise(bucketTotals["61-90"].amounts, "ageing61_90"),
    },
    {
      bucket: "90+",
      label: "90+ days overdue",
      invoiceCount: bucketTotals["90+"].count,
      amountPaise: sumPaise(bucketTotals["90+"].amounts, "ageing90Plus"),
    },
  ];

  const students = Array.from(perStudent.values())
    .filter((s) => s.totalOutstandingPaise > 0)
    .sort((a, b) => b.maxDaysOverdue - a.maxDaysOverdue || b.totalOutstandingPaise - a.totalOutstandingPaise);

  return {
    asOfDate: asOfIso,
    buckets,
    totalOverduePaise: sumPaise(
      buckets.map((b) => b.amountPaise),
      "totalOverdue"
    ),
    students,
  };
}
