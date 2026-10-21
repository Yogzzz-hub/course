import { prisma } from "./prisma";

// Safe decimal arithmetic helpers (2 decimal places)
export function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

export function fromMinorUnits(minor: number): number {
  return roundCurrency(minor / 100);
}

export interface StudentFinancialSummary {
  feeAgreementId: string | null;
  currency: string;
  courseFee: number;
  approvedDiscounts: number;
  netPayable: number;
  confirmedPaid: number;
  pendingVerificationAmount: number;
  refundedAmount: number;
  netPaid: number;
  outstandingBalance: number;
  overdueAmount: number;
  financialHold: boolean;
  installments: Array<{
    id: string;
    installmentNumber: number;
    dueDate: Date;
    amountDue: number;
    amountPaid: number;
    remainingBalance: number;
    status: string;
    lastPaymentDate: Date | null;
  }>;
  nextInstallment: {
    id: string;
    installmentNumber: number;
    dueDate: Date;
    remainingBalance: number;
  } | null;
  paymentCount: number;
  receiptCount: number;
}

export async function calculateStudentFinancialSummary(
  studentProfileId: string,
  feeAgreementId?: string
): Promise<StudentFinancialSummary> {
  const whereAgreement: any = { studentProfileId };
  if (feeAgreementId) {
    whereAgreement.id = feeAgreementId;
  }

  // 1. Fetch fee agreement
  const agreement = await prisma.feeAgreement.findFirst({
    where: whereAgreement,
    orderBy: { createdAt: "desc" },
    include: {
      installments: {
        orderBy: { installmentNumber: "asc" },
      },
    },
  });

  // 2. Fetch all payments
  const payments = await prisma.studentPayment.findMany({
    where: {
      studentProfileId,
      ...(agreement ? { feeAgreementId: agreement.id } : {}),
    },
    include: {
      refunds: { where: { status: "CONFIRMED" } },
    },
  });

  // 3. Fetch admission to check financial hold status
  const admission = await prisma.admission.findFirst({
    where: { studentProfileId },
    select: { financialHold: true },
  });

  const currency = agreement?.currency || "INR";
  const courseFee = roundCurrency(agreement?.courseFee || agreement?.totalAgreedFee || 0);
  const approvedDiscounts = roundCurrency(agreement?.discountAmount || 0);
  const netPayable = roundCurrency(Math.max(0, (agreement?.totalAgreedFee || 0) - approvedDiscounts));

  let confirmedPaid = 0;
  let pendingVerificationAmount = 0;
  let refundedAmount = 0;

  for (const pay of payments) {
    if (pay.verificationStatus === "CONFIRMED") {
      confirmedPaid = roundCurrency(confirmedPaid + pay.amount);
      const payRefunds = pay.refunds.reduce((sum, r) => sum + r.amount, 0);
      refundedAmount = roundCurrency(refundedAmount + payRefunds);
    } else if (pay.verificationStatus === "PENDING_VERIFICATION") {
      pendingVerificationAmount = roundCurrency(pendingVerificationAmount + pay.amount);
    }
  }

  const netPaid = roundCurrency(Math.max(0, confirmedPaid - refundedAmount));
  const outstandingBalance = roundCurrency(Math.max(0, netPayable - netPaid));

  const now = new Date();
  let overdueAmount = 0;
  const installmentsList: StudentFinancialSummary["installments"] = [];
  let nextInstallment: StudentFinancialSummary["nextInstallment"] = null;

  if (agreement && agreement.installments.length > 0) {
    for (const inst of agreement.installments) {
      const isPastDue = new Date(inst.dueDate) < now && inst.remainingBalance > 0.01;
      let calculatedStatus = inst.status;

      if (inst.remainingBalance <= 0.01) {
        calculatedStatus = "PAID";
      } else if (inst.amountPaid > 0) {
        calculatedStatus = isPastDue ? "OVERDUE" : "PARTIALLY_PAID";
      } else {
        calculatedStatus = isPastDue ? "OVERDUE" : "UPCOMING";
      }

      if (isPastDue) {
        overdueAmount = roundCurrency(overdueAmount + inst.remainingBalance);
      }

      if (!nextInstallment && inst.remainingBalance > 0.01) {
        nextInstallment = {
          id: inst.id,
          installmentNumber: inst.installmentNumber,
          dueDate: inst.dueDate,
          remainingBalance: roundCurrency(inst.remainingBalance),
        };
      }

      installmentsList.push({
        id: inst.id,
        installmentNumber: inst.installmentNumber,
        dueDate: inst.dueDate,
        amountDue: roundCurrency(inst.amountDue),
        amountPaid: roundCurrency(inst.amountPaid),
        remainingBalance: roundCurrency(inst.remainingBalance),
        status: calculatedStatus,
        lastPaymentDate: inst.lastPaymentDate,
      });
    }
  }

  const receiptCount = await prisma.receipt.count({
    where: { studentProfileId, isVoid: false },
  });

  return {
    feeAgreementId: agreement?.id || null,
    currency,
    courseFee,
    approvedDiscounts,
    netPayable,
    confirmedPaid,
    pendingVerificationAmount,
    refundedAmount,
    netPaid,
    outstandingBalance,
    overdueAmount,
    financialHold: admission?.financialHold || false,
    installments: installmentsList,
    nextInstallment,
    paymentCount: payments.length,
    receiptCount,
  };
}

