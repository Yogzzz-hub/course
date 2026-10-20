import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roundCurrency } from "@/lib/finance";

export async function GET() {
  try {
    await requireAuth(["FINANCIER", "ADMIN"]);

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
      expensesAgg,
      payoutsAgg,
      recentPayments,
      reconciliationExceptions,
    ] = await Promise.all([
      // Total Confirmed
      prisma.studentPayment.aggregate({
        where: { verificationStatus: "CONFIRMED" },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Total Refunds
      prisma.refund.aggregate({
        where: { status: "CONFIRMED" },
        _sum: { amount: true },
      }),
      // Pending Verification
      prisma.studentPayment.aggregate({
        where: { verificationStatus: "PENDING_VERIFICATION" },
        _sum: { amount: true },
      }),
      prisma.studentPayment.count({
        where: { verificationStatus: "PENDING_VERIFICATION" },
      }),
      // Today
      prisma.studentPayment.aggregate({
        where: {
          verificationStatus: "CONFIRMED",
          paymentDate: { gte: todayStart },
        },
        _sum: { amount: true },
      }),
      // This Month
      prisma.studentPayment.aggregate({
        where: {
          verificationStatus: "CONFIRMED",
          paymentDate: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      // Overdue Installments
      prisma.feeInstallment.findMany({
        where: {
          dueDate: { lt: now },
          remainingBalance: { gt: 0.01 },
        },
        select: { remainingBalance: true },
      }),
      // Total fee obligations across agreements
      prisma.feeAgreement.findMany({
        include: {
          installments: { select: { remainingBalance: true } },
        },
      }),
      // Expenses
      prisma.expense.aggregate({
        where: { status: "APPROVED" },
        _sum: { amount: true },
      }),
      // Trainer Payouts
      prisma.trainerPayout.aggregate({
        where: { paymentStatus: "CONFIRMED_PAID" },
        _sum: { paidAmount: true },
      }),
      // Recent Payments
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
      // Reconciliation exceptions
      prisma.reconciliationRecord.count({
        where: { status: "DISCREPANCY_FLAGGED" },
      }),
    ]);

    const grossCollections = roundCurrency(confirmedPaymentsAgg._sum.amount || 0);
    const totalRefunds = roundCurrency(refundsAgg._sum.amount || 0);
    const netCollections = roundCurrency(Math.max(0, grossCollections - totalRefunds));
    const pendingVerification = roundCurrency(pendingPaymentsAgg._sum.amount || 0);
    const todayCollections = roundCurrency(todayPaymentsAgg._sum.amount || 0);
    const monthCollections = roundCurrency(monthPaymentsAgg._sum.amount || 0);

    const overdueAmount = roundCurrency(
      overdueInstallments.reduce((sum, inst) => sum + inst.remainingBalance, 0)
    );

    const totalOutstanding = roundCurrency(
      feeAgreements.reduce(
        (acc, fa) =>
          acc + fa.installments.reduce((sum, inst) => sum + inst.remainingBalance, 0),
        0
      )
    );

    const totalExpenses = roundCurrency(expensesAgg._sum.amount || 0);
    const totalTrainerPayouts = roundCurrency(payoutsAgg._sum.paidAmount || 0);

    return NextResponse.json({
      metrics: {
        grossCollections,
        totalRefunds,
        netCollections,
        pendingVerification,
        pendingPaymentsCount,
        todayCollections,
        monthCollections,
        overdueAmount,
        totalOutstanding,
        totalExpenses,
        totalTrainerPayouts,
        reconciliationExceptions,
      },
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        transactionNumber: p.transactionNumber,
        studentName: p.studentProfile?.user?.name || "Student",
        courseCode: p.feeAgreement?.admission?.course?.code || "—",
        amount: p.amount,
        currency: p.currency,
        paymentMethod: p.paymentMethod,
        paymentDate: p.paymentDate,
        status: p.verificationStatus,
      })),
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("Financier summary error:", error);
    return NextResponse.json({ error: "Failed to load financial summary" }, { status: 500 });
  }
}
