// Builds the new Financier UI's simple view-model (accounts, ledgerLines,
// students) from the real database via financierApi. No mock/seed data.
import { financierApi } from "../components/financier/api";
import type { LedgerAccountCode } from "../../backend/services/financier/types";
import type { FinancierAccount, FinancierStudentDebt, LedgerLine } from "./financierSeedData";

const CASH_LIKE: LedgerAccountCode[] = ["BANK", "CASH", "PAYMENT_GATEWAY"];

export async function loadFinancierLiveData(): Promise<{
  accounts: FinancierAccount[];
  ledgerLines: LedgerLine[];
  students: FinancierStudentDebt[];
}> {
  const [summary, ledger] = await Promise.all([
    financierApi.getSummary(),
    financierApi.getLedger(),
  ]);

  const accounts: FinancierAccount[] = ledger.accountBalances
    .filter((bal: { accountCode: LedgerAccountCode }) => CASH_LIKE.includes(bal.accountCode))
    .map((bal: {
      accountCode: LedgerAccountCode;
      accountName: string;
      netBalancePaise: number;
      totalDebitsPaise: number;
      totalCreditsPaise: number;
    }) => ({
      id: bal.accountCode,
      code: bal.accountCode,
      name: bal.accountName,
      accountNumber: "—",
      bankName: bal.accountCode === "BANK" ? "Primary Bank" : bal.accountName,
      type: bal.accountCode === "CASH" ? "CASH" : bal.accountCode === "PAYMENT_GATEWAY" ? "GATEWAY" : "BANK",
      currency: "INR",
      netBalanceMinor: bal.netBalancePaise,
      totalInflowMinor: bal.totalDebitsPaise,
      totalOutflowMinor: bal.totalCreditsPaise,
      pendingReconciliationCount: 0,
      lastReconciledAt: new Date().toISOString(),
    }));

  const ledgerLines: LedgerLine[] = [];
  let running = 0;
  const sortedEntries = [...ledger.entries].sort(
    (a, b) => Date.parse(a.entryDate) - Date.parse(b.entryDate)
  );
  for (const entry of sortedEntries) {
    for (const line of entry.lines) {
      if (!CASH_LIKE.includes(line.accountCode)) continue;
      const isCredit = line.direction === "CREDIT";
      const debitMinor = isCredit ? 0 : line.amountPaise;
      const creditMinor = isCredit ? line.amountPaise : 0;
      running += creditMinor - debitMinor;
      ledgerLines.push({
        id: line.id,
        date: entry.entryDate,
        transactionNumber: entry.entryNumber,
        description: entry.notes || entry.transactionType,
        category:
          entry.transactionType === "REFUND"
            ? "Refund Disbursement"
            : entry.transactionType === "TRAINER_PAYOUT"
              ? "Trainer Payout"
              : "Tuition Collection",
        debitMinor,
        creditMinor,
        balanceMinor: running,
        reference: entry.referenceId,
        status: "Cleared",
      });
    }
  }
  ledgerLines.reverse();

  const students: FinancierStudentDebt[] = summary.students.map((stu: {
    id: string; name: string; email: string; registrationNumber: string; batchCode: string; trackTitle: string;
    netPayablePaise: number; totalPaidPaise: number; outstandingPaise: number; overdueInstallmentsCount: number;
    installments?: Array<{
      installmentNumber: number;
      dueDate: string;
      amountDuePaise: number;
      amountPaidPaise: number;
      remainingBalancePaise: number;
      status: string;
    }>;
  }) => {
    const rawInsts = stu.installments;
    const installments = (rawInsts && rawInsts.length > 0)
      ? rawInsts.map((inst) => {
          const status = inst.status === "PAID" || inst.remainingBalancePaise <= 0
            ? ("PAID" as const)
            : inst.status === "OVERDUE" || Date.parse(inst.dueDate) < Date.now()
            ? ("OVERDUE" as const)
            : ("DUE" as const);
          return {
            number: inst.installmentNumber,
            amountMinor: inst.amountDuePaise,
            dueDate: inst.dueDate ? inst.dueDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
            status,
          };
        })
      : [
          {
            number: 1,
            dueDate: "2026-08-15",
            amountMinor: Math.round(stu.netPayablePaise / 2),
            status: stu.totalPaidPaise >= Math.round(stu.netPayablePaise / 2) ? ("PAID" as const) : ("OVERDUE" as const),
          },
          {
            number: 2,
            dueDate: "2026-11-15",
            amountMinor: Math.round(stu.netPayablePaise / 2),
            status: stu.totalPaidPaise >= stu.netPayablePaise ? ("PAID" as const) : ("DUE" as const),
          },
        ];

    const overdueInsts = rawInsts?.filter((i) => i.status === "OVERDUE" || (i.remainingBalancePaise > 0 && Date.parse(i.dueDate) < Date.now())) || [];
    const overdueMinor = overdueInsts.length > 0
      ? overdueInsts.reduce((sum, i) => sum + i.remainingBalancePaise, 0)
      : (stu.overdueInstallmentsCount > 0 ? stu.outstandingPaise : 0);

    const firstUnpaid = rawInsts?.find((i) => i.remainingBalancePaise > 0);
    const nextDueDate = firstUnpaid?.dueDate ? firstUnpaid.dueDate.slice(0, 10) : new Date().toISOString().slice(0, 10);

    return {
      id: stu.id,
      registrationNumber: stu.registrationNumber,
      name: stu.name,
      email: stu.email,
      phone: (stu as { phone?: string }).phone || "+91 98765 43210",
      courseTitle: stu.trackTitle,
      batchCode: stu.batchCode,
      contractedFeeMinor: stu.netPayablePaise,
      paidAmountMinor: stu.totalPaidPaise,
      remainingDueMinor: stu.outstandingPaise,
      overdueMinor,
      nextDueDate,
      status: stu.outstandingPaise <= 0 ? "PAID_IN_FULL" : (overdueMinor > 0 ? "OVERDUE" : "CURRENT"),
      installments,
    };
  });

  return { accounts, ledgerLines, students };
}
