import { z } from "zod";
import { computeCollectionsAgeingReport } from "../../backend/services/financier/ageing.ts";
import { formatPaise } from "../../backend/services/financier/money.ts";
import {
  generateInvoicePdfBytes,
  generatePayslipPdfBytes,
  generateReceiptPdfBytes,
} from "../../backend/services/financier/pdf.ts";
import {
  FinancierDomainError,
  type FinancierStore,
} from "../../backend/services/financier/store.ts";
import {
  ImmutableLedgerError,
  LEDGER_ACCOUNT_META,
  UnbalancedJournalError,
} from "../../backend/services/financier/ledger.ts";
import { MoneyInvariantError } from "../../backend/services/financier/money.ts";
import { PayrollInvariantError } from "../../backend/services/financier/payroll.ts";
import { AuditWriteError } from "../../backend/services/financier/audit.ts";
import type { LedgerAccountCode } from "../../backend/services/financier/types.ts";
import { sendFeeReminderEmail, sendInvoiceEmail } from "../../backend/services/brevo-mail.ts";
import { enforceFinancierRateLimit } from "../../backend/services/rate-limit.ts";
import { getPostgresFinancierStore, resetPostgresFinancierStore } from "../../backend/services/financier/pgStore.ts";
import { authenticateFinancierRequest } from "./auth.ts";

let sharedStore: FinancierStore | null = null;
let storeInitPromise: Promise<FinancierStore> | null = null;

export async function getSharedFinancierStoreAsync(): Promise<FinancierStore> {
  if (sharedStore) return sharedStore;
  if (!storeInitPromise) {
    storeInitPromise = getPostgresFinancierStore()
      .then((s) => {
        sharedStore = s;
        return s;
      })
      .catch((err) => {
        // No in-memory fallback: a database outage must surface as an error
        // rather than silently serving figures that are not in the ledger.
        storeInitPromise = null;
        console.error("[Financier API] Postgres connection failed:", err);
        throw err;
      });
  }
  return storeInitPromise;
}

/** The store is only available once PostgreSQL has answered; there is no synchronous stand-in. */
export function getSharedFinancierStore(): FinancierStore {
  if (!sharedStore) {
    throw new Error("Financier store is not loaded yet. Await getSharedFinancierStoreAsync().");
  }
  return sharedStore;
}

/** Drops the cached handles so the next request reloads state from PostgreSQL. */
export function resetSharedFinancierStore(): void {
  resetPostgresFinancierStore();
  storeInitPromise = null;
  sharedStore = null;
}

const createInvoiceSchema = z
  .object({
    mode: z.enum(["STUDENT", "BATCH"]),
    studentProfileId: z.string().min(1).optional(),
    batchId: z.string().min(1).optional(),
    issueDate: z.string().min(8).optional(),
    dueDate: z.string().min(8),
    status: z.enum(["DRAFT", "SENT"]).default("SENT"),
    description: z.string().min(2).max(200).optional(),
    amountPaise: z.number().int().positive(),
    discountPaise: z.number().int().nonnegative().optional(),
    notes: z.string().max(400).optional(),
    requestId: z.string().optional(),
  })
  .refine(
    (v) => (v.mode === "STUDENT" ? Boolean(v.studentProfileId) : Boolean(v.batchId)),
    { message: "studentProfileId is required for STUDENT mode and batchId for BATCH mode." }
  );

const updateInvoiceStatusSchema = z.object({
  status: z.enum(["SENT", "VOID"]),
  reason: z.string().optional(),
  requestId: z.string().optional(),
});

const requestDiscountSchema = z.object({
  studentProfileId: z.string().min(1),
  invoiceId: z.string().nullable().optional(),
  kind: z.enum(["FIXED", "PERCENTAGE"]),
  basisPoints: z.number().int().min(1).max(5000).nullable().optional(),
  amountPaise: z.number().int().positive().nullable().optional(),
  reason: z.string().trim().min(5, "Discount reason must be at least 5 characters."),
  requestId: z.string().optional(),
});

const decideDiscountSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  decisionNotes: z.string().trim().min(5, "Decision notes must be at least 5 characters."),
  requestId: z.string().optional(),
});

