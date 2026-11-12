import { runWithAtomicAudit, type AtomicAuditInput } from "./audit.ts";
import { computeCollectionsAgeingReport } from "./ageing.ts";
import {
  buildCounterEntryReversal,
  computeAccountBalances,
  createBalancedJournalEntry,
  LEDGER_ACCOUNT_META,
  paymentMethodToAccountCode,
  verifyTrialBalance,
} from "./ledger.ts";
import {
  addPaise,
  allocatePaymentPaiseOldestFirst,
  applyBasisPointsPaise,
  assertPositivePaise,
  subtractPaise,
  sumPaise,
} from "./money.ts";
import {
  assertValidPayrollTransition,
  calculateTrainerBatchPayrollPaise,
  validatePayrollAdjustmentInput,
} from "./payroll.ts";
import {
  computeDashboardMetrics,
  computeReportsSummary,
  generateAgeingCsv,
  generateLedgerCsv,
  generatePayrollVsRevenueCsv,
} from "./reports.ts";
import type {
  ActorIdentity,
  AdjustmentType,
  AuditLogRecord,
  BalancedJournalEntry,
  DiscountRequestRecord,
  FinancierDatabaseState,
  FollowUpNoteRecord,
  InstallmentRecord,
  InvoiceLineItem,
  InvoiceRecord,
  InvoiceStatus,
  LedgerAccountCode,
  NotificationDispatchRecord,
  PaymentMethod,
  PaymentRecord,
  PayrollAdjustmentRecord,
  PayrollRunRecord,
  PayrollRunStatus,
  RefundRecord,
  StudentFeeAccountRecord,
} from "./types.ts";

export class FinancierDomainError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(
    message: string,
    statusCode: number,
    code: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = "FinancierDomainError";
  }
}

export class NotFoundError extends FinancierDomainError {
  constructor(message: string) {
    super(message, 404, "NOT_FOUND");
  }
}

export class ValidationError extends FinancierDomainError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class DuplicateReferenceError extends FinancierDomainError {
  constructor(ref: string) {
    super(
      `Duplicate payment or settlement reference blocked: "${ref}" has already been posted.`,
      409,
      "DUPLICATE_REFERENCE"
    );
  }
}

export class ConflictStateError extends FinancierDomainError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

export class DualControlViolationError extends FinancierDomainError {
  constructor(message: string) {
    super(message, 403, "DUAL_CONTROL_VIOLATION");
  }
}

function normalizeRef(ref: string): string {
  return ref.trim().toUpperCase();
}

function nextSequence(prefix: string, items: ReadonlyArray<{ id: string }>, width = 4): string {
  const num = items.length + 1;
  return `${prefix}-${String(num).padStart(width, "0")}`;
}

export interface CreateInvoiceInput {
  mode: "STUDENT" | "BATCH";
  studentProfileId?: string;
  batchId?: string;
  issueDate?: string;
  dueDate: string;
  status: "DRAFT" | "SENT";
  description?: string;
  amountPaise: number;
  discountPaise?: number;
  notes?: string;
  requestId?: string;
}

export interface RecordPaymentInput {
  studentProfileId: string;
  invoiceId?: string | null;
  amountPaise: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  externalReference: string;
  notes?: string | null;
  requestId?: string;
}

export interface RequestDiscountInput {
  studentProfileId: string;
  invoiceId?: string | null;
  kind: "FIXED" | "PERCENTAGE";
  basisPoints?: number | null;
  amountPaise?: number | null;
  reason: string;
  requestId?: string;
}

export interface DecideDiscountInput {
  discountId: string;
  decision: "APPROVED" | "REJECTED";
  decisionNotes: string;
  requestId?: string;
}

export interface RequestRefundInput {
  paymentId: string;
  amountPaise: number;
  refundMethod: PaymentMethod;
  reason: string;
  requestId?: string;
}

export interface DecideRefundInput {
  refundId: string;
  decision: "APPROVED" | "REJECTED";
  reason?: string;
  requestId?: string;
}

export interface ExecuteRefundInput {
  refundId: string;
  externalReference: string;
  reason?: string;
  requestId?: string;
}

export interface CreatePayrollRunInput {
  periodName: string;
  startDate: string;
  endDate: string;
  requestId?: string;
}

export interface AddPayrollAdjustmentInput {
  payrollRunId: string;
  trainerPayoutId: string;
  type: AdjustmentType;
  amountPaise: number;
  reason: string;
  requestId?: string;
}

export interface DecidePayrollAdjustmentInput {
  payrollRunId: string;
  adjustmentId: string;
  decision: "APPROVED" | "REJECTED";
  requestId?: string;
}

