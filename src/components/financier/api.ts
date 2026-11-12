import type {
  ActorIdentity,
  AuditLogRecord,
  BalancedJournalEntry,
  DiscountRequestRecord,
  FollowUpNoteRecord,
  InvoiceRecord,
  LedgerAccountCode,
  NotificationDispatchRecord,
  PaymentMethod,
  PaymentRecord,
  PayrollAdjustmentRecord,
  PayrollRunRecord,
  PayrollRunStatus,
  RefundRecord,
} from "../../../backend/services/financier/types";
import type {
  FinancierStore,
  StudentStatementView,
} from "../../../backend/services/financier/store";
import { FinancierDomainError } from "../../../backend/services/financier/store";
import {
  generateInvoicePdfBytes,
  generatePayslipPdfBytes,
  generateReceiptPdfBytes,
} from "../../../backend/services/financier/pdf";
import { readCrmSession } from "../../utils/authSession";

export class FinancierApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly redirectTo?: string
  ) {
    super(message);
    this.name = "FinancierApiError";
  }
}

export type FinancierSummaryResponse = ReturnType<FinancierStore["getSummary"]> & {
  actor: ActorIdentity;
};
export type FinancierLedgerResponse = ReturnType<FinancierStore["getLedgerView"]>;
export type FinancierLedgerAccountResponse = ReturnType<
  FinancierStore["getLedgerAccountDetail"]
>;
export type FinancierCollectionsResponse = ReturnType<
  FinancierStore["getCollectionsView"]
>;
export type FinancierReportsResponse = ReturnType<FinancierStore["getReportsView"]>;
export type FinancierInvoiceDetailResponse = ReturnType<
  FinancierStore["getInvoiceById"]
>;

// The financier panel has no offline dataset. When the API is unreachable the
// caller gets a clear error instead of stand-in figures, so nothing that looks
// like real money is ever rendered from the browser's own memory.
function getPreviewStore(): FinancierStore {
  throw new FinancierApiError(
    "The financier service is unavailable. Start the local API (npm run dev) and check DATABASE_URL.",
    503,
    "SERVICE_UNAVAILABLE"
  );
}

function getPreviewActor(): ActorIdentity {
  const s = readCrmSession();
  if (!s || !s.authenticated) {
    throw new FinancierApiError("Authentication required.", 401, "UNAUTHORIZED", "/login");
  }
  const role = s.role.toUpperCase();
  if (role !== "FINANCIER" && role !== "ADMIN") {
    throw new FinancierApiError("Insufficient permissions.", 403, "FORBIDDEN", "/login");
  }
  return {
    id: s.userId || (role === "ADMIN" ? "usr-admin" : "usr-financier"),
    name: s.name || role,
    email: s.email || "financier@apexacademy.edu",
    role,
  };
}

function getAuthHeaders(extra?: Record<string, string>): Headers {
  const headers = new Headers(extra);
  const session = readCrmSession();
  if (session) {
    headers.set("X-CRM-Session", JSON.stringify(session));
  }
  return headers;
}

