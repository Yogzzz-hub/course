import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roundCurrency } from "@/lib/finance";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(["FINANCIER", "ADMIN"]);
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format"); // "json" or "csv"

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      allConfirmedPayments,
      allRefunds,
      allExpenses,
      allTrainerPayouts,
      feeAgreements,
    ] = await Promise.all([
      prisma.studentPayment.findMany({
        where: { verificationStatus: "CONFIRMED" },
        include: {
          studentProfile: {
            include: { user: { select: { name: true, email: true } } },
          },
          feeAgreement: {
            include: { admission: { include: { course: true, targetBatch: true } } },
          },
          verifier: { select: { name: true } },
        },
        orderBy: { paymentDate: "desc" },
      }),
      prisma.refund.findMany({
        where: { status: "CONFIRMED" },
      }),
      prisma.expense.findMany({
        where: { status: "APPROVED" },
        include: { category: true },
      }),
      prisma.trainerPayout.findMany({
        where: { paymentStatus: "CONFIRMED_PAID" },
        include: {
          trainerProfile: {
            include: { user: { select: { name: true } } },
          },
        },
      }),
      prisma.feeAgreement.findMany({
        include: {
          admission: { include: { course: true } },
          installments: true,
        },
      }),
    ]);

    // Compute Collection Windows
    const dailyCollections = roundCurrency(
      allConfirmedPayments
        .filter((p) => new Date(p.paymentDate) >= startOfToday)
        .reduce((sum, p) => sum + p.amount, 0)
    );

    const weeklyCollections = roundCurrency(
      allConfirmedPayments
        .filter((p) => new Date(p.paymentDate) >= startOfWeek)
        .reduce((sum, p) => sum + p.amount, 0)
    );

    const monthlyCollections = roundCurrency(
      allConfirmedPayments
        .filter((p) => new Date(p.paymentDate) >= startOfMonth)
        .reduce((sum, p) => sum + p.amount, 0)
    );

    const yearlyCollections = roundCurrency(
      allConfirmedPayments
        .filter((p) => new Date(p.paymentDate) >= startOfYear)
        .reduce((sum, p) => sum + p.amount, 0)
    );

    const totalGrossCollections = roundCurrency(
      allConfirmedPayments.reduce((sum, p) => sum + p.amount, 0)
    );
    const totalRefunds = roundCurrency(allRefunds.reduce((sum, r) => sum + r.amount, 0));
    const totalNetCollections = roundCurrency(
      Math.max(0, totalGrossCollections - totalRefunds)
    );
    const totalExpenses = roundCurrency(allExpenses.reduce((sum, e) => sum + e.amount, 0));
    const totalTrainerPayouts = roundCurrency(
      allTrainerPayouts.reduce((sum, tp) => sum + (tp.paidAmount || 0), 0)
    );
    const netCashMovement = roundCurrency(
      totalNetCollections - (totalExpenses + totalTrainerPayouts)
    );

    // Method Breakdown
    const methodCounts: Record<string, { count: number; total: number }> = {};
    for (const p of allConfirmedPayments) {
      if (!methodCounts[p.paymentMethod]) {
        methodCounts[p.paymentMethod] = { count: 0, total: 0 };
      }
      methodCounts[p.paymentMethod].count += 1;
      methodCounts[p.paymentMethod].total = roundCurrency(
        methodCounts[p.paymentMethod].total + p.amount
      );
    }

    // Course Breakdown
    const courseRevenue: Record<string, { title: string; contracted: number; collected: number }> = {};
    for (const fa of feeAgreements) {
      const code = fa.admission?.course?.code || "GENERAL";
      const title = fa.admission?.course?.title || "General Tuition";
      if (!courseRevenue[code]) {
        courseRevenue[code] = { title, contracted: 0, collected: 0 };
      }
      courseRevenue[code].contracted = roundCurrency(
        courseRevenue[code].contracted + fa.totalAgreedFee
      );
    }
    for (const p of allConfirmedPayments) {
      const code = p.feeAgreement?.admission?.course?.code || "GENERAL";
      if (courseRevenue[code]) {
        courseRevenue[code].collected = roundCurrency(
          courseRevenue[code].collected + p.amount
        );
      }
    }

    // CSV Export option
    if (format === "csv") {
      const rows = [
        ["Transaction #", "Student", "Course", "Amount (INR)", "Method", "Date", "Verifier"],
        ...allConfirmedPayments.map((p) => [
          p.transactionNumber,
          `"${p.studentProfile?.user?.name || "Student"}"`,
          p.feeAgreement?.admission?.course?.code || "—",
          p.amount.toFixed(2),
          p.paymentMethod,
          new Date(p.paymentDate).toISOString().split("T")[0],
          `"${p.verifier?.name || "System"}"`,
        ]),
      ];
      const csvString = rows.map((r) => r.join(",")).join("\n");
      return new NextResponse(csvString, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="apex-financial-report-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      summary: {
        dailyCollections,
        weeklyCollections,
        monthlyCollections,
        yearlyCollections,
        totalGrossCollections,
        totalRefunds,
        totalNetCollections,
        totalExpenses,
        totalTrainerPayouts,
        netCashMovement,
      },
      methodBreakdown: methodCounts,
      courseBreakdown: courseRevenue,
      recentPayments: allConfirmedPayments.slice(0, 20).map((p) => ({
        id: p.id,
        transactionNumber: p.transactionNumber,
        studentName: p.studentProfile?.user?.name || "Student",
        courseCode: p.feeAgreement?.admission?.course?.code || "—",
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        paymentDate: p.paymentDate,
        verifierName: p.verifier?.name || "System",
      })),
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("Financial reports error:", error);
    return NextResponse.json({ error: "Failed to load financial reports" }, { status: 500 });
  }
}