export interface StudentStatementView {
  student: StudentFeeAccountRecord;
  billedPaise: number;
  paidPaise: number;
  refundedPaise: number;
  netPaidPaise: number;
  outstandingPaise: number;
  installments: InstallmentRecord[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  discounts: DiscountRequestRecord[];
  refunds: RefundRecord[];
  ledgerLines: Array<
    FinancierDatabaseState["journalEntries"][number]["lines"][number]
  >;
  followUpNotes: FollowUpNoteRecord[];
}

export interface FinancierStore {
  getState: () => FinancierDatabaseState;
  getSummary: () => {
    dashboard: ReturnType<typeof computeDashboardMetrics>;
    trialBalance: ReturnType<typeof verifyTrialBalance>;
    accountBalances: ReturnType<typeof computeAccountBalances>;
    students: Array<{
      id: string;
      name: string;
      email: string;
      registrationNumber: string;
      batchId: string;
      batchCode: string;
      trackCode: string;
      trackTitle: string;
      courseFeePaise: number;
      approvedDiscountPaise: number;
      netPayablePaise: number;
      totalInvoicedPaise: number;
      totalPaidPaise: number;
      outstandingPaise: number;
      financialHold: boolean;
      installmentCount: number;
      overdueInstallmentsCount: number;
    }>;
    batches: FinancierDatabaseState["batches"];
    tracks: FinancierDatabaseState["tracks"];
    actors: FinancierDatabaseState["actors"];
  };
  getStudentStatement: (studentId: string) => StudentStatementView;
  listInvoices: () => InvoiceRecord[];
  getInvoiceById: (id: string) => {
    invoice: InvoiceRecord;
    student: StudentFeeAccountRecord;
    payments: PaymentRecord[];
    discounts: DiscountRequestRecord[];
  };
  createInvoices: (actor: ActorIdentity, input: CreateInvoiceInput) => InvoiceRecord[];
  updateInvoiceStatus: (
    actor: ActorIdentity,
    invoiceId: string,
    nextStatus: "SENT" | "VOID",
    reason?: string,
    requestId?: string
  ) => InvoiceRecord;
  logInvoiceEmailSent: (
    actor: ActorIdentity,
    invoiceId: string,
    dispatchResult: { provider: string; providerId: string | null; status: "SENT" | "SIMULATED" | "FAILED"; subject: string },
    requestId?: string
  ) => { invoice: InvoiceRecord; notification: NotificationDispatchRecord };
  listDiscounts: () => DiscountRequestRecord[];
  requestDiscount: (actor: ActorIdentity, input: RequestDiscountInput) => DiscountRequestRecord;
  decideDiscount: (actor: ActorIdentity, input: DecideDiscountInput) => DiscountRequestRecord;
  listPayments: () => PaymentRecord[];
  getPaymentById: (id: string) => PaymentRecord;
  recordPayment: (actor: ActorIdentity, input: RecordPaymentInput) => PaymentRecord;
  listRefunds: () => RefundRecord[];
  requestRefund: (actor: ActorIdentity, input: RequestRefundInput) => RefundRecord;
  decideRefund: (actor: ActorIdentity, input: DecideRefundInput) => RefundRecord;
  executeRefund: (actor: ActorIdentity, input: ExecuteRefundInput) => RefundRecord;
  getLedgerView: (filters?: {
    fromDate?: string;
    toDate?: string;
    accountCode?: LedgerAccountCode;
    studentProfileId?: string;
  }) => {
    entries: BalancedJournalEntry[];
    accountBalances: ReturnType<typeof computeAccountBalances>;
    trialBalance: ReturnType<typeof verifyTrialBalance>;
    accountsMeta: typeof LEDGER_ACCOUNT_META;
  };
  getLedgerAccountDetail: (
    accountCode: LedgerAccountCode,
    filters?: { fromDate?: string; toDate?: string; studentProfileId?: string }
  ) => {
    account: (typeof LEDGER_ACCOUNT_META)[LedgerAccountCode];
    summary: ReturnType<typeof computeAccountBalances>[number];
    lines: Array<
      BalancedJournalEntry["lines"][number] & {
        studentName: string | null;
      }
    >;
  };
  reverseJournalEntry: (
    actor: ActorIdentity,
    entryId: string,
    reason: string,
    requestId?: string
  ) => BalancedJournalEntry;
  exportLedgerCsv: (filters?: {
    fromDate?: string;
    toDate?: string;
    accountCode?: LedgerAccountCode;
    studentProfileId?: string;
  }) => string;
  listPayrollRuns: () => PayrollRunRecord[];
  getPayrollRunById: (id: string) => PayrollRunRecord;
  createPayrollRun: (actor: ActorIdentity, input: CreatePayrollRunInput) => PayrollRunRecord;
  transitionPayrollRun: (
    actor: ActorIdentity,
    runId: string,
    nextStatus: PayrollRunStatus,
    reason?: string,
    requestId?: string
  ) => PayrollRunRecord;
  addPayrollAdjustment: (
    actor: ActorIdentity,
    input: AddPayrollAdjustmentInput
  ) => PayrollAdjustmentRecord;
  decidePayrollAdjustment: (
    actor: ActorIdentity,
    input: DecidePayrollAdjustmentInput
  ) => PayrollAdjustmentRecord;
  getCollectionsView: () => {
    ageing: ReturnType<typeof computeCollectionsAgeingReport>;
    notes: FollowUpNoteRecord[];
    notifications: NotificationDispatchRecord[];
  };
  recordFeeReminderSent: (
    actor: ActorIdentity,
    studentProfileId: string,
    dispatchResult: { provider: string; providerId: string | null; status: "SENT" | "SIMULATED" | "FAILED"; subject: string },
    requestId?: string
  ) => NotificationDispatchRecord;
  addFollowUpNote: (
    actor: ActorIdentity,
    input: {
      studentProfileId: string;
      channel: FollowUpNoteRecord["channel"];
      note: string;
      nextFollowUpDate?: string | null;
      requestId?: string;
    }
  ) => FollowUpNoteRecord;
  getReportsView: () => ReturnType<typeof computeReportsSummary>;
  exportReportCsv: (kind: "ageing" | "payroll-vs-revenue") => string;
  listAuditLogs: (filters?: { entityType?: string; actorId?: string; action?: string }) => AuditLogRecord[];
}

export function createFinancierStore(
  initialState: FinancierDatabaseState,
  options?: {
    onPersistAudit?: (record: AuditLogRecord) => void;
    nowIso?: () => string;
  }
): FinancierStore {
  const state: FinancierDatabaseState = structuredClone(initialState);
  const nowIso = options?.nowIso ?? (() => new Date().toISOString());
  const onPersistAudit = options?.onPersistAudit;
  let monotonicSeq = 1;

  const nextUniqueId = (prefix: string) => `${prefix}-${Date.now()}-${monotonicSeq++}`;

  const auditBase = (
    actor: ActorIdentity,
    action: string,
    entityType: string,
    entityId: string,
    reason: string | null,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
    requestId?: string
  ): AtomicAuditInput => ({
    id: nextUniqueId("aud"),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    entityType,
    entityId,
    timestamp: nowIso(),
    reason,
    requestId: requestId || nextUniqueId("req"),
    before,
    after,
  });

  function postBalancedJournalInDraft(
    draft: FinancierDatabaseState,
    params: Omit<Parameters<typeof createBalancedJournalEntry>[0], "id" | "entryNumber">
  ): BalancedJournalEntry {
    const seq = draft.journalEntries.length + 1;
    const entry = createBalancedJournalEntry({
      ...params,
      id: nextUniqueId("je"),
      entryNumber: `JE-2026-${String(seq + 100).padStart(4, "0")}`,
    });
    draft.journalEntries.unshift(entry);
    return entry;
  }

  function refreshOverdueFlags(draft: FinancierDatabaseState, asOfIso: string) {
    const asOfMs = Date.parse(asOfIso);
    for (const inv of draft.invoices) {
      if (inv.status === "SENT" && inv.netTotalPaise > inv.paidAmountPaise) {
        if (Date.parse(inv.dueDate) < asOfMs) {
          inv.status = "OVERDUE";
        }
      }
      if (inv.status === "OVERDUE" && inv.paidAmountPaise >= inv.netTotalPaise) {
        inv.status = "PAID";
      }
    }
    for (const inst of draft.installments) {
      if (inst.remainingBalancePaise === 0) {
        inst.status = "PAID";
      } else if (Date.parse(inst.dueDate) < asOfMs) {
        inst.status = "OVERDUE";
      } else if (inst.amountPaidPaise > 0) {
        inst.status = "PARTIALLY_PAID";
      } else {
        inst.status = "UPCOMING";
      }
    }
  }

  const store: FinancierStore = {
    getState() {
      return state;
    },

    getSummary() {
      const asOfIso = nowIso();
      refreshOverdueFlags(state, asOfIso);
      const dashboard = computeDashboardMetrics(state, asOfIso);
      const trialBalance = verifyTrialBalance(state.journalEntries);
      const accountBalances = computeAccountBalances(state.journalEntries);
      const students = state.students.map((stu) => {
        const stuInvs = state.invoices.filter(
          (i) => i.studentProfileId === stu.id && i.status !== "VOID" && i.status !== "DRAFT"
        );
        const totalInvoicedPaise = sumPaise(stuInvs.map((i) => i.netTotalPaise));
        const totalPaidPaise = sumPaise(stuInvs.map((i) => i.paidAmountPaise));
        const stuInsts = state.installments.filter((i) => i.studentProfileId === stu.id);
        return {
          ...stu,
          totalInvoicedPaise,
          totalPaidPaise,
          outstandingPaise: Math.max(0, subtractPaise(totalInvoicedPaise, totalPaidPaise)),
          installmentCount: stuInsts.length,
          overdueInstallmentsCount: stuInsts.filter((i) => i.status === "OVERDUE").length,
        };
      });

      return {
        dashboard,
        trialBalance,
        accountBalances,
        students,
        batches: state.batches,
        tracks: state.tracks,
        actors: state.actors,
      };
    },

    getStudentStatement(studentId) {
      const student = state.students.find((s) => s.id === studentId);
      if (!student) throw new NotFoundError(`Student ${studentId} not found.`);

      const installments = state.installments
        .filter((i) => i.studentProfileId === student.id)
        .sort((a, b) => a.installmentNumber - b.installmentNumber);
      const invoices = state.invoices
        .filter((i) => i.studentProfileId === student.id)
        .sort((a, b) => Date.parse(b.issueDate) - Date.parse(a.issueDate));
      const payments = state.payments
        .filter((p) => p.studentProfileId === student.id)
        .sort((a, b) => Date.parse(b.paymentDate) - Date.parse(a.paymentDate));
      const discounts = state.discounts.filter((d) => d.studentProfileId === student.id);
      const refunds = state.refunds.filter((r) => r.studentProfileId === student.id);

      const issuedInvoices = invoices.filter((i) => i.status !== "VOID" && i.status !== "DRAFT");
      const billedPaise = sumPaise(issuedInvoices.map((i) => i.netTotalPaise));
      const paidPaise = sumPaise(
        payments.filter((p) => p.verificationStatus !== "REVERSED").map((p) => p.amountPaise)
      );
      const refundedPaise = sumPaise(
        payments.filter((p) => p.verificationStatus !== "REVERSED").map((p) => p.refundedPaise)
      );
      const netPaidPaise = Math.max(0, subtractPaise(paidPaise, refundedPaise));
      const outstandingPaise = sumPaise(
        issuedInvoices.map((i) => Math.max(0, subtractPaise(i.netTotalPaise, i.paidAmountPaise)))
      );

      const ledgerLines = state.journalEntries
        .flatMap((entry) => entry.lines)
        .filter((line) => line.studentProfileId === student.id);
      const followUpNotes = state.followUpNotes.filter((n) => n.studentProfileId === student.id);

      return {
        student,
        billedPaise,
        paidPaise,
        refundedPaise,
        netPaidPaise,
        outstandingPaise,
        installments,
        invoices,
        payments,
        discounts,
        refunds,
        ledgerLines,
        followUpNotes,
      };
    },

    listInvoices() {
      refreshOverdueFlags(state, nowIso());
      return [...state.invoices].sort(
        (a, b) => Date.parse(b.issueDate) - Date.parse(a.issueDate)
      );
    },

    getInvoiceById(id) {
      refreshOverdueFlags(state, nowIso());
      const invoice = state.invoices.find((i) => i.id === id);
      if (!invoice) throw new NotFoundError(`Invoice ${id} not found.`);
      const student = state.students.find((s) => s.id === invoice.studentProfileId);
      if (!student) throw new NotFoundError(`Student ${invoice.studentProfileId} not found.`);
      const payments = state.payments.filter((p) => p.invoiceId === invoice.id);
      const discounts = state.discounts.filter(
        (d) => d.invoiceId === invoice.id || d.studentProfileId === student.id
      );
      return { invoice, student, payments, discounts };
    },

    createInvoices(actor, input) {
      assertPositivePaise(input.amountPaise, "invoice.amountPaise");
      const discountPaise = input.discountPaise ?? 0;
      if (!Number.isSafeInteger(discountPaise) || discountPaise < 0) {
        throw new ValidationError("discountPaise must be a non-negative integer in paise.");
      }
      if (discountPaise >= input.amountPaise) {
        throw new ValidationError("Discount cannot equal or exceed gross invoice amount.");
      }

      const issueDate = input.issueDate || nowIso();
      if (Number.isNaN(Date.parse(input.dueDate))) {
        throw new ValidationError("Valid ISO dueDate is required.");
      }

      let targets: StudentFeeAccountRecord[] = [];
      if (input.mode === "STUDENT") {
        const stu = state.students.find((s) => s.id === input.studentProfileId);
        if (!stu) throw new NotFoundError(`Student ${input.studentProfileId} not found.`);
        targets = [stu];
      } else {
        targets = state.students.filter((s) => s.batchId === input.batchId);
        if (targets.length === 0) {
          throw new ValidationError(`No enrolled students found for batch ${input.batchId}.`);
        }
      }

      return runWithAtomicAudit(
        state,
        (draft) => {
          const created: InvoiceRecord[] = [];
          const audits: AtomicAuditInput[] = [];

          for (const stu of targets) {
            const invId = `inv-${Date.now()}-${draft.invoices.length + 1}`;
            const invoiceNumber = nextSequence("INV-2026", draft.invoices, 4);
            const netTotalPaise = subtractPaise(input.amountPaise, discountPaise);
            const description =
              input.description?.trim() || `${stu.trackTitle} — Tuition Invoice`;
            const lineItem: InvoiceLineItem = {
              id: `invl-${invId}-1`,
              description,
              quantity: 1,
              unitPricePaise: input.amountPaise,
              totalPaise: input.amountPaise,
            };

            const isOverdueOnIssue =
              input.status === "SENT" && Date.parse(input.dueDate) < Date.parse(nowIso());
            const resolvedStatus: InvoiceStatus = isOverdueOnIssue ? "OVERDUE" : input.status;

            const record: InvoiceRecord = {
              id: invId,
              invoiceNumber,
              studentProfileId: stu.id,
              studentName: stu.name,
              studentEmail: stu.email,
              registrationNumber: stu.registrationNumber,
              batchId: stu.batchId,
              batchCode: stu.batchCode,
              trackCode: stu.trackCode,
              trackTitle: stu.trackTitle,
              feeAgreementId: stu.feeAgreementId,
              issueDate,
              dueDate: input.dueDate,
              grossAmountPaise: input.amountPaise,
              discountAmountPaise: discountPaise,
              taxAmountPaise: 0,
              netTotalPaise,
              paidAmountPaise: 0,
              currency: "INR",
              status: resolvedStatus,
              notes: input.notes ?? null,
              sentAt: input.status === "SENT" ? issueDate : null,
              voidedAt: null,
              voidReason: null,
              createdById: actor.id,
              lines: [lineItem],
            };

            draft.invoices.unshift(record);
            created.push(record);

            if (input.status === "SENT") {
              postBalancedJournalInDraft(draft, {
                entryDate: issueDate,
                transactionType: "CHARGE",
                referenceType: "Invoice",
                referenceId: record.id,
                studentProfileId: stu.id,
                batchId: stu.batchId,
                trackCode: stu.trackCode,
                notes: `Invoice ${invoiceNumber} issued (${input.mode})`,
                createdById: actor.id,
                lines: [
                  {
                    accountCode: "STUDENT_RECEIVABLES",
                    direction: "DEBIT",
                    amountPaise: input.amountPaise,
                  },
                  {
                    accountCode: "REVENUE",
                    direction: "CREDIT",
                    amountPaise: input.amountPaise,
                  },
                ],
              });

              if (discountPaise > 0) {
                postBalancedJournalInDraft(draft, {
                  entryDate: issueDate,
                  transactionType: "DISCOUNT",
                  referenceType: "Invoice",
                  referenceId: record.id,
                  studentProfileId: stu.id,
                  batchId: stu.batchId,
                  trackCode: stu.trackCode,
                  notes: `Discount on invoice ${invoiceNumber}`,
                  createdById: actor.id,
                  lines: [
                    {
                      accountCode: "FEE_DISCOUNT",
                      direction: "DEBIT",
                      amountPaise: discountPaise,
                    },
                    {
                      accountCode: "STUDENT_RECEIVABLES",
                      direction: "CREDIT",
                      amountPaise: discountPaise,
                    },
                  ],
                });
              }

              // Add corresponding instalment row so payment allocation covers the new invoice cleanly
              const stuInsts = draft.installments.filter((x) => x.studentProfileId === stu.id);
              const nextNum =
                stuInsts.reduce((max, x) => Math.max(max, x.installmentNumber), 0) + 1;
              draft.installments.push({
                id: `inst-${invId}`,
                feeAgreementId: stu.feeAgreementId,
                studentProfileId: stu.id,
                installmentNumber: nextNum,
                dueDate: input.dueDate,
                amountDuePaise: netTotalPaise,
                amountPaidPaise: 0,
                remainingBalancePaise: netTotalPaise,
                status: isOverdueOnIssue ? "OVERDUE" : "UPCOMING",
                lastPaymentDate: null,
              });
            }

            audits.push(
              auditBase(
                actor,
                "INVOICE_CREATED",
                "Invoice",
                record.id,
                `Created ${record.status} invoice ${record.invoiceNumber}`,
                null,
                {
                  invoiceNumber: record.invoiceNumber,
                  studentProfileId: record.studentProfileId,
                  status: record.status,
                  netTotalPaise: record.netTotalPaise,
                },
                input.requestId
              )
            );
          }

          return { result: created, audit: audits };
        },
        onPersistAudit
      );
    },

    updateInvoiceStatus(actor, invoiceId, nextStatus, reason, requestId) {
      return runWithAtomicAudit(
        state,
        (draft) => {
          const inv = draft.invoices.find((i) => i.id === invoiceId);
          if (!inv) throw new NotFoundError(`Invoice ${invoiceId} not found.`);
          const before = {
            status: inv.status,
            paidAmountPaise: inv.paidAmountPaise,
            netTotalPaise: inv.netTotalPaise,
          };

          if (nextStatus === "SENT") {
            if (inv.status !== "DRAFT") {
              throw new ConflictStateError(
                `Only DRAFT invoices can transition to SENT; current status is ${inv.status}.`
              );
            }
            const sentAt = nowIso();
            inv.status = Date.parse(inv.dueDate) < Date.parse(sentAt) ? "OVERDUE" : "SENT";
            inv.sentAt = sentAt;

            postBalancedJournalInDraft(draft, {
              entryDate: sentAt,
              transactionType: "CHARGE",
              referenceType: "Invoice",
              referenceId: inv.id,
              studentProfileId: inv.studentProfileId,
              batchId: inv.batchId,
              trackCode: inv.trackCode,
              notes: `Issued draft invoice ${inv.invoiceNumber}`,
              createdById: actor.id,
              lines: [
                {
                  accountCode: "STUDENT_RECEIVABLES",
                  direction: "DEBIT",
                  amountPaise: inv.grossAmountPaise,
                },
                {
                  accountCode: "REVENUE",
                  direction: "CREDIT",
                  amountPaise: inv.grossAmountPaise,
                },
              ],
            });

            if (inv.discountAmountPaise > 0) {
              postBalancedJournalInDraft(draft, {
                entryDate: sentAt,
                transactionType: "DISCOUNT",
                referenceType: "Invoice",
                referenceId: inv.id,
                studentProfileId: inv.studentProfileId,
                batchId: inv.batchId,
                trackCode: inv.trackCode,
                notes: `Discount on invoice ${inv.invoiceNumber}`,
                createdById: actor.id,
                lines: [
                  {
                    accountCode: "FEE_DISCOUNT",
                    direction: "DEBIT",
                    amountPaise: inv.discountAmountPaise,
                  },
                  {
                    accountCode: "STUDENT_RECEIVABLES",
                    direction: "CREDIT",
                    amountPaise: inv.discountAmountPaise,
                  },
                ],
              });
            }

            return {
              result: inv,
              audit: auditBase(
                actor,
                "INVOICE_SENT",
                "Invoice",
                inv.id,
                reason || `Issued invoice ${inv.invoiceNumber} to student ledger`,
                before,
                { status: inv.status, sentAt: inv.sentAt },
                requestId
              ),
            };
          }

          // VOID flow: never void an invoice that has paid money; reverse original CHARGE entries via counter-entry!
          if (!reason || reason.trim().length < 5) {
            throw new ValidationError("Voiding an invoice requires a reason of at least 5 characters.");
          }
          if (inv.status === "VOID") {
            throw new ConflictStateError(`Invoice ${inv.invoiceNumber} is already VOID.`);
          }
          if (inv.paidAmountPaise > 0) {
            throw new ConflictStateError(
              `Cannot void invoice ${inv.invoiceNumber} because ${inv.paidAmountPaise} paise is already paid. Issue a refund first.`
            );
          }

          const wasPosted = inv.status !== "DRAFT";
          const voidTime = nowIso();
          inv.status = "VOID";
          inv.voidedAt = voidTime;
          inv.voidReason = reason.trim();

          if (wasPosted) {
            const matchingEntries = draft.journalEntries.filter(
              (je) => je.referenceType === "Invoice" && je.referenceId === inv.id && !je.reversedByEntryId
            );
            for (const je of matchingEntries) {
              const revId = `je-${Date.now()}-${draft.journalEntries.length + 1}`;
              const revNum = `JE-2026-${String(draft.journalEntries.length + 101).padStart(4, "0")}`;
              const counter = buildCounterEntryReversal({
                original: je,
                newEntryId: revId,
                newEntryNumber: revNum,
                reversalDate: voidTime,
                reason: reason.trim(),
                createdById: actor.id,
              });
              je.reversedByEntryId = counter.id;
              draft.journalEntries.unshift(counter);
            }
          }

          return {
            result: inv,
            audit: auditBase(
              actor,
              "INVOICE_VOIDED_WITH_REVERSAL",
              "Invoice",
              inv.id,
              reason.trim(),
              before,
              { status: inv.status, voidedAt: inv.voidedAt, voidReason: inv.voidReason },
              requestId
            ),
          };
        },
        onPersistAudit
      );
    },

    logInvoiceEmailSent(actor, invoiceId, dispatchResult, requestId) {
      return runWithAtomicAudit(
        state,
        (draft) => {
          const inv = draft.invoices.find((i) => i.id === invoiceId);
          if (!inv) throw new NotFoundError(`Invoice ${invoiceId} not found.`);
          if (inv.status === "VOID") {
            throw new ConflictStateError("Cannot email a VOID invoice.");
          }
          const before = { status: inv.status, sentAt: inv.sentAt };
          const sentAt = nowIso();
          if (inv.status === "DRAFT") {
            inv.status = Date.parse(inv.dueDate) < Date.parse(sentAt) ? "OVERDUE" : "SENT";
            inv.sentAt = sentAt;
            postBalancedJournalInDraft(draft, {
              entryDate: sentAt,
              transactionType: "CHARGE",
              referenceType: "Invoice",
              referenceId: inv.id,
              studentProfileId: inv.studentProfileId,
              batchId: inv.batchId,
              trackCode: inv.trackCode,
              notes: `Invoice ${inv.invoiceNumber} emailed and posted`,
              createdById: actor.id,
              lines: [
                {
                  accountCode: "STUDENT_RECEIVABLES",
                  direction: "DEBIT",
                  amountPaise: inv.grossAmountPaise,
                },
                {
                  accountCode: "REVENUE",
                  direction: "CREDIT",
                  amountPaise: inv.grossAmountPaise,
                },
              ],
            });
          } else {
            inv.sentAt = sentAt;
          }

          const notification: NotificationDispatchRecord = {
            id: `notif-${Date.now()}-${draft.notifications.length + 1}`,
            studentProfileId: inv.studentProfileId,
            recipientEmail: inv.studentEmail,
            kind: "INVOICE",
            subject: dispatchResult.subject,
            provider: dispatchResult.provider,
            providerId: dispatchResult.providerId,
            status: dispatchResult.status,
            sentById: actor.id,
            sentAt,
          };
          draft.notifications.unshift(notification);

          return {
            result: { invoice: inv, notification },
            audit: auditBase(
              actor,
              "INVOICE_EMAILED",
              "Invoice",
              inv.id,
              `Sent invoice email via ${dispatchResult.provider} to ${inv.studentEmail}`,
              before,
              { status: inv.status, sentAt, providerStatus: dispatchResult.status },
              requestId
            ),
          };
        },
        onPersistAudit
      );
    },

    listDiscounts() {
      return [...state.discounts].sort(
        (a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt)
      );
    },

    requestDiscount(actor, input) {
      if (!input.reason || input.reason.trim().length < 5) {
        throw new ValidationError("Discount/scholarship requests require a reason of at least 5 characters.");
      }
      const stu = state.students.find((s) => s.id === input.studentProfileId);
      if (!stu) throw new NotFoundError(`Student ${input.studentProfileId} not found.`);

      const invoice = input.invoiceId
        ? state.invoices.find((i) => i.id === input.invoiceId && i.studentProfileId === stu.id)
        : undefined;
      if (input.invoiceId && !invoice) {
        throw new NotFoundError(`Invoice ${input.invoiceId} not found for student ${stu.name}.`);
      }

      let amountPaise = 0;
      if (input.kind === "PERCENTAGE") {
        if (
          input.basisPoints === undefined ||
          input.basisPoints === null ||
          !Number.isSafeInteger(input.basisPoints) ||
          input.basisPoints <= 0 ||
          input.basisPoints > 5000
        ) {
          throw new ValidationError("Percentage discount basisPoints must be between 1 (0.01%) and 5000 (50.00%).");
        }
        const base = invoice ? subtractPaise(invoice.netTotalPaise, invoice.paidAmountPaise) : stu.netPayablePaise;
        amountPaise = applyBasisPointsPaise(base, input.basisPoints);
      } else {
        if (!input.amountPaise) {
          throw new ValidationError("Fixed discount amountPaise is required.");
        }
        amountPaise = assertPositivePaise(input.amountPaise, "discount.amountPaise");
      }

      if (amountPaise <= 0) {
        throw new ValidationError("Computed discount must be greater than zero paise.");
      }

      return runWithAtomicAudit(
        state,
        (draft) => {
          const rec: DiscountRequestRecord = {
            id: `disc-${Date.now()}-${draft.discounts.length + 1}`,
            studentProfileId: stu.id,
            studentName: stu.name,
            feeAgreementId: stu.feeAgreementId,
            invoiceId: invoice?.id ?? null,
            kind: input.kind,
            basisPoints: input.kind === "PERCENTAGE" ? input.basisPoints! : null,
            amountPaise,
            reason: input.reason.trim(),
            status: "PENDING",
            requestedById: actor.id,
            requestedByName: actor.name,
            requestedAt: nowIso(),
            approvedById: null,
            approvedByName: null,
            decidedAt: null,
            decisionNotes: null,
          };
          draft.discounts.unshift(rec);

          return {
            result: rec,
            audit: auditBase(
              actor,
              "DISCOUNT_REQUESTED",
              "DiscountRequest",
              rec.id,
              rec.reason,
              null,
              {
                studentProfileId: stu.id,
                amountPaise: rec.amountPaise,
                status: rec.status,
              },
              input.requestId
            ),
          };
        },
        onPersistAudit
      );
    },

    decideDiscount(actor, input) {
      if (!input.decisionNotes || input.decisionNotes.trim().length < 5) {
        throw new ValidationError("Approving or rejecting a discount requires decisionNotes (min 5 chars).");
      }

      return runWithAtomicAudit(
        state,
        (draft) => {
          const disc = draft.discounts.find((d) => d.id === input.discountId);
          if (!disc) throw new NotFoundError(`Discount request ${input.discountId} not found.`);
          if (disc.status !== "PENDING") {
            throw new ConflictStateError(`Discount ${disc.id} is already ${disc.status}.`);
          }
          if (disc.requestedById === actor.id) {
            throw new DualControlViolationError(
              "Dual-control violation: discount approver must be different from the requester."
            );
          }

          const before = {
            status: disc.status,
            amountPaise: disc.amountPaise,
          };

          const decidedAt = nowIso();
          disc.status = input.decision;
          disc.approvedById = actor.id;
          disc.approvedByName = actor.name;
          disc.decidedAt = decidedAt;
          disc.decisionNotes = input.decisionNotes.trim();

          if (input.decision === "APPROVED") {
            const stu = draft.students.find((s) => s.id === disc.studentProfileId)!;
            stu.approvedDiscountPaise = addPaise(stu.approvedDiscountPaise, disc.amountPaise);
            stu.netPayablePaise = Math.max(0, subtractPaise(stu.courseFeePaise, stu.approvedDiscountPaise));

            // Reduce remaining instalments from latest due date backward
            let toWaive = disc.amountPaise;
            const stuInsts = draft.installments
              .filter((i) => i.studentProfileId === stu.id && i.remainingBalancePaise > 0)
              .sort((a, b) => b.installmentNumber - a.installmentNumber);
            for (const inst of stuInsts) {
              if (toWaive <= 0) break;
              const credit = Math.min(toWaive, inst.remainingBalancePaise);
              inst.remainingBalancePaise = subtractPaise(inst.remainingBalancePaise, credit);
              inst.amountDuePaise = subtractPaise(inst.amountDuePaise, credit);
              if (inst.remainingBalancePaise === 0) inst.status = "PAID";
              toWaive = subtractPaise(toWaive, credit);
            }

            // Apply discount to target open invoice (or latest unpaid non-VOID non-DRAFT invoice)
            const targetInvoice = disc.invoiceId
              ? draft.invoices.find((i) => i.id === disc.invoiceId && i.status !== "VOID")
              : draft.invoices.find(
                  (i) =>
                    i.studentProfileId === stu.id &&
                    i.status !== "VOID" &&
                    i.status !== "DRAFT" &&
                    i.netTotalPaise > i.paidAmountPaise
                );

            if (targetInvoice && targetInvoice.status !== "VOID") {
              const unpaidCap = subtractPaise(targetInvoice.netTotalPaise, targetInvoice.paidAmountPaise);
              const appliedToInvoice = Math.min(disc.amountPaise, Math.max(0, unpaidCap));
              if (appliedToInvoice > 0) {
                targetInvoice.discountAmountPaise = addPaise(
                  targetInvoice.discountAmountPaise,
                  appliedToInvoice
                );
                targetInvoice.netTotalPaise = subtractPaise(
                  targetInvoice.netTotalPaise,
                  appliedToInvoice
                );
                if (targetInvoice.paidAmountPaise >= targetInvoice.netTotalPaise) {
                  targetInvoice.status = "PAID";
                }
                if (targetInvoice.status !== "DRAFT") {
                  postBalancedJournalInDraft(draft, {
                    entryDate: decidedAt,
                    transactionType: "DISCOUNT",
                    referenceType: "DiscountRequest",
                    referenceId: disc.id,
                    studentProfileId: stu.id,
                    batchId: stu.batchId,
                    trackCode: stu.trackCode,
                    notes: `Approved scholarship/discount on ${targetInvoice.invoiceNumber}: ${disc.reason}`,
                    createdById: actor.id,
                    lines: [
                      {
                        accountCode: "FEE_DISCOUNT",
                        direction: "DEBIT",
                        amountPaise: appliedToInvoice,
                      },
                      {
                        accountCode: "STUDENT_RECEIVABLES",
                        direction: "CREDIT",
                        amountPaise: appliedToInvoice,
                      },
                    ],
                  });
                }
              }
            }
          }

          return {
            result: disc,
            audit: auditBase(
              actor,
              input.decision === "APPROVED" ? "DISCOUNT_APPROVED" : "DISCOUNT_REJECTED",
              "DiscountRequest",
              disc.id,
              input.decisionNotes.trim(),
              before,
              {
                status: disc.status,
                approvedById: actor.id,
                amountPaise: disc.amountPaise,
              },
              input.requestId
            ),
          };
        },
        onPersistAudit
      );
    },

    listPayments() {
      return [...state.payments].sort(
        (a, b) => Date.parse(b.paymentDate) - Date.parse(a.paymentDate)
      );
    },

    getPaymentById(id) {
      const payment = state.payments.find((p) => p.id === id);
      if (!payment) throw new NotFoundError(`Payment ${id} not found.`);
      return payment;
    },

    recordPayment(actor, input) {
      assertPositivePaise(input.amountPaise, "payment.amountPaise");
      const normalizedRef = normalizeRef(input.externalReference || "");
      if (normalizedRef.length < 3) {
        throw new ValidationError("A payment reference number (minimum 3 characters) is required.");
      }

      // Idempotency rule: identical reference number cannot post twice!
      const dupPayment = state.payments.find(
        (p) =>
          p.verificationStatus !== "REVERSED" &&
          normalizeRef(p.externalReference) === normalizedRef
      );
      if (dupPayment) {
        throw new DuplicateReferenceError(input.externalReference.trim());
      }

      const dupRefund = state.refunds.find(
        (r) => r.externalReference && normalizeRef(r.externalReference) === normalizedRef
      );
      if (dupRefund) {
        throw new DuplicateReferenceError(input.externalReference.trim());
      }

      return runWithAtomicAudit(
        state,
        (draft) => {
          const stu = draft.students.find((s) => s.id === input.studentProfileId);
          if (!stu) throw new NotFoundError(`Student ${input.studentProfileId} not found.`);

          const openInvoices = draft.invoices
            .filter(
              (i) =>
                i.studentProfileId === stu.id &&
                i.status !== "VOID" &&
                i.status !== "DRAFT" &&
                i.netTotalPaise > i.paidAmountPaise
            )
            .sort((a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate));

          const maxOpenInvoiceUnpaid = sumPaise(
            openInvoices.map((i) => subtractPaise(i.netTotalPaise, i.paidAmountPaise))
          );

          if (maxOpenInvoiceUnpaid <= 0) {
            throw new ValidationError(
              `${stu.name} has zero unpaid balance on issued invoices. Issue a sent invoice before recording a payment.`
            );
          }

          if (input.amountPaise > maxOpenInvoiceUnpaid) {
            throw new ValidationError(
              `Payment amount (${input.amountPaise} paise) exceeds unpaid issued balance (${maxOpenInvoiceUnpaid} paise).`
            );
          }

          const stuInsts = draft.installments.filter((i) => i.studentProfileId === stu.id);
          const allocatedInst = allocatePaymentPaiseOldestFirst(input.amountPaise, stuInsts);
          const totalInstAllocated = sumPaise(allocatedInst.map((a) => a.allocatedPaise));
          if (totalInstAllocated <= 0) {
            throw new ValidationError("No unpaid instalments remain to allocate this payment.");
          }

          const paymentId = `pay-${Date.now()}-${draft.payments.length + 1}`;
          const txNum = `TXN-2026-${String(9021 + draft.payments.length)}`;
          const rcpNum = `RCP-2026-${String(9021 + draft.payments.length)}`;

          const beforeStudentRemaining = sumPaise(
            stuInsts.map((i) => i.remainingBalancePaise)
          );

          const allocRecords = allocatedInst.map((a, idx) => {
            const inst = stuInsts.find((x) => x.id === a.installmentId)!;
            inst.amountPaidPaise = addPaise(inst.amountPaidPaise, a.allocatedPaise);
            inst.remainingBalancePaise = a.newRemainingBalancePaise;
            inst.lastPaymentDate = input.paymentDate;
            inst.status = a.newRemainingBalancePaise === 0 ? "PAID" : "PARTIALLY_PAID";
            return {
              id: `alloc-${paymentId}-${idx + 1}`,
              paymentId,
              installmentId: a.installmentId,
              installmentNumber: a.installmentNumber,
              dueDate: a.dueDate,
              allocatedPaise: a.allocatedPaise,
            };
          });

          // Apply payment to specified invoice first (if any), then remaining open invoices oldest-first
          let remainingToApplyToInvoices = input.amountPaise;
          let primaryInvoiceId: string | null = null;
          const orderedInvoices = input.invoiceId
            ? [
                ...openInvoices.filter((i) => i.id === input.invoiceId),
                ...openInvoices.filter((i) => i.id !== input.invoiceId),
              ]
            : openInvoices;

          for (const inv of orderedInvoices) {
            if (remainingToApplyToInvoices <= 0) break;
            const unpaid = subtractPaise(inv.netTotalPaise, inv.paidAmountPaise);
            if (unpaid <= 0) continue;
            const credit = Math.min(remainingToApplyToInvoices, unpaid);
            inv.paidAmountPaise = addPaise(inv.paidAmountPaise, credit);
            if (inv.paidAmountPaise >= inv.netTotalPaise) inv.status = "PAID";
            if (!primaryInvoiceId) primaryInvoiceId = inv.id;
            remainingToApplyToInvoices = subtractPaise(remainingToApplyToInvoices, credit);
          }

          const balanceRemainingAfterPaise = sumPaise(
            stuInsts.map((i) => i.remainingBalancePaise)
          );

          const payment: PaymentRecord = {
            id: paymentId,
            transactionNumber: txNum,
            receiptNumber: rcpNum,
            studentProfileId: stu.id,
            studentName: stu.name,
            studentEmail: stu.email,
            registrationNumber: stu.registrationNumber,
            feeAgreementId: stu.feeAgreementId,
            invoiceId: primaryInvoiceId,
            batchId: stu.batchId,
            batchCode: stu.batchCode,
            trackCode: stu.trackCode,
            trackTitle: stu.trackTitle,
            amountPaise: input.amountPaise,
            refundedPaise: 0,
            currency: "INR",
            paymentMethod: input.paymentMethod,
            paymentDate: input.paymentDate,
            externalReference: input.externalReference.trim(),
            verificationStatus: "CONFIRMED",
            collectedById: actor.id,
            notes: input.notes ?? null,
            allocations: allocRecords,
            balanceRemainingAfterPaise,
          };

          draft.payments.unshift(payment);

          const debitAccount = paymentMethodToAccountCode(input.paymentMethod);
          postBalancedJournalInDraft(draft, {
            entryDate: input.paymentDate,
            transactionType: "PAYMENT",
            referenceType: "StudentPayment",
            referenceId: payment.id,
            studentProfileId: stu.id,
            batchId: stu.batchId,
            trackCode: stu.trackCode,
            notes: `${input.paymentMethod} receipt ${rcpNum} (${payment.externalReference})`,
            createdById: actor.id,
            lines: [
              {
                accountCode: debitAccount,
                direction: "DEBIT",
                amountPaise: input.amountPaise,
              },
              {
                accountCode: "STUDENT_RECEIVABLES",
                direction: "CREDIT",
                amountPaise: input.amountPaise,
              },
            ],
          });

          return {
            result: payment,
            audit: auditBase(
              actor,
              "PAYMENT_RECORDED",
              "StudentPayment",
              payment.id,
              `${input.paymentMethod} ref ${payment.externalReference} allocated oldest-first`,
              { studentRemainingPaise: beforeStudentRemaining },
              {
                studentRemainingPaise: balanceRemainingAfterPaise,
                amountPaise: payment.amountPaise,
                receiptNumber: payment.receiptNumber,
                externalReference: payment.externalReference,
              },
              input.requestId
            ),
          };
        },
        onPersistAudit
      );
    },

    listRefunds() {
      return [...state.refunds].sort(
        (a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt)
      );
    },

    requestRefund(actor, input) {
      assertPositivePaise(input.amountPaise, "refund.amountPaise");
      if (!input.reason || input.reason.trim().length < 5) {
        throw new ValidationError("Refund requests require a reason of at least 5 characters.");
      }

      return runWithAtomicAudit(
        state,
        (draft) => {
          const payment = draft.payments.find((p) => p.id === input.paymentId);
          if (!payment) throw new NotFoundError(`Payment ${input.paymentId} not found.`);
          const refundableLeft = subtractPaise(payment.amountPaise, payment.refundedPaise);
          if (input.amountPaise > refundableLeft) {
            throw new ValidationError(
              `Requested refund (${input.amountPaise} paise) exceeds refundable balance (${refundableLeft} paise).`
            );
          }

          const refRecord: RefundRecord = {
            id: `ref-${Date.now()}-${draft.refunds.length + 1}`,
            paymentId: payment.id,
            paymentReference: payment.externalReference,
            studentProfileId: payment.studentProfileId,
            studentName: payment.studentName,
            batchCode: payment.batchCode,
            amountPaise: input.amountPaise,
            refundMethod: input.refundMethod,
            reason: input.reason.trim(),
            status: "REQUESTED",
            requestedById: actor.id,
            requestedByName: actor.name,
            requestedAt: nowIso(),
            approvedById: null,
            approvedByName: null,
            approvedAt: null,
            executedById: null,
            executedAt: null,
            externalReference: null,
            ledgerEntryId: null,
          };

          draft.refunds.unshift(refRecord);

          return {
            result: refRecord,
            audit: auditBase(
              actor,
              "REFUND_REQUESTED",
              "RefundRequest",
              refRecord.id,
              refRecord.reason,
              { refundableLeftPaise: refundableLeft },
              {
                paymentId: payment.id,
                amountPaise: refRecord.amountPaise,
                status: refRecord.status,
              },
              input.requestId
            ),
          };
        },
        onPersistAudit
      );
    },

    decideRefund(actor, input) {
      return runWithAtomicAudit(
        state,
        (draft) => {
          const refund = draft.refunds.find((r) => r.id === input.refundId);
          if (!refund) throw new NotFoundError(`Refund ${input.refundId} not found.`);
          if (refund.status !== "REQUESTED") {
            throw new ConflictStateError(`Refund ${refund.id} is already ${refund.status}.`);
          }
          if (refund.requestedById === actor.id) {
            throw new DualControlViolationError(
              "Dual-control violation: refund approver must be different from the requester."
            );
          }

          const before = { status: refund.status, approvedById: refund.approvedById };
          refund.status = input.decision;
          refund.approvedById = actor.id;
          refund.approvedByName = actor.name;
          refund.approvedAt = nowIso();

          return {
            result: refund,
            audit: auditBase(
              actor,
              input.decision === "APPROVED" ? "REFUND_APPROVED" : "REFUND_REJECTED",
              "RefundRequest",
              refund.id,
              input.reason || `Refund ${input.decision.toLowerCase()} by ${actor.name}`,
              before,
              { status: refund.status, approvedById: actor.id },
              input.requestId
            ),
          };
        },
        onPersistAudit
      );
    },

    executeRefund(actor, input) {
      const normalizedRef = normalizeRef(input.externalReference || "");
      if (normalizedRef.length < 3) {
        throw new ValidationError("Refund execution requires an external payout reference.");
      }

      // Idempotency: duplicate payout reference cannot post twice!
      const dupPay = state.payments.find(
        (p) => normalizeRef(p.externalReference) === normalizedRef
      );
      const dupRef = state.refunds.find(
        (r) => r.externalReference && normalizeRef(r.externalReference) === normalizedRef
      );
      if (dupPay || dupRef) {
        throw new DuplicateReferenceError(input.externalReference.trim());
      }

      return runWithAtomicAudit(
        state,
        (draft) => {
          const refund = draft.refunds.find((r) => r.id === input.refundId);
          if (!refund) throw new NotFoundError(`Refund ${input.refundId} not found.`);
          if (refund.status === "EXECUTED") {
            throw new ConflictStateError(`Refund ${refund.id} has already been executed.`);
          }
          if (refund.status !== "APPROVED") {
            throw new ConflictStateError(
              `Refund ${refund.id} must be APPROVED before execution (current: ${refund.status}).`
            );
          }

          const payment = draft.payments.find((p) => p.id === refund.paymentId)!;
          const remainingRefundable = subtractPaise(payment.amountPaise, payment.refundedPaise);
          if (refund.amountPaise > remainingRefundable) {
            throw new ConflictStateError("Refund exceeds remaining non-refunded payment amount.");
          }

          const before = {
            refundStatus: refund.status,
            paymentRefundedPaise: payment.refundedPaise,
          };

          const execTime = nowIso();
          refund.status = "EXECUTED";
          refund.executedById = actor.id;
          refund.executedAt = execTime;
          refund.externalReference = input.externalReference.trim();

          payment.refundedPaise = addPaise(payment.refundedPaise, refund.amountPaise);
          payment.verificationStatus =
            payment.refundedPaise >= payment.amountPaise ? "REFUNDED" : "PARTIALLY_REFUNDED";

          // Restore unpaid balance on instalments (reverse newest allocation first)
          let toRestore = refund.amountPaise;
          for (const alloc of [...payment.allocations].reverse()) {
            if (toRestore <= 0) break;
            const inst = draft.installments.find((i) => i.id === alloc.installmentId);
            if (!inst) continue;
            const delta = Math.min(toRestore, inst.amountPaidPaise);
            inst.amountPaidPaise = subtractPaise(inst.amountPaidPaise, delta);
            inst.remainingBalancePaise = addPaise(inst.remainingBalancePaise, delta);
            inst.status =
              Date.parse(inst.dueDate) < Date.parse(execTime) ? "OVERDUE" : "PARTIALLY_PAID";
            toRestore = subtractPaise(toRestore, delta);
          }

          // Restore unpaid balance on associated invoice
          if (payment.invoiceId) {
            const inv = draft.invoices.find((i) => i.id === payment.invoiceId);
            if (inv && inv.status !== "VOID") {
              inv.paidAmountPaise = Math.max(0, subtractPaise(inv.paidAmountPaise, refund.amountPaise));
              inv.status = Date.parse(inv.dueDate) < Date.parse(execTime) ? "OVERDUE" : "SENT";
            }
          }

          const creditAccount = paymentMethodToAccountCode(refund.refundMethod);
          const entry = postBalancedJournalInDraft(draft, {
            entryDate: execTime,
            transactionType: "REFUND",
            referenceType: "RefundRequest",
            referenceId: refund.id,
            studentProfileId: refund.studentProfileId,
            batchId: payment.batchId,
            trackCode: payment.trackCode,
            notes: `Refund executed (${refund.externalReference}): ${refund.reason}`,
            createdById: actor.id,
            lines: [
              {
                accountCode: "STUDENT_RECEIVABLES",
                direction: "DEBIT",
                amountPaise: refund.amountPaise,
              },
              {
                accountCode: creditAccount,
                direction: "CREDIT",
                amountPaise: refund.amountPaise,
              },
            ],
          });

          refund.ledgerEntryId = entry.id;

          return {
            result: refund,
            audit: auditBase(
              actor,
              "REFUND_EXECUTED",
              "RefundRequest",
              refund.id,
              input.reason || refund.reason,
              before,
              {
                refundStatus: refund.status,
                externalReference: refund.externalReference,
                paymentRefundedPaise: payment.refundedPaise,
                ledgerEntryId: entry.id,
              },
              input.requestId
            ),
          };
        },
        onPersistAudit
      );
    },

    getLedgerView(filters) {
      const fromMs = filters?.fromDate ? Date.parse(filters.fromDate) : null;
      const toMs = filters?.toDate ? Date.parse(filters.toDate) : null;

      const filtered = state.journalEntries.filter((entry) => {
        const ms = Date.parse(entry.entryDate);
        if (fromMs !== null && !Number.isNaN(fromMs) && ms < fromMs) return false;
        if (toMs !== null && !Number.isNaN(toMs) && ms > toMs + 86_399_999) return false;
        if (filters?.studentProfileId) {
          const matchesStu = entry.lines.some((l) => l.studentProfileId === filters.studentProfileId);
          if (!matchesStu) return false;
        }
        if (filters?.accountCode) {
          const matchesAcct = entry.lines.some((l) => l.accountCode === filters.accountCode);
          if (!matchesAcct) return false;
        }
        return true;
      });

      return {
        entries: filtered,
        accountBalances: computeAccountBalances(state.journalEntries, filters),
        trialBalance: verifyTrialBalance(state.journalEntries),
        accountsMeta: LEDGER_ACCOUNT_META,
      };
    },

    getLedgerAccountDetail(accountCode, filters) {
      const meta = LEDGER_ACCOUNT_META[accountCode];
      if (!meta) throw new NotFoundError(`Ledger account ${accountCode} not found.`);
      const summaryList = computeAccountBalances(state.journalEntries, {
        ...filters,
        accountCode,
      });
      const summary = summaryList[0];

      const fromMs = filters?.fromDate ? Date.parse(filters.fromDate) : null;
      const toMs = filters?.toDate ? Date.parse(filters.toDate) : null;
      const studentMap = new Map(state.students.map((s) => [s.id, s.name]));

      const lines = state.journalEntries
        .flatMap((e) => e.lines)
        .filter((l) => {
          if (l.accountCode !== accountCode) return false;
          const ms = Date.parse(l.entryDate);
          if (fromMs !== null && !Number.isNaN(fromMs) && ms < fromMs) return false;
          if (toMs !== null && !Number.isNaN(toMs) && ms > toMs + 86_399_999) return false;
          if (filters?.studentProfileId && l.studentProfileId !== filters.studentProfileId) {
            return false;
          }
          return true;
        })
        .map((l) => ({
          ...l,
          studentName: l.studentProfileId ? studentMap.get(l.studentProfileId) ?? null : null,
        }));

      return {
        account: meta,
        summary,
        lines,
      };
    },

    reverseJournalEntry(actor, entryId, reason, requestId) {
      return runWithAtomicAudit(
        state,
        (draft) => {
          const original = draft.journalEntries.find((e) => e.id === entryId);
          if (!original) throw new NotFoundError(`Journal entry ${entryId} not found.`);
          const before = {
            id: original.id,
            entryNumber: original.entryNumber,
            reversedByEntryId: original.reversedByEntryId,
          };

          const seq = draft.journalEntries.length + 1;
          const counter = buildCounterEntryReversal({
            original,
            newEntryId: `je-${Date.now()}-${seq}`,
            newEntryNumber: `JE-2026-${String(seq + 100).padStart(4, "0")}`,
            reversalDate: nowIso(),
            reason,
            createdById: actor.id,
          });

          original.reversedByEntryId = counter.id;
          draft.journalEntries.unshift(counter);

          return {
            result: counter,
            audit: auditBase(
              actor,
              "LEDGER_COUNTER_ENTRY_REVERSAL",
              "JournalEntry",
              original.id,
              reason.trim(),
              before,
              { reversedByEntryId: counter.id, reversalEntryNumber: counter.entryNumber },
              requestId
            ),
          };
        },
        onPersistAudit
      );
    },

    exportLedgerCsv(filters) {
      return generateLedgerCsv(state, filters);
    },

    listPayrollRuns() {
      return [...state.payrollRuns].sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
      );
    },

    getPayrollRunById(id) {
      const run = state.payrollRuns.find((r) => r.id === id);
      if (!run) throw new NotFoundError(`Payroll run ${id} not found.`);
      return run;
    },

    createPayrollRun(actor, input) {
      if (!input.periodName || input.periodName.trim().length < 3) {
        throw new ValidationError("Payroll period name is required.");
      }
      const startMs = Date.parse(input.startDate);
      const endMs = Date.parse(input.endDate);
      if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
        throw new ValidationError("Valid startDate and endDate (end >= start) are required.");
      }

      return runWithAtomicAudit(
        state,
        (draft) => {
          const runId = `pr-${Date.now()}-${draft.payrollRuns.length + 1}`;
          const runNumber = nextSequence("PR-2026", draft.payrollRuns, 2);

          const payouts = draft.trainers.map((t, idx) => {
            const tSessions = draft.sessions.filter((s) => {
              const ms = Date.parse(s.sessionDate);
              return s.trainerProfileId === t.id && ms >= startMs && ms <= endMs + 86_399_999;
            });
            const comp = calculateTrainerBatchPayrollPaise({
              policyType: t.policyType,
              applicableRatePaise: t.baseRatePaise,
              sessions: tSessions,
              adjustments: [],
            });
            return {
              id: `${runId}-po-${idx + 1}`,
              payrollRunId: runId,
              trainerProfileId: t.id,
              trainerName: t.name,
              employeeCode: t.employeeCode,
              policyType: t.policyType,
              applicableRatePaise: t.baseRatePaise,
              eligibleSessionsCount: comp.eligibleSessionsCount,
              verifiedMinutes: comp.verifiedMinutes,
              baseAmountPaise: comp.baseAmountPaise,
              bonusPaise: comp.bonusPaise,
              deductionPaise: comp.deductionPaise,
              totalPayablePaise: comp.totalPayablePaise,
              paidAt: null,
              payslipNumber: `PSL-2026-${draft.payrollRuns.length + 1}${idx + 1}`,
              batchBreakdowns: comp.batchBreakdowns,
              adjustments: [],
            };
          });

          const newRun: PayrollRunRecord = {
            id: runId,
            runNumber,
            periodName: input.periodName.trim(),
            startDate: input.startDate,
            endDate: input.endDate,
            status: "DRAFT",
            createdById: actor.id,
            createdAt: nowIso(),
            reviewedById: null,
            reviewedAt: null,
            approvedById: null,
            approvedAt: null,
            paidById: null,
            paidAt: null,
            totalBasePaise: sumPaise(payouts.map((p) => p.baseAmountPaise)),
            totalAdjustmentNetPaise: 0,
            totalPayablePaise: sumPaise(payouts.map((p) => p.totalPayablePaise)),
            payouts,
          };

          draft.payrollRuns.unshift(newRun);

          return {
            result: newRun,
            audit: auditBase(
              actor,
              "PAYROLL_RUN_CREATED",
              "PayrollRun",
              newRun.id,
              `Computed payroll run ${runNumber} from held non-cancelled sessions`,
              null,
              {
                runNumber: newRun.runNumber,
                status: newRun.status,
                totalPayablePaise: newRun.totalPayablePaise,
              },
              input.requestId
            ),
          };
        },
        onPersistAudit
      );
    },

