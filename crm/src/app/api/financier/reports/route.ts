import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["FINANCIER", "ADMIN"]);
    const { searchParams } = new URL(req.url);
    const kind = searchParams.get("kind");

    const now = new Date();

    const [courses, batches, studentsWithProfiles, payments, payrollPeriods, invoices] =
      await Promise.all([
        prisma.course.findMany(),
        prisma.batch.findMany({
          include: {
            course: true,
            enrollments: true,
            trainerPayouts: true,
          },
        }),
        prisma.studentProfile.findMany({
          include: {
            user: { select: { name: true, email: true } },
            enrollments: { include: { batch: { include: { course: true } } } },
            feeAgreements: { include: { installments: true, payments: true } },
            invoices: true,
          },
        }),
        prisma.studentPayment.findMany({
          where: { verificationStatus: "CONFIRMED" },
        }),
        prisma.payrollPeriod.findMany({
          include: { payouts: true },
        }),
        prisma.invoice.findMany(),
      ]);

    // Build batch records
    const revenueByBatch = batches.map((b) => {
      let billedPaise = 0;
      let collectedPaise = 0;

      for (const s of studentsWithProfiles) {
        const isInBatch = s.enrollments.some((e) => e.batchId === b.id);
        if (isInBatch) {
          for (const fa of s.feeAgreements) {
            billedPaise += Math.round((fa.agreedAmount || 0) * 100);
            for (const p of fa.payments) {
              if (p.verificationStatus === "CONFIRMED") {
                collectedPaise += Math.round((p.amount || 0) * 100);
              }
            }
          }
        }
      }

      const payrollCostPaise = Math.round(
        b.trainerPayouts.reduce((sum, p) => sum + (p.paidAmount || p.netPayableAmount || 0), 0) * 100
      );
      const outstandingPaise = Math.max(0, billedPaise - collectedPaise);
      const netContributionPaise = collectedPaise - payrollCostPaise;
      const contributionPercent =
        collectedPaise > 0 ? Math.round((netContributionPaise / collectedPaise) * 10000) / 100 : 0;

      return {
        batchId: b.id,
        batchCode: b.code || b.name,
        trackCode: b.course?.code || "FSD",
        trackTitle: b.course?.name || "Full Stack Development",
        studentCount: b.enrollments.length,
        billedPaise,
        collectedPaise,
        outstandingPaise,
        payrollCostPaise,
        netContributionPaise,
        contributionPercent,
      };
    });

    // Build track records
    const revenueByTrack = courses.map((c) => {
      const trackBatches = revenueByBatch.filter((b) => b.trackCode === c.code);
      const studentCount = trackBatches.reduce((sum, b) => sum + b.studentCount, 0);
      const billedPaise = trackBatches.reduce((sum, b) => sum + b.billedPaise, 0);
      const collectedPaise = trackBatches.reduce((sum, b) => sum + b.collectedPaise, 0);
      const outstandingPaise = trackBatches.reduce((sum, b) => sum + b.outstandingPaise, 0);
      const payrollCostPaise = trackBatches.reduce((sum, b) => sum + b.payrollCostPaise, 0);
      const netContributionPaise = collectedPaise - payrollCostPaise;
      const contributionPercent =
        collectedPaise > 0 ? Math.round((netContributionPaise / collectedPaise) * 10000) / 100 : 0;

      return {
        trackCode: c.code,
        trackTitle: c.name,
        studentCount,
        billedPaise,
        collectedPaise,
        outstandingPaise,
        payrollCostPaise,
        netContributionPaise,
        contributionPercent,
      };
    });

    if (kind === "ageing" || kind === "payroll-vs-revenue") {
      const csvHeader =
        kind === "ageing"
          ? "Batch,Track,Students,Billed,Collected,Outstanding\n"
          : "Batch,Track,Students,Billed,Collected,PayrollCost,NetContribution\n";
      const csvRows = revenueByBatch
        .map((b) =>
          kind === "ageing"
            ? `${b.batchCode},${b.trackTitle},${b.studentCount},${(b.billedPaise / 100).toFixed(2)},${(b.collectedPaise / 100).toFixed(2)},${(b.outstandingPaise / 100).toFixed(2)}`
            : `${b.batchCode},${b.trackTitle},${b.studentCount},${(b.billedPaise / 100).toFixed(2)},${(b.collectedPaise / 100).toFixed(2)},${(b.payrollCostPaise / 100).toFixed(2)},${(b.netContributionPaise / 100).toFixed(2)}`
        )
        .join("\n");

      return new NextResponse(csvHeader + csvRows, {
        headers: {
          "Content-Type": "text/csv;charset=utf-8",
          "Content-Disposition": `attachment; filename="${kind}-report.csv"`,
        },
      });
    }

    const totalBilledPaise = revenueByBatch.reduce((sum, b) => sum + b.billedPaise, 0);
    const totalCollectedPaise = revenueByBatch.reduce((sum, b) => sum + b.collectedPaise, 0);
    const totalPayrollCostPaise = revenueByBatch.reduce((sum, b) => sum + b.payrollCostPaise, 0);

    const monthlyRevenue = [
      {
        monthKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
        label: now.toLocaleString("default", { month: "short", year: "numeric" }),
        billedPaise: totalBilledPaise,
        collectedPaise: totalCollectedPaise,
        payrollCostPaise: totalPayrollCostPaise,
        netMarginPaise: totalCollectedPaise - totalPayrollCostPaise,
      },
    ];

    return NextResponse.json({
      asOfIso: now.toISOString(),
      revenueByTrack,
      revenueByBatch,
      monthlyRevenue,
      ageing: {
        summary: {
          totalOutstandingPaise: Math.max(0, totalBilledPaise - totalCollectedPaise),
          bucket0To30Paise: 0,
          bucket31To60Paise: 0,
          bucket61To90Paise: 0,
          bucket90PlusPaise: Math.max(0, totalBilledPaise - totalCollectedPaise),
          studentCount: studentsWithProfiles.length,
          overdueStudentCount: studentsWithProfiles.length,
        },
        students: [],
      },
      summary: {
        totalBilledPaise,
        totalCollectedPaise,
        totalPayrollCostPaise,
        netContributionPaise: totalCollectedPaise - totalPayrollCostPaise,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("Financial reports error:", error);
    return NextResponse.json({ error: "Failed to load financial reports" }, { status: 500 });
  }
}
