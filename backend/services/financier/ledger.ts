import {
  assertPositivePaise,
  sumPaise,
  subtractPaise,
} from "./money.ts";
import type {
  BalancedJournalEntry,
  JournalEntryLine,
  JournalLineInput,
  JournalTransactionType,
  LedgerAccountCode,
  LedgerAccountType,
} from "./types.ts";

export class UnbalancedJournalError extends Error {
  readonly debitsPaise: number;
  readonly creditsPaise: number;

  constructor(
    debitsPaise: number,
    creditsPaise: number,
    message?: string
  ) {
    super(
      message ||
        `Unbalanced journal entry rejected: debits (${debitsPaise} paise) !== credits (${creditsPaise} paise).`
    );
    this.debitsPaise = debitsPaise;
    this.creditsPaise = creditsPaise;
    this.name = "UnbalancedJournalError";
  }
}

export class ImmutableLedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImmutableLedgerError";
  }
}

export const LEDGER_ACCOUNT_META: Record<
  LedgerAccountCode,
  { code: LedgerAccountCode; name: string; type: LedgerAccountType }
> = {
  STUDENT_RECEIVABLES: {
    code: "STUDENT_RECEIVABLES",
    name: "Student Fee Receivables",
    type: "ASSET",
  },
  CASH: {
    code: "CASH",
    name: "Cash in Hand",
    type: "ASSET",
  },
  BANK: {
    code: "BANK",
    name: "Operating Bank Account",
    type: "ASSET",
  },
  PAYMENT_GATEWAY: {
    code: "PAYMENT_GATEWAY",
    name: "Payment Gateway Clearing (UPI / Card)",
    type: "ASSET",
  },
  TRAINER_PAYABLE: {
    code: "TRAINER_PAYABLE",
    name: "Trainer Payroll Payable",
    type: "LIABILITY",
  },
  REVENUE: {
    code: "REVENUE",
    name: "Tuition Fee Revenue",
    type: "REVENUE",
  },
  FEE_DISCOUNT: {
    code: "FEE_DISCOUNT",
    name: "Fee Discounts & Scholarships",
    type: "EXPENSE",
  },
  OPERATING_EXPENSE: {
    code: "OPERATING_EXPENSE",
    name: "Instructional & Operating Expense",
    type: "EXPENSE",
  },
};

export function validateBalancedJournalLines(lines: readonly JournalLineInput[]): {
  debitsPaise: number;
  creditsPaise: number;
} {
  if (!lines || lines.length < 2) {
    throw new UnbalancedJournalError(
      0,
      0,
      "A double-entry journal posting requires at least two lines (debit and credit)."
    );
  }

  let debitAmounts: number[] = [];
  let creditAmounts: number[] = [];

  for (const line of lines) {
    const amount = assertPositivePaise(line.amountPaise, `line(${line.accountCode}).amountPaise`);
    if (line.direction === "DEBIT") {
      debitAmounts.push(amount);
    } else if (line.direction === "CREDIT") {
      creditAmounts.push(amount);
    } else {
      throw new ImmutableLedgerError(`Invalid ledger direction: ${String(line.direction)}`);
    }
  }

  const debitsPaise = sumPaise(debitAmounts, "journalDebits");
  const creditsPaise = sumPaise(creditAmounts, "journalCredits");

  if (debitsPaise !== creditsPaise || debitsPaise <= 0) {
    throw new UnbalancedJournalError(debitsPaise, creditsPaise);
  }

  return { debitsPaise, creditsPaise };
}

export function createBalancedJournalEntry(params: {
  id: string;
  entryNumber: string;
  entryDate: string;
  transactionType: JournalTransactionType;
  referenceType: string;
  referenceId: string;
  studentProfileId?: string | null;
  batchId?: string | null;
  trackCode?: string | null;
  notes?: string | null;
  createdById: string;
  reversesEntryId?: string | null;
  lines: readonly JournalLineInput[];
}): BalancedJournalEntry {
  validateBalancedJournalLines(params.lines);

  const builtLines: JournalEntryLine[] = params.lines.map((line, idx) => ({
    id: `${params.id}-L${idx + 1}`,
    journalEntryId: params.id,
    entryNumber: params.entryNumber,
    entryDate: params.entryDate,
    transactionType: params.transactionType,
    direction: line.direction,
    amountPaise: line.amountPaise,
    currency: "INR",
    accountCode: line.accountCode,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    studentProfileId: line.studentProfileId ?? params.studentProfileId ?? null,
    batchId: line.batchId ?? params.batchId ?? null,
    trackCode: line.trackCode ?? params.trackCode ?? null,
    notes: line.notes ?? params.notes ?? null,
    createdById: params.createdById,
    reversesEntryId: params.reversesEntryId ?? null,
    reversedByEntryId: null,
  }));

  return {
    id: params.id,
    entryNumber: params.entryNumber,
    entryDate: params.entryDate,
    transactionType: params.transactionType,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    studentProfileId: params.studentProfileId ?? null,
    batchId: params.batchId ?? null,
    trackCode: params.trackCode ?? null,
    notes: params.notes ?? null,
    createdById: params.createdById,
    reversesEntryId: params.reversesEntryId ?? null,
    reversedByEntryId: null,
    lines: builtLines,
  };
}

/**
 * Reverses a posted journal entry using exact flipped DEBIT/CREDIT counter-entries.
 * Never deletes or mutates amounts of original ledger lines.
 */