const recordPaymentSchema = z.object({
  studentProfileId: z.string().min(1),
  invoiceId: z.string().nullable().optional(),
  amountPaise: z.number().int().positive(),
  paymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD"]),
  paymentDate: z.string().min(8),
  externalReference: z.string().trim().min(3, "Payment reference must be at least 3 characters."),
  notes: z.string().max(400).nullable().optional(),
  requestId: z.string().optional(),
});

const requestRefundSchema = z.object({
  paymentId: z.string().min(1),
  amountPaise: z.number().int().positive(),
  refundMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD"]),
  reason: z.string().trim().min(5, "Refund reason must be at least 5 characters."),
  requestId: z.string().optional(),
});

const decideRefundSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().trim().min(5).optional(),
  requestId: z.string().optional(),
});

const executeRefundSchema = z.object({
  externalReference: z.string().trim().min(3),
  reason: z.string().trim().min(5).optional(),
  requestId: z.string().optional(),
});

const reverseLedgerSchema = z.object({
  reason: z.string().trim().min(5, "Counter-entry reversal reason must be at least 5 characters."),
  requestId: z.string().optional(),
});

const createPayrollSchema = z.object({
  periodName: z.string().trim().min(3),
  startDate: z.string().min(8),
  endDate: z.string().min(8),
  requestId: z.string().optional(),
});

const transitionPayrollSchema = z.object({
  status: z.enum(["DRAFT", "REVIEW", "APPROVED", "PAID"]),
  reason: z.string().optional(),
  requestId: z.string().optional(),
});

const addPayrollAdjSchema = z.object({
  trainerPayoutId: z.string().min(1),
  type: z.enum(["BONUS", "DEDUCTION", "SUBSTITUTION_FEE", "TAX_WITHHOLDING"]),
  amountPaise: z.number().int().positive(),
  reason: z.string().trim().min(5, "Payroll adjustment reason must be at least 5 characters."),
  requestId: z.string().optional(),
});

const decidePayrollAdjSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  requestId: z.string().optional(),
});

const sendReminderSchema = z.object({
  studentProfileId: z.string().min(1),
  requestId: z.string().optional(),
});

const followUpNoteSchema = z.object({
  studentProfileId: z.string().min(1),
  channel: z.enum(["CALL", "EMAIL", "WHATSAPP", "IN_PERSON"]),
  note: z.string().trim().min(4, "Note must be at least 4 characters."),
  nextFollowUpDate: z.string().nullable().optional(),
  requestId: z.string().optional(),
});

