export type FinanceRole = "FINANCIER" | "ADMIN" | "MANAGER" | "TRAINER" | "STUDENT";

export type LedgerAccountType = "ASSET" | "LIABILITY" | "REVENUE" | "EXPENSE";

export type LedgerAccountCode =
  | "STUDENT_RECEIVABLES"
  | "CASH"
  | "BANK"
  | "PAYMENT_GATEWAY"
  | "TRAINER_PAYABLE"
  | "OPERATING_EXPENSE"
  | "FEE_DISCOUNT"
  | "REVENUE";

export type LedgerDirection = "DEBIT" | "CREDIT";

export type JournalTransactionType =
  | "CHARGE"
  | "PAYMENT"
  | "PAYMENT_ALLOCATION"
  | "DISCOUNT"
  | "ADJUSTMENT"
  | "REFUND"
  | "REVERSAL"
  | "WRITE_OFF"
  | "TRAINER_PAYOUT"
  | "EXPENSE";

export interface JournalLineInput {
  accountCode: LedgerAccountCode;
  direction: LedgerDirection;
  amountPaise: number;
  studentProfileId?: string | null;
  batchId?: string | null;
  trackCode?: string | null;
  notes?: string | null;
}

export interface JournalEntryLine {
  id: string;
  journalEntryId: string;
  entryNumber: string;
  entryDate: string;
  transactionType: JournalTransactionType;
  direction: LedgerDirection;
  amountPaise: number;
  currency: "INR";
  accountCode: LedgerAccountCode;
  referenceType: string;
  referenceId: string;
  studentProfileId: string | null;
  batchId: string | null;
  trackCode: string | null;
  notes: string | null;
  createdById: string;
  reversesEntryId: string | null;
  reversedByEntryId: string | null;
}

export interface BalancedJournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  transactionType: JournalTransactionType;
  referenceType: string;
  referenceId: string;
  studentProfileId: string | null;
  batchId: string | null;
  trackCode: string | null;
  notes: string | null;
  createdById: string;
  reversesEntryId: string | null;
  reversedByEntryId: string | null;
  lines: JournalEntryLine[];
}

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOID";

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPricePaise: number;
  totalPaise: number;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  studentProfileId: string;
  studentName: string;
  studentEmail: string;
  registrationNumber: string;
  batchId: string;
  batchCode: string;
  trackCode: string;
  trackTitle: string;
  feeAgreementId: string;
  issueDate: string;
  dueDate: string;
  grossAmountPaise: number;
  discountAmountPaise: number;
  taxAmountPaise: number;
  netTotalPaise: number;
  paidAmountPaise: number;
  currency: "INR";
  status: InvoiceStatus;
  notes: string | null;
  sentAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdById: string;
  lines: InvoiceLineItem[];
}

export type PaymentMethod = "CASH" | "UPI" | "BANK_TRANSFER" | "CARD";

export interface PaymentAllocationRecord {
  id: string;
  paymentId: string;
  installmentId: string;
  installmentNumber: number;
  dueDate: string;
  allocatedPaise: number;
}

export interface PaymentRecord {
  id: string;
  transactionNumber: string;
  receiptNumber: string;
  studentProfileId: string;
  studentName: string;
  studentEmail: string;
  registrationNumber: string;
  feeAgreementId: string;
  invoiceId: string | null;
  batchId: string;
  batchCode: string;
  trackCode: string;
  trackTitle: string;
  amountPaise: number;
  refundedPaise: number;
  currency: "INR";
  paymentMethod: PaymentMethod;
  paymentDate: string;
  externalReference: string;
  verificationStatus: "CONFIRMED" | "REFUNDED" | "PARTIALLY_REFUNDED" | "REVERSED";
  collectedById: string;
  notes: string | null;
  allocations: PaymentAllocationRecord[];
  balanceRemainingAfterPaise: number;
}

export interface InstallmentRecord {
  id: string;
  feeAgreementId: string;
  studentProfileId: string;
  installmentNumber: number;
  dueDate: string;
  amountDuePaise: number;
  amountPaidPaise: number;
  remainingBalancePaise: number;
  status: "UPCOMING" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";
  lastPaymentDate: string | null;
}

export interface DiscountRequestRecord {
  id: string;
  studentProfileId: string;
  studentName: string;
  feeAgreementId: string;
  invoiceId: string | null;
  kind: "FIXED" | "PERCENTAGE";
  basisPoints: number | null;
  amountPaise: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  approvedById: string | null;
  approvedByName: string | null;
  decidedAt: string | null;
  decisionNotes: string | null;
}

export interface RefundRecord {
  id: string;
  paymentId: string;
  paymentReference: string;
  studentProfileId: string;
  studentName: string;
  batchCode: string;
  amountPaise: number;
  refundMethod: PaymentMethod;
  reason: string;
  status: "REQUESTED" | "APPROVED" | "EXECUTED" | "REJECTED";
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  approvedById: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  executedById: string | null;
  executedAt: string | null;
  externalReference: string | null;
  ledgerEntryId: string | null;
}