    transitionPayrollRun(actor, runId, nextStatus, reason, requestId) {
      return runWithAtomicAudit(
        state,
        (draft) => {
          const run = draft.payrollRuns.find((r) => r.id === runId);
          if (!run) throw new NotFoundError(`Payroll run ${runId} not found.`);
          assertValidPayrollTransition(run.status, nextStatus);

          const before = {
            status: run.status,
            approvedById: run.approvedById,
            paidById: run.paidById,
          };

          const ts = nowIso();
          if (nextStatus === "REVIEW") {
            run.reviewedById = actor.id;
            run.reviewedAt = ts;
          } else if (nextStatus === "APPROVED") {
            run.approvedById = actor.id;
            run.approvedAt = ts;
            // Accrue trainer payable vs operating expense per batch
            for (const po of run.payouts) {
              for (const bb of po.batchBreakdowns) {
                if (bb.totalCostPaise <= 0) continue;
                postBalancedJournalInDraft(draft, {
                  entryDate: ts,
                  transactionType: "EXPENSE",
                  referenceType: "PayrollRun",
                  referenceId: run.id,
                  batchId: bb.batchId,
                  trackCode: bb.trackCode,
                  notes: `Payroll accrual ${run.runNumber}: ${po.trainerName} (${bb.batchCode})`,
                  createdById: actor.id,
                  lines: [
                    {
                      accountCode: "OPERATING_EXPENSE",
                      direction: "DEBIT",
                      amountPaise: bb.totalCostPaise,
                      batchId: bb.batchId,
                      trackCode: bb.trackCode,
                    },
                    {
                      accountCode: "TRAINER_PAYABLE",
                      direction: "CREDIT",
                      amountPaise: bb.totalCostPaise,
                      batchId: bb.batchId,
                      trackCode: bb.trackCode,
                    },
                  ],
                });
              }
            }
          } else if (nextStatus === "PAID") {
            run.paidById = actor.id;
            run.paidAt = ts;
            for (const po of run.payouts) {
              po.paidAt = ts;
              for (const bb of po.batchBreakdowns) {
                if (bb.totalCostPaise <= 0) continue;
                postBalancedJournalInDraft(draft, {
                  entryDate: ts,
                  transactionType: "TRAINER_PAYOUT",
                  referenceType: "PayrollRun",
                  referenceId: run.id,
                  batchId: bb.batchId,
                  trackCode: bb.trackCode,
                  notes: `Payroll disbursed ${run.runNumber}: ${po.trainerName} (${bb.batchCode})`,
                  createdById: actor.id,
                  lines: [
                    {
                      accountCode: "TRAINER_PAYABLE",
                      direction: "DEBIT",
                      amountPaise: bb.totalCostPaise,
                      batchId: bb.batchId,
                      trackCode: bb.trackCode,
                    },
                    {
                      accountCode: "BANK",
                      direction: "CREDIT",
                      amountPaise: bb.totalCostPaise,
                      batchId: bb.batchId,
                      trackCode: bb.trackCode,
                    },
                  ],
                });
              }
            }
          } else if (nextStatus === "DRAFT") {
            run.reviewedById = null;
            run.reviewedAt = null;
          }

          run.status = nextStatus;

          return {
            result: run,
            audit: auditBase(
              actor,
              "PAYROLL_RUN_TRANSITION",
              "PayrollRun",
              run.id,
              reason || `Transitioned payroll run ${run.runNumber} to ${nextStatus}`,
              before,
              { status: run.status, totalPayablePaise: run.totalPayablePaise },
              requestId
            ),
          };
        },
        onPersistAudit
      );
    },