async function requestJson<T>(
  path: string,
  options: RequestInit | undefined,
  previewFallback: () => T
): Promise<T> {
  const headers = getAuthHeaders(
    options?.body ? { "Content-Type": "application/json" } : undefined
  );

  let res: Response;
  try {
    res = await fetch(path, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch {
    throw new FinancierApiError("Unable to reach Financier API server.", 503, "NETWORK_ERROR");
  }

  if (res.status === 503) {
    try {
      const peek = (await res.clone().json()) as { available?: boolean };
      if (peek && peek.available === false) {
        try {
          return previewFallback();
        } catch (err) {
          if (err instanceof FinancierDomainError) {
            throw new FinancierApiError(err.message, err.statusCode, err.code);
          }
          throw err;
        }
      }
    } catch (err) {
      if (err instanceof FinancierApiError) throw err;
    }
  }

  const text = await res.text();
  let parsed: Record<string, unknown>;
  try {
    parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    parsed = {};
  }

  if (!res.ok) {
    throw new FinancierApiError(
      String(parsed.error || `Request failed with status ${res.status}`),
      res.status,
      String(parsed.code || "API_ERROR"),
      typeof parsed.redirectTo === "string" ? parsed.redirectTo : undefined
    );
  }

  return parsed as T;
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function downloadBinary(
  path: string,
  filename: string,
  mimeType: string,
  previewBytes: () => Uint8Array | string
): Promise<void> {
  const res = await fetch(path, {
    method: "GET",
    headers: getAuthHeaders(),
    credentials: "include",
  });

  if (res.status === 503) {
    try {
      const peek = (await res.clone().json()) as { available?: boolean };
      if (peek && peek.available === false) {
        getPreviewActor();
        const data = previewBytes();
        const blobPart: BlobPart =
          typeof data === "string" ? data : data.slice().buffer;
        triggerBrowserDownload(new Blob([blobPart], { type: mimeType }), filename);
        return;
      }
    } catch (err) {
      if (err instanceof FinancierApiError) throw err;
    }
  }

  if (!res.ok) {
    const errJson = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    throw new FinancierApiError(
      errJson.error || `Download failed (${res.status})`,
      res.status,
      errJson.code || "DOWNLOAD_ERROR"
    );
  }

  const blob = await res.blob();
  triggerBrowserDownload(blob, filename);
}

export const financierApi = {
  getSummary(): Promise<FinancierSummaryResponse> {
    return requestJson("/api/financier/summary", { method: "GET" }, () => {
      const actor = getPreviewActor();
      return { actor, ...getPreviewStore().getSummary() };
    });
  },

  getStudentStatement(studentId: string): Promise<StudentStatementView> {
    return requestJson(
      `/api/financier/students/${encodeURIComponent(studentId)}`,
      { method: "GET" },
      () => {
        getPreviewActor();
        return getPreviewStore().getStudentStatement(studentId);
      }
    );
  },

  listInvoices(): Promise<{ invoices: InvoiceRecord[]; discounts: DiscountRequestRecord[] }> {
    return requestJson("/api/financier/invoices", { method: "GET" }, () => {
      getPreviewActor();
      const s = getPreviewStore();
      return { invoices: s.listInvoices(), discounts: s.listDiscounts() };
    });
  },

  getInvoiceById(id: string): Promise<FinancierInvoiceDetailResponse> {
    return requestJson(
      `/api/financier/invoices/${encodeURIComponent(id)}`,
      { method: "GET" },
      () => {
        getPreviewActor();
        return getPreviewStore().getInvoiceById(id);
      }
    );
  },

  createInvoices(payload: {
    mode: "STUDENT" | "BATCH";
    studentProfileId?: string;
    batchId?: string;
    dueDate: string;
    status: "DRAFT" | "SENT";
    description?: string;
    amountPaise: number;
    discountPaise?: number;
    notes?: string;
  }): Promise<{ invoices: InvoiceRecord[]; count: number }> {
    return requestJson(
      "/api/financier/invoices",
      { method: "POST", body: JSON.stringify(payload) },
      () => {
        const actor = getPreviewActor();
        const created = getPreviewStore().createInvoices(actor, payload);
        return { invoices: created, count: created.length };
      }
    );
  },

  updateInvoiceStatus(
    id: string,
    payload: { status: "SENT" | "VOID"; reason?: string }
  ): Promise<{ invoice: InvoiceRecord }> {
    return requestJson(
      `/api/financier/invoices/${encodeURIComponent(id)}/status`,
      { method: "POST", body: JSON.stringify(payload) },
      () => {
        const actor = getPreviewActor();
        return {
          invoice: getPreviewStore().updateInvoiceStatus(actor, id, payload.status, payload.reason),
        };
      }
    );
  },

  sendInvoiceEmail(
    id: string
  ): Promise<{ invoice: InvoiceRecord; notification: NotificationDispatchRecord }> {
    return requestJson(
      `/api/financier/invoices/${encodeURIComponent(id)}/send`,
      { method: "POST", body: JSON.stringify({}) },
      () => {
        const actor = getPreviewActor();
        const detail = getPreviewStore().getInvoiceById(id);
        return getPreviewStore().logInvoiceEmailSent(actor, id, {
          provider: "simulated",
          providerId: `preview-mail-${Date.now()}`,
          status: "SIMULATED",
          subject: `Invoice ${detail.invoice.invoiceNumber}`,
        });
      }
    );
  },

  downloadInvoicePdf(invoice: InvoiceRecord): Promise<void> {
    return downloadBinary(
      `/api/financier/invoices/${encodeURIComponent(invoice.id)}/pdf`,
      `${invoice.invoiceNumber}.pdf`,
      "application/pdf",
      () => generateInvoicePdfBytes(getPreviewStore().getInvoiceById(invoice.id).invoice)
    );
  },

  requestDiscount(payload: {
    studentProfileId: string;
    invoiceId?: string | null;
    kind: "FIXED" | "PERCENTAGE";
    basisPoints?: number | null;
    amountPaise?: number | null;
    reason: string;
  }): Promise<{ discount: DiscountRequestRecord }> {
    return requestJson(
      "/api/financier/discounts",
      { method: "POST", body: JSON.stringify(payload) },
      () => {
        const actor = getPreviewActor();
        return { discount: getPreviewStore().requestDiscount(actor, payload) };
      }
    );
  },

  decideDiscount(
    discountId: string,
    payload: { decision: "APPROVED" | "REJECTED"; decisionNotes: string }
  ): Promise<{ discount: DiscountRequestRecord }> {
    return requestJson(
      `/api/financier/discounts/${encodeURIComponent(discountId)}/decide`,
      { method: "POST", body: JSON.stringify(payload) },
      () => {
        const actor = getPreviewActor();
        return {
          discount: getPreviewStore().decideDiscount(actor, { discountId, ...payload }),
        };
      }
    );
  },

  listPayments(): Promise<{ payments: PaymentRecord[]; refunds: RefundRecord[] }> {
    return requestJson("/api/financier/payments", { method: "GET" }, () => {
      getPreviewActor();
      const s = getPreviewStore();
      return { payments: s.listPayments(), refunds: s.listRefunds() };
    });
  },

  recordPayment(payload: {
    studentProfileId: string;
    invoiceId?: string | null;
    amountPaise: number;
    paymentMethod: PaymentMethod;
    paymentDate: string;
    externalReference: string;
    notes?: string | null;
  }): Promise<{ payment: PaymentRecord }> {
    return requestJson(
      "/api/financier/payments",
      { method: "POST", body: JSON.stringify(payload) },
      () => {
        const actor = getPreviewActor();
        return { payment: getPreviewStore().recordPayment(actor, payload) };
      }
    );
  },

  downloadReceiptPdf(payment: PaymentRecord): Promise<void> {
    return downloadBinary(
      `/api/financier/payments/${encodeURIComponent(payment.id)}/receipt.pdf`,
      `${payment.receiptNumber}.pdf`,
      "application/pdf",
      () => generateReceiptPdfBytes(getPreviewStore().getPaymentById(payment.id))
    );
  },

  requestRefund(payload: {
    paymentId: string;
    amountPaise: number;
    refundMethod: PaymentMethod;
    reason: string;
  }): Promise<{ refund: RefundRecord }> {
    return requestJson(
      "/api/financier/refunds",
      { method: "POST", body: JSON.stringify(payload) },
      () => {
        const actor = getPreviewActor();
        return { refund: getPreviewStore().requestRefund(actor, payload) };
      }
    );
  },

  decideRefund(
    refundId: string,
    payload: { decision: "APPROVED" | "REJECTED"; reason?: string }
  ): Promise<{ refund: RefundRecord }> {
    return requestJson(
      `/api/financier/refunds/${encodeURIComponent(refundId)}/decide`,
      { method: "POST", body: JSON.stringify(payload) },
      () => {
        const actor = getPreviewActor();
        return {
          refund: getPreviewStore().decideRefund(actor, { refundId, ...payload }),
        };
      }
    );
  },

  executeRefund(
    refundId: string,
    payload: { externalReference: string; reason?: string }
  ): Promise<{ refund: RefundRecord }> {
    return requestJson(
      `/api/financier/refunds/${encodeURIComponent(refundId)}/execute`,
      { method: "POST", body: JSON.stringify(payload) },
      () => {
        const actor = getPreviewActor();
        return {
          refund: getPreviewStore().executeRefund(actor, { refundId, ...payload }),
        };
      }
    );
  },

  getLedger(filters?: {
    fromDate?: string;
    toDate?: string;
    accountCode?: LedgerAccountCode | "";
    studentProfileId?: string;
  }): Promise<FinancierLedgerResponse> {
    const params = new URLSearchParams();
    if (filters?.fromDate) params.set("fromDate", filters.fromDate);
    if (filters?.toDate) params.set("toDate", filters.toDate);
    if (filters?.accountCode) params.set("accountCode", filters.accountCode);
    if (filters?.studentProfileId) params.set("studentProfileId", filters.studentProfileId);
    const qs = params.toString();

    return requestJson(
      `/api/financier/ledger${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      () => {
        getPreviewActor();
        return getPreviewStore().getLedgerView({
          fromDate: filters?.fromDate || undefined,
          toDate: filters?.toDate || undefined,
          accountCode: filters?.accountCode || undefined,
          studentProfileId: filters?.studentProfileId || undefined,
        });
      }
    );
  },

  getLedgerAccountDetail(
    accountCode: LedgerAccountCode,
    filters?: { fromDate?: string; toDate?: string; studentProfileId?: string }
  ): Promise<FinancierLedgerAccountResponse> {
    const params = new URLSearchParams();
    if (filters?.fromDate) params.set("fromDate", filters.fromDate);
    if (filters?.toDate) params.set("toDate", filters.toDate);
    if (filters?.studentProfileId) params.set("studentProfileId", filters.studentProfileId);
    const qs = params.toString();

    return requestJson(
      `/api/financier/ledger/accounts/${encodeURIComponent(accountCode)}${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      () => {
        getPreviewActor();
        return getPreviewStore().getLedgerAccountDetail(accountCode, {
          fromDate: filters?.fromDate || undefined,
          toDate: filters?.toDate || undefined,
          studentProfileId: filters?.studentProfileId || undefined,
        });
      }
    );
  },

  reverseJournalEntry(
    entryId: string,
    reason: string
  ): Promise<{ counterEntry: BalancedJournalEntry }> {
    return requestJson(
      `/api/financier/ledger/reverse/${encodeURIComponent(entryId)}`,
      { method: "POST", body: JSON.stringify({ reason }) },
      () => {
        const actor = getPreviewActor();
        return {
          counterEntry: getPreviewStore().reverseJournalEntry(actor, entryId, reason),
        };
      }
    );
  },

  downloadLedgerCsv(filters?: {
    fromDate?: string;
    toDate?: string;
    accountCode?: LedgerAccountCode | "";
    studentProfileId?: string;
  }): Promise<void> {
    const params = new URLSearchParams();
    if (filters?.fromDate) params.set("fromDate", filters.fromDate);
    if (filters?.toDate) params.set("toDate", filters.toDate);
    if (filters?.accountCode) params.set("accountCode", filters.accountCode);
    if (filters?.studentProfileId) params.set("studentProfileId", filters.studentProfileId);
    const qs = params.toString();

    return downloadBinary(
      `/api/financier/ledger/export${qs ? `?${qs}` : ""}`,
      "financier-general-ledger.csv",
      "text/csv;charset=utf-8",
      () =>
        getPreviewStore().exportLedgerCsv({
          fromDate: filters?.fromDate || undefined,
          toDate: filters?.toDate || undefined,
          accountCode: filters?.accountCode || undefined,
          studentProfileId: filters?.studentProfileId || undefined,
        })
    );
  },

  listPayroll(): Promise<{
    runs: PayrollRunRecord[];
    batchCosts: FinancierReportsResponse["revenueByBatch"];
  }> {
    return requestJson("/api/financier/payroll", { method: "GET" }, () => {
      getPreviewActor();
      const s = getPreviewStore();
      return { runs: s.listPayrollRuns(), batchCosts: s.getReportsView().revenueByBatch };
    });
  },

  getPayrollRun(runId: string): Promise<{ run: PayrollRunRecord }> {
    return requestJson(
      `/api/financier/payroll/${encodeURIComponent(runId)}`,
      { method: "GET" },
      () => {
        getPreviewActor();
        return { run: getPreviewStore().getPayrollRunById(runId) };
      }
    );
  },

  createPayrollRun(payload: {
    periodName: string;
    startDate: string;
    endDate: string;
  }): Promise<{ run: PayrollRunRecord }> {
    return requestJson(
      "/api/financier/payroll",
      { method: "POST", body: JSON.stringify(payload) },
      () => {
        const actor = getPreviewActor();
        return { run: getPreviewStore().createPayrollRun(actor, payload) };
      }
    );
  },

  transitionPayrollRun(
    runId: string,
    payload: { status: PayrollRunStatus; reason?: string }
  ): Promise<{ run: PayrollRunRecord }> {
    return requestJson(
      `/api/financier/payroll/${encodeURIComponent(runId)}/transition`,
      { method: "POST", body: JSON.stringify(payload) },
      () => {
        const actor = getPreviewActor();
        return {
          run: getPreviewStore().transitionPayrollRun(actor, runId, payload.status, payload.reason),
        };
      }
    );
  },

  addPayrollAdjustment(
    runId: string,
    payload: {
      trainerPayoutId: string;
      type: PayrollAdjustmentRecord["type"];
      amountPaise: number;
      reason: string;
    }
  ): Promise<{ adjustment: PayrollAdjustmentRecord }> {
    return requestJson(
      `/api/financier/payroll/${encodeURIComponent(runId)}/adjustments`,
      { method: "POST", body: JSON.stringify(payload) },
      () => {
        const actor = getPreviewActor();
        return {
          adjustment: getPreviewStore().addPayrollAdjustment(actor, {
            payrollRunId: runId,
            ...payload,
          }),
        };
      }
    );
  },

  decidePayrollAdjustment(
    runId: string,
    adjustmentId: string,
    decision: "APPROVED" | "REJECTED"
  ): Promise<{ adjustment: PayrollAdjustmentRecord }> {
    return requestJson(
      `/api/financier/payroll/${encodeURIComponent(runId)}/adjustments/${encodeURIComponent(adjustmentId)}/decide`,
      { method: "POST", body: JSON.stringify({ decision }) },
      () => {
        const actor = getPreviewActor();
        return {
          adjustment: getPreviewStore().decidePayrollAdjustment(actor, {
            payrollRunId: runId,
            adjustmentId,
            decision,
          }),
        };
      }
    );
  },

  downloadPayslipPdf(runId: string, payoutId: string, payslipNumber: string): Promise<void> {
    return downloadBinary(
      `/api/financier/payroll/${encodeURIComponent(runId)}/payslips/${encodeURIComponent(payoutId)}/pdf`,
      `${payslipNumber}.pdf`,
      "application/pdf",
      () => {
        const run = getPreviewStore().getPayrollRunById(runId);
        const payout = run.payouts.find((p) => p.id === payoutId)!;
        return generatePayslipPdfBytes(run, payout);
      }
    );
  },

  getCollections(): Promise<FinancierCollectionsResponse> {
    return requestJson("/api/financier/collections", { method: "GET" }, () => {
      getPreviewActor();
      return getPreviewStore().getCollectionsView();
    });
  },

  sendFeeReminder(studentProfileId: string): Promise<{ notification: NotificationDispatchRecord }> {
    return requestJson(
      "/api/financier/collections/remind",
      { method: "POST", body: JSON.stringify({ studentProfileId }) },
      () => {
        const actor = getPreviewActor();
        const st = getPreviewStore().getStudentStatement(studentProfileId);
        return {
          notification: getPreviewStore().recordFeeReminderSent(actor, studentProfileId, {
            provider: "simulated",
            providerId: `preview-rem-${Date.now()}`,
            status: "SIMULATED",
            subject: `Fee Reminder — ${st.student.name}`,
          }),
        };
      }
    );
  },

  addFollowUpNote(payload: {
    studentProfileId: string;
    channel: FollowUpNoteRecord["channel"];
    note: string;
    nextFollowUpDate?: string | null;
  }): Promise<{ note: FollowUpNoteRecord }> {
    return requestJson(
      "/api/financier/collections/notes",
      { method: "POST", body: JSON.stringify(payload) },
      () => {
        const actor = getPreviewActor();
        return { note: getPreviewStore().addFollowUpNote(actor, payload) };
      }
    );
  },

  getReports(): Promise<FinancierReportsResponse> {
    return requestJson("/api/financier/reports", { method: "GET" }, () => {
      getPreviewActor();
      return getPreviewStore().getReportsView();
    });
  },

  downloadReportCsv(kind: "ageing" | "payroll-vs-revenue"): Promise<void> {
    return downloadBinary(
      `/api/financier/reports/export?kind=${kind}`,
      kind === "ageing" ? "collections-ageing-report.csv" : "payroll-vs-revenue-report.csv",
      "text/csv;charset=utf-8",
      () => getPreviewStore().exportReportCsv(kind)
    );
  },

  listAuditLogs(filters?: {
    entityType?: string;
    actorId?: string;
    action?: string;
  }): Promise<{ logs: AuditLogRecord[] }> {
    const params = new URLSearchParams();
    if (filters?.entityType) params.set("entityType", filters.entityType);
    if (filters?.actorId) params.set("actorId", filters.actorId);
    if (filters?.action) params.set("action", filters.action);
    const qs = params.toString();

    return requestJson(
      `/api/financier/audit${qs ? `?${qs}` : ""}`,
      { method: "GET" },
      () => {
        getPreviewActor();
        return { logs: getPreviewStore().listAuditLogs(filters) };
      }
    );
  },
};