export type PayrollRunStatus = "DRAFT" | "REVIEW" | "APPROVED" | "PAID";
export type CompensationPolicyType = "MONTHLY_SALARY" | "PER_SESSION" | "PER_HOUR";
export type AdjustmentType = "BONUS" | "DEDUCTION" | "SUBSTITUTION_FEE" | "TAX_WITHHOLDING";

export interface HeldClassSessionRecord {
  id: string;
  trainerProfileId: string;
  batchId: string;
  batchCode: string;
  trackCode: string;
  trackTitle: string;
  sessionDate: string;
  durationMinutes: number;
  sessionType: string;
  status: "HELD" | "CANCELLED" | "SCHEDULED";
  isLocked: boolean;
}

export interface PayrollAdjustmentRecord {
  id: string;
  trainerPayoutId: string;
  payrollRunId: string;
  type: AdjustmentType;
  amountPaise: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  approvedById: string | null;
  approvedByName: string | null;
  decidedAt: string | null;
}

export interface TrainerBatchBreakdownRecord {
  batchId: string;
  batchCode: string;
  trackCode: string;
  trackTitle: string;
  sessionsCount: number;
  verifiedMinutes: number;
  baseAmountPaise: number;
  allocatedAdjustmentPaise: number;
  totalCostPaise: number;
}

export interface TrainerPayoutRecord {
  id: string;
  payrollRunId: string;
  trainerProfileId: string;
  trainerName: string;
  employeeCode: string;
  policyType: CompensationPolicyType;
  applicableRatePaise: number;
  eligibleSessionsCount: number;
  verifiedMinutes: number;
  baseAmountPaise: number;
  bonusPaise: number;
  deductionPaise: number;
  totalPayablePaise: number;
  paidAt: string | null;
  payslipNumber: string;
  batchBreakdowns: TrainerBatchBreakdownRecord[];
  adjustments: PayrollAdjustmentRecord[];
}

export interface PayrollRunRecord {
  id: string;
  runNumber: string;
  periodName: string;
  startDate: string;
  endDate: string;
  status: PayrollRunStatus;
  createdById: string;
  createdAt: string;
  reviewedById: string | null;
  reviewedAt: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  paidById: string | null;
  paidAt: string | null;
  totalBasePaise: number;
  totalAdjustmentNetPaise: number;
  totalPayablePaise: number;
  payouts: TrainerPayoutRecord[];
}

export interface FollowUpNoteRecord {
  id: string;
  studentProfileId: string;
  studentName: string;
  channel: "CALL" | "EMAIL" | "WHATSAPP" | "IN_PERSON";
  note: string;
  nextFollowUpDate: string | null;
  createdById: string;
  createdByName: string;
  createdAt: string;
}

export interface NotificationDispatchRecord {
  id: string;
  studentProfileId: string;
  recipientEmail: string;
  kind: "INVOICE" | "FEE_REMINDER";
  subject: string;
  provider: string;
  providerId: string | null;
  status: "SENT" | "SIMULATED" | "FAILED";
  sentById: string;
  sentAt: string;
}

export interface AuditLogRecord {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: FinanceRole | "SYSTEM";
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  reason: string | null;
  requestId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export interface TrackRecord {
  code: string;
  title: string;
  defaultFeePaise: number;
}

export interface BatchRecord {
  id: string;
  code: string;
  trackCode: string;
  trackTitle: string;
  startDate: string;
  status: "ACTIVE" | "UPCOMING" | "CLOSED";
}

export interface TrainerProfileMock {
  id: string;
  userId: string;
  name: string;
  email: string;
  employeeCode: string;
  policyType: CompensationPolicyType;
  baseRatePaise: number;
}

export interface StudentFeeAccountRecord {
  id: string;
  userId: string;
  name: string;
  email: string;
  registrationNumber: string;
  batchId: string;
  batchCode: string;
  trackCode: string;
  trackTitle: string;
  feeAgreementId: string;
  courseFeePaise: number;
  approvedDiscountPaise: number;
  netPayablePaise: number;
  financialHold: boolean;
}

export interface ActorIdentity {
  id: string;
  name: string;
  email: string;
  role: FinanceRole;
}

export interface FinancierDatabaseState {
  currency: "INR";
  referenceNowIso: string;
  actors: ActorIdentity[];
  tracks: TrackRecord[];
  batches: BatchRecord[];
  trainers: TrainerProfileMock[];
  students: StudentFeeAccountRecord[];
  installments: InstallmentRecord[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  discounts: DiscountRequestRecord[];
  refunds: RefundRecord[];
  sessions: HeldClassSessionRecord[];
  payrollRuns: PayrollRunRecord[];
  journalEntries: BalancedJournalEntry[];
  followUpNotes: FollowUpNoteRecord[];
  notifications: NotificationDispatchRecord[];
  auditLogs: AuditLogRecord[];
}