function jsonRes(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function pdfRes(bytes: Uint8Array, filename: string): Response {
  return new Response(bytes.slice().buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function csvRes(csv: string, filename: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function readJsonBody(req: Request): Promise<unknown> {
  try {
    const txt = await req.text();
    if (!txt) return {};
    return JSON.parse(txt);
  } catch {
    throw new FinancierDomainError("Malformed JSON request payload.", 400, "INVALID_JSON");
  }
}

function mapErrorToResponse(err: unknown): Response {
  if (err instanceof z.ZodError) {
    return jsonRes(
      {
        error: err.issues[0]?.message || "Input validation failed.",
        code: "VALIDATION_ERROR",
        issues: err.issues,
      },
      400
    );
  }
  if (err instanceof FinancierDomainError) {
    return jsonRes({ error: err.message, code: err.code }, err.statusCode);
  }
  if (
    err instanceof MoneyInvariantError ||
    err instanceof PayrollInvariantError ||
    err instanceof UnbalancedJournalError ||
    err instanceof ImmutableLedgerError ||
    err instanceof AuditWriteError
  ) {
    return jsonRes({ error: err.message, code: err.name }, 400);
  }
  console.error("[Financier API Error]", err);
  return jsonRes({ error: "Internal financier service error.", code: "INTERNAL_ERROR" }, 500);
}

function checkWriteRateLimit(actorId: string, req: Request): Response | null {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";
  const rl = enforceFinancierRateLimit(actorId, ip);
  if (!rl.success) {
    return jsonRes(
      {
        error: "Rate limit exceeded for financier mutations. Retry momentarily.",
        code: "RATE_LIMITED",
        resetTime: rl.resetTime,
      },
      429
    );
  }
  return null;
}

export async function handleFinancierRequest(
  req: Request,
  storeParam?: FinancierStore
): Promise<Response> {
  try {
    const store = storeParam ?? (await getSharedFinancierStoreAsync());
    const url = new URL(req.url, "http://127.0.0.1");
    const rawPath = url.pathname.replace(/\/+$/, "");
    const subPath = rawPath.startsWith("/api/financier")
      ? rawPath.slice("/api/financier".length) || "/"
      : rawPath || "/";
    const method = req.method.toUpperCase();

    const auth = authenticateFinancierRequest(req.headers);
    if (!auth.ok) {
      return jsonRes(
        { error: auth.message, code: auth.code, redirectTo: auth.redirectTo },
        auth.status
      );
    }
    const actor = auth.actor;

    if (method !== "GET") {
      const blocked = checkWriteRateLimit(actor.id, req);
      if (blocked) return blocked;
    }

    // Session introspection
    if (method === "GET" && subPath === "/session") {
      return jsonRes({ authenticated: true, actor });
    }

    // Summary / Dashboard
    if (method === "GET" && (subPath === "/summary" || subPath === "/dashboard" || subPath === "/")) {
      return jsonRes({ actor, ...store.getSummary() });
    }

    // Student Account Statement
    const stuMatch = subPath.match(/^\/students\/([^/]+)$/);
    if (method === "GET" && stuMatch) {
      return jsonRes(store.getStudentStatement(decodeURIComponent(stuMatch[1])));
    }

    // Invoices collection & creation
    if (subPath === "/invoices" && method === "GET") {
      return jsonRes({ invoices: store.listInvoices(), discounts: store.listDiscounts() });
    }
    if (subPath === "/invoices" && method === "POST") {
      const parsed = createInvoiceSchema.parse(await readJsonBody(req));
      const invoices = store.createInvoices(actor, parsed);
      return jsonRes({ invoices, count: invoices.length }, 201);
    }

    const invPdfMatch = subPath.match(/^\/invoices\/([^/]+)\/pdf$/);
    if (method === "GET" && invPdfMatch) {
      const { invoice } = store.getInvoiceById(decodeURIComponent(invPdfMatch[1]));
      const bytes = generateInvoicePdfBytes(invoice);
      return pdfRes(bytes, `${invoice.invoiceNumber}.pdf`);
    }

    const invStatusMatch = subPath.match(/^\/invoices\/([^/]+)\/status$/);
    if (method === "POST" && invStatusMatch) {
      const parsed = updateInvoiceStatusSchema.parse(await readJsonBody(req));
      const invoice = store.updateInvoiceStatus(
        actor,
        decodeURIComponent(invStatusMatch[1]),
        parsed.status,
        parsed.reason,
        parsed.requestId
      );
      return jsonRes({ invoice });
    }

    const invSendMatch = subPath.match(/^\/invoices\/([^/]+)\/send$/);
    if (method === "POST" && invSendMatch) {
      const { invoice } = store.getInvoiceById(decodeURIComponent(invSendMatch[1]));
      if (invoice.status === "VOID") {
        return jsonRes({ error: "Cannot send a VOID invoice by email.", code: "CONFLICT" }, 409);
      }
      const mailRes = await sendInvoiceEmail({
        to: invoice.studentEmail,
        studentName: invoice.studentName,
        invoiceNumber: invoice.invoiceNumber,
        programmeTitle: invoice.trackTitle,
        batchCode: invoice.batchCode,
        dueDate: invoice.dueDate.slice(0, 10),
        amountFormatted: formatPaise(invoice.netTotalPaise - invoice.paidAmountPaise),
        status: invoice.status,
      });
      const updated = store.logInvoiceEmailSent(actor, invoice.id, {
        provider: mailRes.provider || "brevo-api",
        providerId: mailRes.id ?? null,
        status: mailRes.success
          ? mailRes.provider === "simulated"
            ? "SIMULATED"
            : "SENT"
          : "FAILED",
        subject: mailRes.subject,
      });
      return jsonRes(updated);
    }

    const invDetailMatch = subPath.match(/^\/invoices\/([^/]+)$/);
    if (method === "GET" && invDetailMatch) {
      return jsonRes(store.getInvoiceById(decodeURIComponent(invDetailMatch[1])));
    }

    // Discounts & Scholarships
    if (subPath === "/discounts" && method === "GET") {
      return jsonRes({ discounts: store.listDiscounts() });
    }
    if (subPath === "/discounts" && method === "POST") {
      const parsed = requestDiscountSchema.parse(await readJsonBody(req));
      const discount = store.requestDiscount(actor, parsed);
      return jsonRes({ discount }, 201);
    }
    const discDecideMatch = subPath.match(/^\/discounts\/([^/]+)\/decide$/);
    if (method === "POST" && discDecideMatch) {
      const parsed = decideDiscountSchema.parse(await readJsonBody(req));
      const discount = store.decideDiscount(actor, {
        discountId: decodeURIComponent(discDecideMatch[1]),
        ...parsed,
      });
      return jsonRes({ discount });
    }

    // Payments & Receipts
    if (subPath === "/payments" && method === "GET") {
      return jsonRes({ payments: store.listPayments(), refunds: store.listRefunds() });
    }
    if (subPath === "/payments" && method === "POST") {
      const parsed = recordPaymentSchema.parse(await readJsonBody(req));
      const payment = store.recordPayment(actor, parsed);
      return jsonRes({ payment }, 201);
    }

    const rcpPdfMatch = subPath.match(/^\/(?:receipts|payments)\/([^/]+)\/(?:pdf|receipt\.pdf)$/);
    if (method === "GET" && rcpPdfMatch) {
      const payment = store.getPaymentById(decodeURIComponent(rcpPdfMatch[1]));
      const bytes = generateReceiptPdfBytes(payment);
      return pdfRes(bytes, `${payment.receiptNumber}.pdf`);
    }

    // Refunds
    if (subPath === "/refunds" && method === "GET") {
      return jsonRes({ refunds: store.listRefunds() });
    }
    if (subPath === "/refunds" && method === "POST") {
      const parsed = requestRefundSchema.parse(await readJsonBody(req));
      const refund = store.requestRefund(actor, parsed);
      return jsonRes({ refund }, 201);
    }
    const refDecideMatch = subPath.match(/^\/refunds\/([^/]+)\/decide$/);
    if (method === "POST" && refDecideMatch) {
      const parsed = decideRefundSchema.parse(await readJsonBody(req));
      const refund = store.decideRefund(actor, {
        refundId: decodeURIComponent(refDecideMatch[1]),
        ...parsed,
      });
      return jsonRes({ refund });
    }
    const refExecMatch = subPath.match(/^\/refunds\/([^/]+)\/execute$/);
    if (method === "POST" && refExecMatch) {
      const parsed = executeRefundSchema.parse(await readJsonBody(req));
      const refund = store.executeRefund(actor, {
        refundId: decodeURIComponent(refExecMatch[1]),
        ...parsed,
      });
      return jsonRes({ refund });
    }

    // Double-Entry Ledger
    if (subPath === "/ledger" && method === "GET") {
      const accountParam = url.searchParams.get("accountCode");
      const accountCode =
        accountParam && accountParam in LEDGER_ACCOUNT_META
          ? (accountParam as LedgerAccountCode)
          : undefined;
      return jsonRes(
        store.getLedgerView({
          fromDate: url.searchParams.get("fromDate") || undefined,
          toDate: url.searchParams.get("toDate") || undefined,
          accountCode,
          studentProfileId: url.searchParams.get("studentProfileId") || undefined,
        })
      );
    }
    if (subPath === "/ledger/export" && method === "GET") {
      const accountParam = url.searchParams.get("accountCode");
      const accountCode =
        accountParam && accountParam in LEDGER_ACCOUNT_META
          ? (accountParam as LedgerAccountCode)
          : undefined;
      const csv = store.exportLedgerCsv({
        fromDate: url.searchParams.get("fromDate") || undefined,
        toDate: url.searchParams.get("toDate") || undefined,
        accountCode,
        studentProfileId: url.searchParams.get("studentProfileId") || undefined,
      });
      return csvRes(csv, "financier-general-ledger.csv");
    }
    const ledgerAcctMatch = subPath.match(/^\/ledger\/accounts\/([^/]+)$/);
    if (method === "GET" && ledgerAcctMatch) {
      const code = decodeURIComponent(ledgerAcctMatch[1]) as LedgerAccountCode;
      return jsonRes(
        store.getLedgerAccountDetail(code, {
          fromDate: url.searchParams.get("fromDate") || undefined,
          toDate: url.searchParams.get("toDate") || undefined,
          studentProfileId: url.searchParams.get("studentProfileId") || undefined,
        })
      );
    }
    const ledgerRevMatch = subPath.match(/^\/ledger\/reverse\/([^/]+)$/);
    if (method === "POST" && ledgerRevMatch) {
      const parsed = reverseLedgerSchema.parse(await readJsonBody(req));
      const counterEntry = store.reverseJournalEntry(
        actor,
        decodeURIComponent(ledgerRevMatch[1]),
        parsed.reason,
        parsed.requestId
      );
      return jsonRes({ counterEntry }, 201);
    }

    // Payroll
    if (subPath === "/payroll" && method === "GET") {
      return jsonRes({
        runs: store.listPayrollRuns(),
        batchCosts: store.getReportsView().revenueByBatch,
      });
    }
    if (subPath === "/payroll" && method === "POST") {
      const parsed = createPayrollSchema.parse(await readJsonBody(req));
      const run = store.createPayrollRun(actor, parsed);
      return jsonRes({ run }, 201);
    }
    const payslipMatch = subPath.match(/^\/payroll\/([^/]+)\/payslips\/([^/]+)\/pdf$/);
    if (method === "GET" && payslipMatch) {
      const run = store.getPayrollRunById(decodeURIComponent(payslipMatch[1]));
      const payout = run.payouts.find((p) => p.id === decodeURIComponent(payslipMatch[2]));
      if (!payout) {
        return jsonRes({ error: "Payslip payout not found.", code: "NOT_FOUND" }, 404);
      }
      const bytes = generatePayslipPdfBytes(run, payout);
      return pdfRes(bytes, `${payout.payslipNumber}.pdf`);
    }
    const payrollTransitionMatch = subPath.match(/^\/payroll\/([^/]+)\/transition$/);
    if (method === "POST" && payrollTransitionMatch) {
      const parsed = transitionPayrollSchema.parse(await readJsonBody(req));
      const run = store.transitionPayrollRun(
        actor,
        decodeURIComponent(payrollTransitionMatch[1]),
        parsed.status,
        parsed.reason,
        parsed.requestId
      );
      return jsonRes({ run });
    }
    const payrollAdjDecideMatch = subPath.match(/^\/payroll\/([^/]+)\/adjustments\/([^/]+)\/decide$/);
    if (method === "POST" && payrollAdjDecideMatch) {
      const parsed = decidePayrollAdjSchema.parse(await readJsonBody(req));
      const adjustment = store.decidePayrollAdjustment(actor, {
        payrollRunId: decodeURIComponent(payrollAdjDecideMatch[1]),
        adjustmentId: decodeURIComponent(payrollAdjDecideMatch[2]),
        ...parsed,
      });
      return jsonRes({ adjustment });
    }
    const payrollAdjMatch = subPath.match(/^\/payroll\/([^/]+)\/adjustments$/);
    if (method === "POST" && payrollAdjMatch) {
      const parsed = addPayrollAdjSchema.parse(await readJsonBody(req));
      const adjustment = store.addPayrollAdjustment(actor, {
        payrollRunId: decodeURIComponent(payrollAdjMatch[1]),
        ...parsed,
      });
      return jsonRes({ adjustment }, 201);
    }
    const payrollDetailMatch = subPath.match(/^\/payroll\/([^/]+)$/);
    if (method === "GET" && payrollDetailMatch) {
      return jsonRes({ run: store.getPayrollRunById(decodeURIComponent(payrollDetailMatch[1])) });
    }

    // Collections
    if (subPath === "/collections" && method === "GET") {
      return jsonRes(store.getCollectionsView());
    }
    if (subPath === "/collections/remind" && method === "POST") {
      const parsed = sendReminderSchema.parse(await readJsonBody(req));
      const statement = store.getStudentStatement(parsed.studentProfileId);
      const ageing = computeCollectionsAgeingReport(store.getState());
      const stuAgeing = ageing.students.find((s) => s.studentProfileId === statement.student.id);
      const outstanding = stuAgeing?.totalOutstandingPaise ?? statement.outstandingPaise;
      const overdueDays = stuAgeing?.maxDaysOverdue ?? 0;

      const mailRes = await sendFeeReminderEmail({
        to: statement.student.email,
        studentName: statement.student.name,
        registrationNumber: statement.student.registrationNumber,
        outstandingFormatted: formatPaise(outstanding),
        overdueDays,
        batchCode: statement.student.batchCode,
      });
      const notification = store.recordFeeReminderSent(
        actor,
        statement.student.id,
        {
          provider: mailRes.provider || "brevo-api",
          providerId: mailRes.id ?? null,
          status: mailRes.success
            ? mailRes.provider === "simulated"
              ? "SIMULATED"
              : "SENT"
            : "FAILED",
          subject: mailRes.subject,
        },
        parsed.requestId
      );
      return jsonRes({ notification }, 201);
    }
    if (subPath === "/collections/notes" && method === "POST") {
      const parsed = followUpNoteSchema.parse(await readJsonBody(req));
      const note = store.addFollowUpNote(actor, parsed);
      return jsonRes({ note }, 201);
    }

    // Reports & CSV Exports
    if (subPath === "/reports" && method === "GET") {
      return jsonRes(store.getReportsView());
    }
    if (subPath === "/reports/export" && method === "GET") {
      const kind = url.searchParams.get("kind") === "ageing" ? "ageing" : "payroll-vs-revenue";
      const csv = store.exportReportCsv(kind);
      return csvRes(
        csv,
        kind === "ageing" ? "collections-ageing-report.csv" : "payroll-vs-revenue-report.csv"
      );
    }

    // Immutable Audit Log
    if (subPath === "/audit" && method === "GET") {
      return jsonRes({
        logs: store.listAuditLogs({
          entityType: url.searchParams.get("entityType") || undefined,
          actorId: url.searchParams.get("actorId") || undefined,
          action: url.searchParams.get("action") || undefined,
        }),
      });
    }

    return jsonRes({ error: `Financier endpoint not found: ${method} ${subPath}`, code: "NOT_FOUND" }, 404);
  } catch (err) {
    return mapErrorToResponse(err);
  }
}

export interface NodeReqLike {
  url?: string;
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  on?: (event: string, cb: (chunk?: unknown) => void) => void;
}

export interface NodeResLike {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(chunk?: string | Buffer): void;
}

export async function dispatchNodeFinancierRequest(
  req: NodeReqLike,
  res: NodeResLike,
  storeParam?: FinancierStore
): Promise<void> {
  const store = storeParam ?? (await getSharedFinancierStoreAsync());
  const method = (req.method || "GET").toUpperCase();
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers || {})) {
    if (Array.isArray(v)) headers.set(k, v.join(", "));
    else if (typeof v === "string") headers.set(k, v);
  }

  let bodyBuffer: Uint8Array | undefined;
  if (method !== "GET" && method !== "HEAD" && typeof req.on === "function") {
    const rawText = await new Promise<string>((resolve) => {
      let acc = "";
      req.on!("data", (chunk) => {
        if (chunk) acc += String(chunk);
      });
      req.on!("end", () => resolve(acc));
      req.on!("error", () => resolve(""));
    });
    if (rawText) {
      bodyBuffer = new TextEncoder().encode(rawText);
    }
  }

  const webReq = new Request(new URL(req.url || "/api/financier", "http://127.0.0.1"), {
    method,
    headers,
    body: bodyBuffer ? bodyBuffer.slice().buffer : undefined,
  });

  const webRes = await handleFinancierRequest(webReq, store);
  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const contentType = webRes.headers.get("content-type") || "";
  if (contentType.includes("application/pdf")) {
    const ab = await webRes.arrayBuffer();
    res.end(Buffer.from(ab));
  } else {
    res.end(await webRes.text());
  }
}

export default async function handler(req: Request): Promise<Response> {
  return handleFinancierRequest(req);
}