    addPayrollAdjustment(actor, input) {
      validatePayrollAdjustmentInput({
        type: input.type,
        amountPaise: input.amountPaise,
        reason: input.reason,
        requesterId: actor.id,
      });

      return runWithAtomicAudit(
        state,
        (draft) => {
          const run = draft.payrollRuns.find((r) => r.id === input.payrollRunId);
          if (!run) throw new NotFoundError(`Payroll run ${input.payrollRunId} not found.`);
          if (run.status === "APPROVED" || run.status === "PAID") {
            throw new ConflictStateError(
              `Cannot adjust payroll run ${run.runNumber} once it is ${run.status}.`
            );
          }

          const payout = run.payouts.find((p) => p.id === input.trainerPayoutId);
          if (!payout) {
            throw new NotFoundError(`Trainer payout ${input.trainerPayoutId} not found.`);
          }

          const adj: PayrollAdjustmentRecord = {
            id: `padj-${Date.now()}-${payout.adjustments.length + 1}`,
            trainerPayoutId: payout.id,
            payrollRunId: run.id,
            type: input.type,
            amountPaise: input.amountPaise,
            reason: input.reason.trim(),
            status: "PENDING",
            requestedById: actor.id,
            requestedByName: actor.name,
            requestedAt: nowIso(),
            approvedById: null,
            approvedByName: null,
            decidedAt: null,
          };
          payout.adjustments.unshift(adj);

          return {
            result: adj,
            audit: auditBase(
              actor,
              "PAYROLL_ADJUSTMENT_REQUESTED",
              "PayrollAdjustment",
              adj.id,
              adj.reason,
              null,
              {
                payrollRunId: run.id,
                trainerPayoutId: payout.id,
                type: adj.type,
                amountPaise: adj.amountPaise,
                status: adj.status,
              },
              input.requestId
            ),
          };
        },
        onPersistAudit
      );
    },