export function buildCounterEntryReversal(params: {
  original: BalancedJournalEntry;
  newEntryId: string;
  newEntryNumber: string;
  reversalDate: string;
  reason: string;
  createdById: string;
}): BalancedJournalEntry {
  if (!params.reason || params.reason.trim().length < 5) {
    throw new ImmutableLedgerError("A reversal reason of at least 5 characters is required.");
  }
  if (params.original.reversedByEntryId) {
    throw new ImmutableLedgerError(
      `Journal entry ${params.original.entryNumber} has already been reversed by ${params.original.reversedByEntryId}.`
    );
  }

  const counterLines: JournalLineInput[] = params.original.lines.map((line) => ({
    accountCode: line.accountCode,
    direction: line.direction === "DEBIT" ? "CREDIT" : "DEBIT",
    amountPaise: line.amountPaise,
    studentProfileId: line.studentProfileId,
    batchId: line.batchId,
    trackCode: line.trackCode,
    notes: `Reversal of ${params.original.entryNumber}: ${params.reason.trim()}`,
  }));

  return createBalancedJournalEntry({
    id: params.newEntryId,
    entryNumber: params.newEntryNumber,
    entryDate: params.reversalDate,
    transactionType: "REVERSAL",
    referenceType: params.original.referenceType,
    referenceId: params.original.referenceId,
    studentProfileId: params.original.studentProfileId,
    batchId: params.original.batchId,
    trackCode: params.original.trackCode,
    notes: `Reversal of ${params.original.entryNumber}: ${params.reason.trim()}`,
    createdById: params.createdById,
    reversesEntryId: params.original.id,
    lines: counterLines,
  });
}

export interface TrialBalanceResult {
  balanced: boolean;
  totalDebitsPaise: number;
  totalCreditsPaise: number;
  differencePaise: number;
  entryCount: number;
  lineCount: number;
}

export function verifyTrialBalance(entries: readonly BalancedJournalEntry[]): TrialBalanceResult {
  const debits: number[] = [];
  const credits: number[] = [];
  let lineCount = 0;

  for (const entry of entries) {
    for (const line of entry.lines) {
      lineCount += 1;
      assertPositivePaise(line.amountPaise, `line(${line.id}).amountPaise`);
      if (line.direction === "DEBIT") {
        debits.push(line.amountPaise);
      } else {
        credits.push(line.amountPaise);
      }
    }
  }

  const totalDebitsPaise = sumPaise(debits, "trialBalanceDebits");
  const totalCreditsPaise = sumPaise(credits, "trialBalanceCredits");
  const differencePaise = subtractPaise(totalDebitsPaise, totalCreditsPaise);

  return {
    balanced: differencePaise === 0,
    totalDebitsPaise,
    totalCreditsPaise,
    differencePaise,
    entryCount: entries.length,
    lineCount,
  };
}

export interface AccountBalanceSummary {
  accountCode: LedgerAccountCode;
  accountName: string;
  accountType: LedgerAccountType;
  totalDebitsPaise: number;
  totalCreditsPaise: number;
  netBalancePaise: number; // positive = normal balance side
}

export function computeAccountBalances(
  entries: readonly BalancedJournalEntry[],
  filters?: { fromDate?: string; toDate?: string; studentProfileId?: string; accountCode?: LedgerAccountCode }
): AccountBalanceSummary[] {
  const map = new Map<LedgerAccountCode, { debits: number[]; credits: number[] }>();
  for (const code of Object.keys(LEDGER_ACCOUNT_META) as LedgerAccountCode[]) {
    if (!filters?.accountCode || filters.accountCode === code) {
      map.set(code, { debits: [], credits: [] });
    }
  }

  const fromMs = filters?.fromDate ? Date.parse(filters.fromDate) : null;
  const toMs = filters?.toDate ? Date.parse(filters.toDate) : null;

  for (const entry of entries) {
    const entryMs = Date.parse(entry.entryDate);
    if (fromMs !== null && !Number.isNaN(fromMs) && entryMs < fromMs) continue;
    if (toMs !== null && !Number.isNaN(toMs) && entryMs > toMs + 86_399_999) continue;

    for (const line of entry.lines) {
      if (filters?.accountCode && line.accountCode !== filters.accountCode) continue;
      if (filters?.studentProfileId && line.studentProfileId !== filters.studentProfileId) continue;

      const bucket = map.get(line.accountCode);
      if (!bucket) continue;
      if (line.direction === "DEBIT") bucket.debits.push(line.amountPaise);
      else bucket.credits.push(line.amountPaise);
    }
  }

  return Array.from(map.entries()).map(([code, totals]) => {
    const meta = LEDGER_ACCOUNT_META[code];
    const totalDebitsPaise = sumPaise(totals.debits, `${code}.debits`);
    const totalCreditsPaise = sumPaise(totals.credits, `${code}.credits`);
    const isDebitNormal = meta.type === "ASSET" || meta.type === "EXPENSE";
    const netBalancePaise = isDebitNormal
      ? subtractPaise(totalDebitsPaise, totalCreditsPaise)
      : subtractPaise(totalCreditsPaise, totalDebitsPaise);

    return {
      accountCode: code,
      accountName: meta.name,
      accountType: meta.type,
      totalDebitsPaise,
      totalCreditsPaise,
      netBalancePaise,
    };
  });
}

export function paymentMethodToAccountCode(
  method: "CASH" | "UPI" | "BANK_TRANSFER" | "CARD"
): LedgerAccountCode {
  switch (method) {
    case "CASH":
      return "CASH";
    case "BANK_TRANSFER":
      return "BANK";
    case "UPI":
    case "CARD":
      return "PAYMENT_GATEWAY";
  }
}
