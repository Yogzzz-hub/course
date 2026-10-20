import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { FinancialSummaryCard } from "@/components/ui/FinancialSummaryCard";
import { PaymentStatusBadge } from "@/components/ui/PaymentStatusBadge";
import { MoneyDisplay } from "@/components/ui/MoneyDisplay";
import { roundCurrency } from "@/lib/finance";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  FileCheck,
  ArrowRight,
  ShieldAlert,
  Wallet,
  Receipt,
  RotateCcw,
  Users,
  CreditCard,
  PlusCircle,
  Calendar,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FinancierOverviewPage() {
  let session;
  try {
    session = await requireAuth(["FINANCIER", "ADMIN"]);
  } catch {
    redirect("/login");
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    confirmedPaymentsAgg,
    refundsAgg,
    pendingPaymentsAgg,
    pendingPaymentsCount,
    todayPaymentsAgg,
    monthPaymentsAgg,
    overdueInstallments,
    feeAgreements,
    approvedExpensesAgg,
    confirmedPayoutsAgg,
    recentPayments,
    discrepancyCount,
  ] = await Promise.all([
    prisma.studentPayment.aggregate({
      where: { verificationStatus: "CONFIRMED" },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.refund.aggregate({
      where: { status: "CONFIRMED" },
      _sum: { amount: true },
    }),
    prisma.studentPayment.aggregate({
      where: { verificationStatus: "PENDING_VERIFICATION" },
      _sum: { amount: true },
    }),
    prisma.studentPayment.count({
      where: { verificationStatus: "PENDING_VERIFICATION" },
    }),
    prisma.studentPayment.aggregate({
      where: {
        verificationStatus: "CONFIRMED",
        paymentDate: { gte: todayStart },
      },
      _sum: { amount: true },
    }),
    prisma.studentPayment.aggregate({
      where: {
        verificationStatus: "CONFIRMED",
        paymentDate: { gte: monthStart },
      },
      _sum: { amount: true },
    }),
    prisma.feeInstallment.aggregate({
      where: {
        dueDate: { lt: now },
        remainingBalance: { gt: 0.01 },
      },
      _sum: { remainingBalance: true },
      _count: { id: true },
    }),
    prisma.feeInstallment.aggregate({
      where: {
        remainingBalance: { gt: 0.01 },
      },
      _sum: { remainingBalance: true },
      _count: { id: true },
    }),
    prisma.expense.aggregate({
      where: { status: "APPROVED" },
      _sum: { amount: true },
    }),
    prisma.trainerPayout.aggregate({
      where: { paymentStatus: "CONFIRMED_PAID" },
      _sum: { paidAmount: true },
    }),
    prisma.studentPayment.findMany({
      take: 6,
      orderBy: { paymentDate: "desc" },
      include: {
        studentProfile: {
          include: { user: { select: { name: true, email: true } } },
        },
        feeAgreement: {
          include: { admission: { include: { course: true } } },
        },
      },
    }),
    prisma.reconciliationRecord.count({
      where: { status: "DISCREPANCY_FLAGGED" },
    }),
  ]);

  const grossCollections = roundCurrency(confirmedPaymentsAgg._sum.amount || 0);
  const totalRefunds = roundCurrency(refundsAgg._sum.amount || 0);
  const netCollections = roundCurrency(Math.max(0, grossCollections - totalRefunds));
  const pendingAmount = roundCurrency(pendingPaymentsAgg._sum.amount || 0);
  const todayCollections = roundCurrency(todayPaymentsAgg._sum.amount || 0);
  const monthCollections = roundCurrency(monthPaymentsAgg._sum.amount || 0);

  const overdueAmount = roundCurrency(overdueInstallments._sum.remainingBalance || 0);
  const totalOutstanding = roundCurrency(feeAgreements._sum.remainingBalance || 0);
  const overdueCount = overdueInstallments._count.id || 0;
  const outstandingCount = feeAgreements._count.id || 0;

  const totalExpenses = roundCurrency(approvedExpensesAgg._sum.amount || 0);
  const totalTrainerPayouts = roundCurrency(confirmedPayoutsAgg._sum.paidAmount || 0);

  return (
    <AppShell
      user={{
        name: session.name || "Financier",
        email: session.email,
        role: "FINANCIER",
      }}
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#6D1A2B] to-[#4E0F1E] rounded-2xl p-6 sm:p-8 text-white shadow-elevated relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#F6EBCF] text-[#4E0F1E]">
              Phase 2 Operational Financial Management
            </span>
            <span className="text-xs text-stone-300">Live Authoritative Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Academy Treasury & Collections Center
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-stone-200 leading-relaxed">
            Manage verifiable student tuition collections, installment aging buckets, admin-approved refund executions, trainer compensation disbursement, and channel reconciliations.
          </p>
        </div>
      </div>

      {/* Pending Verifications Banner (if any) */}
      {pendingPaymentsCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="text-sm font-bold text-amber-900">
                {pendingPaymentsCount} Payment{pendingPaymentsCount > 1 ? "s" : ""} Awaiting Verification (
                <MoneyDisplay amount={pendingAmount} className="inline font-bold" />)
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Manual bank and UPI payments require explicit verification before receipt issuance and balance allocation.
              </p>
            </div>
          </div>
          <Link
            href="/financier/payments?status=PENDING_VERIFICATION"
            className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-[#6D1A2B] text-[#F6EBCF] hover:bg-[#4E0F1E] text-xs font-semibold shrink-0 shadow-sm transition flex items-center justify-center text-center"
          >
            Review Now
          </Link>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <FinancialSummaryCard
          title="Net Collections"
          amount={netCollections}
          subtitle={`Gross: ${grossCollections.toLocaleString()} | Refunds: ${totalRefunds.toLocaleString()}`}
          trend="Confirmed receipts"
          icon={<DollarSign className="w-5 h-5 text-emerald-700" />}
        />

        <FinancialSummaryCard
          title="Total Outstanding"
          amount={totalOutstanding}
          subtitle={`${outstandingCount} unpaid installments`}
          trend="Unpaid tuition"
          icon={<Wallet className="w-5 h-5 text-[#6D1A2B]" />}
        />

        <FinancialSummaryCard
          title="Overdue Receivables"
          amount={overdueAmount}
          subtitle={`${overdueCount} past-due`}
          variant="danger"
          trend="Follow-up needed"
          icon={<AlertCircle className="w-5 h-5 text-rose-700" />}
        />

        <FinancialSummaryCard
          title="Month Collections"
          amount={monthCollections}
          subtitle={`Today: ${todayCollections.toLocaleString()} INR`}
          variant="gold"
          trend="Current month"
          icon={<TrendingUp className="w-5 h-5 text-[#C9A24B]" />}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#2A0F16]/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Operating Expenses
            </p>
            <p className="text-lg font-bold text-[#2A0F16] mt-1">
              <MoneyDisplay amount={totalExpenses} />
            </p>
            <p className="text-[11px] text-stone-500">Approved operational outlays</p>
          </div>
          <Link
            href="/financier/expenses"
            className="p-2 rounded-lg bg-[#FFFBF5] text-[#6D1A2B] hover:bg-[#F6EBCF]/60"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#2A0F16]/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Trainer Disbursements
            </p>
            <p className="text-lg font-bold text-[#2A0F16] mt-1">
              <MoneyDisplay amount={totalTrainerPayouts} />
            </p>
            <p className="text-[11px] text-stone-500">Confirmed payroll disbursed</p>
          </div>
          <Link
            href="/financier/trainer-payments"
            className="p-2 rounded-lg bg-[#FFFBF5] text-[#6D1A2B] hover:bg-[#F6EBCF]/60"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#2A0F16]/10 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Reconciliation Flags
            </p>
            <p className="text-lg font-bold text-[#2A0F16] mt-1">
              {discrepancyCount} Flagged
            </p>
            <p className="text-[11px] text-stone-500">Unsettled bank or gateway items</p>
          </div>
          <Link
            href="/financier/reconciliation"
            className="p-2 rounded-lg bg-[#FFFBF5] text-[#6D1A2B] hover:bg-[#F6EBCF]/60"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white rounded-xl p-5 border border-[#2A0F16]/10 shadow-sm">
        <h2 className="text-sm font-bold text-[#2A0F16] mb-3">Treasury Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          <Link
            href="/financier/payments"
            className="flex flex-col items-center justify-center p-3 rounded-lg border border-[#2A0F16]/10 bg-[#FFFBF5] hover:bg-[#F6EBCF]/40 transition text-center group"
          >
            <CreditCard className="w-5 h-5 text-[#6D1A2B] mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-[#2A0F16]">Record Payment</span>
          </Link>

          <Link
            href="/financier/installments"
            className="flex flex-col items-center justify-center p-3 rounded-lg border border-[#2A0F16]/10 bg-[#FFFBF5] hover:bg-[#F6EBCF]/40 transition text-center group"
          >
            <Calendar className="w-5 h-5 text-[#6D1A2B] mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-[#2A0F16]">Installments</span>
          </Link>

          <Link
            href="/financier/refunds"
            className="flex flex-col items-center justify-center p-3 rounded-lg border border-[#2A0F16]/10 bg-[#FFFBF5] hover:bg-[#F6EBCF]/40 transition text-center group"
          >
            <RotateCcw className="w-5 h-5 text-[#6D1A2B] mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-[#2A0F16]">Refund Queue</span>
          </Link>

          <Link
            href="/financier/trainer-payments"
            className="flex flex-col items-center justify-center p-3 rounded-lg border border-[#2A0F16]/10 bg-[#FFFBF5] hover:bg-[#F6EBCF]/40 transition text-center group"
          >
            <Users className="w-5 h-5 text-[#6D1A2B] mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-[#2A0F16]">Trainer Payroll</span>
          </Link>

          <Link
            href="/financier/expenses"
            className="flex flex-col items-center justify-center p-3 rounded-lg border border-[#2A0F16]/10 bg-[#FFFBF5] hover:bg-[#F6EBCF]/40 transition text-center group"
          >
            <PlusCircle className="w-5 h-5 text-[#6D1A2B] mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-[#2A0F16]">Expenses</span>
          </Link>

          <Link
            href="/financier/reconciliation"
            className="flex flex-col items-center justify-center p-3 rounded-lg border border-[#2A0F16]/10 bg-[#FFFBF5] hover:bg-[#F6EBCF]/40 transition text-center group"
          >
            <FileCheck className="w-5 h-5 text-[#6D1A2B] mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-[#2A0F16]">Reconcile</span>
          </Link>

          <Link
            href="/financier/reports"
            className="flex flex-col items-center justify-center p-3 rounded-lg border border-[#2A0F16]/10 bg-[#FFFBF5] hover:bg-[#F6EBCF]/40 transition text-center group"
          >
            <TrendingUp className="w-5 h-5 text-[#6D1A2B] mb-1.5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold text-[#2A0F16]">Reports & CSV</span>
          </Link>
        </div>
      </div>

      {/* Recent Payment Transactions */}
      <div className="bg-white rounded-xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#2A0F16]/10 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#2A0F16]">Recent Student Payments</h2>
            <p className="text-xs text-stone-500">Authoritative transaction records and receipt status</p>
          </div>
          <Link
            href="/financier/payments"
            className="text-xs font-semibold text-[#6D1A2B] hover:underline flex items-center gap-1"
          >
            <span>View Full Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentPayments.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            No payments have been recorded yet.
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-stone-100">
              {recentPayments.map((p: any) => (
                <div key={p.id} className="p-4 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-sm text-[#2A0F16] block">
                        {p.studentProfile?.user?.name || "Student"}
                      </span>
                      <span className="font-mono text-[11px] text-stone-500">
                        {p.transactionNumber}
                      </span>
                    </div>
                    <div className="text-right">
                      <MoneyDisplay amount={p.amount} currency={p.currency} size="sm" />
                      <span className="text-[10px] text-stone-400 block">
                        {p.feeAgreement?.admission?.course?.code || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-100 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <PaymentStatusBadge status={p.verificationStatus} size="sm" />
                      <span className="px-1.5 py-0.5 rounded bg-stone-100 font-mono text-[10px]">
                        {p.paymentMethod}
                      </span>
                    </div>

                    <div>
                      {p.verificationStatus === "CONFIRMED" ? (
                        <a
                          href={`/api/receipts/${p.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[44px] inline-flex items-center gap-1 text-xs font-semibold text-[#6D1A2B] hover:underline"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Receipt PDF</span>
                        </a>
                      ) : p.verificationStatus === "PENDING_VERIFICATION" ? (
                        <Link
                          href={`/financier/payments`}
                          className="min-h-[44px] inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
                        >
                          <span>Verify</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFFBF5] border-b border-[#2A0F16]/10 text-stone-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Transaction #</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {recentPayments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-stone-50/60 transition">
                      <td className="py-3 px-4 font-mono font-medium text-[#2A0F16]">
                        {p.transactionNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#2A0F16]">
                        {p.studentProfile?.user?.name || "Student"}
                      </td>
                      <td className="py-3 px-4 text-stone-600">
                        {p.feeAgreement?.admission?.course?.code || "—"}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#6D1A2B]">
                        <MoneyDisplay amount={p.amount} currency={p.currency} />
                      </td>
                      <td className="py-3 px-4 text-stone-600">
                        <span className="px-2 py-0.5 rounded bg-stone-100 font-mono text-[11px]">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-500">
                        {new Date(p.paymentDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <PaymentStatusBadge status={p.verificationStatus} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {p.verificationStatus === "CONFIRMED" ? (
                          <a
                            href={`/api/receipts/${p.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6D1A2B] hover:underline"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Receipt PDF</span>
                          </a>
                        ) : p.verificationStatus === "PENDING_VERIFICATION" ? (
                          <Link
                            href={`/financier/payments`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:underline"
                          >
                            <span>Verify</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