    decidePayrollAdjustment(actor, input) {
      return runWithAtomicAudit(
        state,
        (draft) => {
          const run = draft.payrollRuns.find((r) => r.id === input.payrollRunId);
          if (!run) throw new NotFoundError(`Payroll run ${input.payrollRunId} not found.`);
          if (run.status === "APPROVED" || run.status === "PAID") {
            throw new ConflictStateError(`Cannot decide adjustments on ${run.status} payroll run.`);
          }

          let targetPayout: PayrollRunRecord["payouts"][number] | undefined;
          let targetAdj: PayrollAdjustmentRecord | undefined;
          for (const po of run.payouts) {
            const found = po.adjustments.find((a) => a.id === input.adjustmentId);
            if (found) {
              targetPayout = po;
              targetAdj = found;
              break;
            }
          }

          if (!targetPayout || !targetAdj) {
            throw new NotFoundError(`Adjustment ${input.adjustmentId} not found.`);
          }
          if (targetAdj.status !== "PENDING") {
            throw new ConflictStateError(`Adjustment ${targetAdj.id} is already ${targetAdj.status}.`);
          }
          if (targetAdj.requestedById === actor.id) {
            throw new DualControlViolationError(
              "Dual-control violation: payroll adjustment approver must differ from the requester."
            );
          }

          const before = {
            status: targetAdj.status,
            payoutTotalPaise: targetPayout.totalPayablePaise,
          };

          targetAdj.status = input.decision;
          targetAdj.approvedById = actor.id;
          targetAdj.approvedByName = actor.name;
          targetAdj.decidedAt = nowIso();

          if (input.decision === "APPROVED") {
            const pStart = Date.parse(run.startDate);
            const pEnd = Date.parse(run.endDate);
            const tSessions = draft.sessions.filter((s) => {
              const ms = Date.parse(s.sessionDate);
              return (
                s.trainerProfileId === targetPayout!.trainerProfileId &&
                ms >= pStart &&
                ms <= pEnd + 86_399_999
              );
            });
            const recomputed = calculateTrainerBatchPayrollPaise({
              policyType: targetPayout.policyType,
              applicableRatePaise: targetPayout.applicableRatePaise,
              sessions: tSessions,
              adjustments: targetPayout.adjustments,
            });
            targetPayout.bonusPaise = recomputed.bonusPaise;
            targetPayout.deductionPaise = recomputed.deductionPaise;
            targetPayout.totalPayablePaise = recomputed.totalPayablePaise;
            targetPayout.batchBreakdowns = recomputed.batchBreakdowns;

            run.totalAdjustmentNetPaise = sumPaise(
              run.payouts.map((p) => subtractPaise(p.bonusPaise, p.deductionPaise))
            );
            run.totalPayablePaise = sumPaise(run.payouts.map((p) => p.totalPayablePaise));
          }

          return {
            result: targetAdj,
            audit: auditBase(
              actor,
              input.decision === "APPROVED"
                ? "PAYROLL_ADJUSTMENT_APPROVED"
                : "PAYROLL_ADJUSTMENT_REJECTED",
              "PayrollAdjustment",
              targetAdj.id,
              targetAdj.reason,
              before,
              {
                status: targetAdj.status,
                payoutTotalPaise: targetPayout.totalPayablePaise,
                runTotalPayablePaise: run.totalPayablePaise,
              },
              input.requestId
            ),
          };
        },
        onPersistAudit
      );
    },