// Deterministic payment allocation logic across installments
export function calculatePaymentAllocations(
  paymentAmount: number,
  installments: Array<{ id: string; installmentNumber: number; remainingBalance: number }>
): Array<{ installmentId: string; allocatedAmount: number; newRemainingBalance: number }> {
  let unallocated = roundCurrency(paymentAmount);
  const allocations: Array<{
    installmentId: string;
    allocatedAmount: number;
    newRemainingBalance: number;
  }> = [];

  // Sort installments chronologically by installmentNumber
  const sorted = [...installments].sort((a, b) => a.installmentNumber - b.installmentNumber);

  for (const inst of sorted) {
    if (unallocated <= 0.001) break;
    if (inst.remainingBalance <= 0.001) continue;

    const toAllocate = roundCurrency(Math.min(unallocated, inst.remainingBalance));
    const newRemaining = roundCurrency(Math.max(0, inst.remainingBalance - toAllocate));

    allocations.push({
      installmentId: inst.id,
      allocatedAmount: toAllocate,
      newRemainingBalance: newRemaining,
    });

    unallocated = roundCurrency(unallocated - toAllocate);
  }

  return allocations;
}

// Generate unique transaction reference
export async function generateTransactionNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.studentPayment.count();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `PAY-${year}-${(count + 1).toString().padStart(4, "0")}-${randomSuffix}`;
}

// Generate unique receipt reference
export async function generateReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.receipt.count();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `RCP-${year}-${(count + 1).toString().padStart(4, "0")}-${randomSuffix}`;
}

// Generate unique invoice number
export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}-${(count + 1).toString().padStart(4, "0")}-${randomSuffix}`;
}

// Generate unique expense number
export async function generateExpenseNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.expense.count();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `EXP-${year}-${(count + 1).toString().padStart(4, "0")}-${randomSuffix}`;
}

// Record entry in immutable financial ledger
export async function recordLedgerEntry(
  data: {
    transactionType:
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
    direction: "DEBIT" | "CREDIT";
    amount: number;
    currency?: string;
    accountCode:
      | "STUDENT_RECEIVABLES"
      | "CASH"
      | "BANK"
      | "PAYMENT_GATEWAY"
      | "TRAINER_PAYABLE"
      | "OPERATING_EXPENSE"
      | "FEE_DISCOUNT"
      | "REVENUE";
    referenceType: string;
    referenceId: string;
    studentProfileId?: string | null;
    notes?: string | null;
    createdById?: string | null;
  },
  txPrisma?: any
) {
  const db = txPrisma || prisma;
  const count = await db.financialLedgerEntry.count();
  const entryNumber = `LED-${Date.now()}-${count + 1}`;

  return await db.financialLedgerEntry.create({
    data: {
      entryNumber,
      transactionType: data.transactionType,
      direction: data.direction,
      amount: roundCurrency(data.amount),
      currency: data.currency || "INR",
      accountCode: data.accountCode,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      studentProfileId: data.studentProfileId || null,
      notes: data.notes || null,
      createdById: data.createdById || null,
    },
  });
}