    getCollectionsView() {
      const asOfIso = nowIso();
      refreshOverdueFlags(state, asOfIso);
      return {
        ageing: computeCollectionsAgeingReport(state, asOfIso),
        notes: [...state.followUpNotes].sort(
          (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)
        ),
        notifications: [...state.notifications].sort(
          (a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt)
        ),
      };
    },

    recordFeeReminderSent(actor, studentProfileId, dispatchResult, requestId) {
      return runWithAtomicAudit(
        state,
        (draft) => {
          const stu = draft.students.find((s) => s.id === studentProfileId);
          if (!stu) throw new NotFoundError(`Student ${studentProfileId} not found.`);

          const notification: NotificationDispatchRecord = {
            id: `notif-${Date.now()}-${draft.notifications.length + 1}`,
            studentProfileId: stu.id,
            recipientEmail: stu.email,
            kind: "FEE_REMINDER",
            subject: dispatchResult.subject,
            provider: dispatchResult.provider,
            providerId: dispatchResult.providerId,
            status: dispatchResult.status,
            sentById: actor.id,
            sentAt: nowIso(),
          };
          draft.notifications.unshift(notification);

          return {
            result: notification,
            audit: auditBase(
              actor,
              "COLLECTIONS_REMINDER_SENT",
              "StudentProfile",
              stu.id,
              `Sent fee reminder via ${dispatchResult.provider} (${stu.email})`,
              null,
              {
                recipientEmail: stu.email,
                providerStatus: dispatchResult.status,
                subject: dispatchResult.subject,
              },
              requestId
            ),
          };
        },
        onPersistAudit
      );
    },

    addFollowUpNote(actor, input) {
      if (!input.note || input.note.trim().length < 4) {
        throw new ValidationError("Follow-up note must contain at least 4 characters.");
      }

      return runWithAtomicAudit(
        state,
        (draft) => {
          const stu = draft.students.find((s) => s.id === input.studentProfileId);
          if (!stu) throw new NotFoundError(`Student ${input.studentProfileId} not found.`);

          const rec: FollowUpNoteRecord = {
            id: `note-${Date.now()}-${draft.followUpNotes.length + 1}`,
            studentProfileId: stu.id,
            studentName: stu.name,
            channel: input.channel,
            note: input.note.trim(),
            nextFollowUpDate: input.nextFollowUpDate ?? null,
            createdById: actor.id,
            createdByName: actor.name,
            createdAt: nowIso(),
          };
          draft.followUpNotes.unshift(rec);

          return {
            result: rec,
            audit: auditBase(
              actor,
              "COLLECTIONS_NOTE_ADDED",
              "FollowUpNote",
              rec.id,
              `${rec.channel}: ${rec.note}`,
              null,
              { studentProfileId: stu.id, channel: rec.channel, note: rec.note },
              input.requestId
            ),
          };
        },
        onPersistAudit
      );
    },

    getReportsView() {
      const asOfIso = nowIso();
      refreshOverdueFlags(state, asOfIso);
      return computeReportsSummary(state, asOfIso);
    },

    exportReportCsv(kind) {
      const asOfIso = nowIso();
      if (kind === "ageing") return generateAgeingCsv(state, asOfIso);
      return generatePayrollVsRevenueCsv(state, asOfIso);
    },

    listAuditLogs(filters) {
      return state.auditLogs
        .filter((log) => {
          if (filters?.entityType && log.entityType !== filters.entityType) return false;
          if (filters?.actorId && log.actorId !== filters.actorId) return false;
          if (
            filters?.action &&
            !log.action.toLowerCase().includes(filters.action.toLowerCase())
          ) {
            return false;
          }
          return true;
        })
        .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
    },
  };

  return store;
}
