import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["FINANCIER", "ADMIN"]);

    const [payrollPeriods, batches, payouts] = await Promise.all([
      prisma.payrollPeriod.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          payouts: {
            include: {
              trainerProfile: {
                include: { user: { select: { name: true, email: true } } },
              },
              adjustments: true,
            },
          },
        },
      }),
      prisma.batch.findMany({
        include: {
          course: true,
          enrollments: true,
        },
      }),
      prisma.trainerPayout.findMany({
        include: {
          trainerProfile: {
            include: { user: { select: { name: true, email: true } } },
          },
          adjustments: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const runs = payrollPeriods.map((period, idx) => {
      const totalBasePaise = Math.round((period.totalGrossAmount || 0) * 100);
      const totalPayablePaise = Math.round((period.totalNetAmount || 0) * 100);
      const totalAdjustmentNetPaise = totalPayablePaise - totalBasePaise;

      return {
        id: period.id,
        runNumber: period.periodName || `PR-2026-${String(idx + 1).padStart(3, "0")}`,
        periodName: period.periodName || `Payroll Period ${idx + 1}`,
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        status: (period.status === "CONFIRMED"
          ? "PAID"
          : period.status === "APPROVED"
          ? "APPROVED"
          : "DRAFT") as "DRAFT" | "SUBMITTED" | "APPROVED" | "PAID",
        createdById: "system",
        createdAt: period.createdAt.toISOString(),
        reviewedById: null,
        reviewedAt: null,
        approvedById: null,
        approvedAt: null,
        paidById: null,
        paidAt: period.status === "CONFIRMED" ? period.updatedAt.toISOString() : null,
        totalBasePaise,
        totalAdjustmentNetPaise,
        totalPayablePaise,
        payouts: period.payouts.map((p) => {
          const basePaise = Math.round((p.calculatedAmount || 0) * 100);
          const payablePaise = Math.round((p.netPayableAmount || 0) * 100);
          return {
            id: p.id,
            payrollRunId: period.id,
            trainerProfileId: p.trainerProfileId,
            trainerName: p.trainerProfile?.user?.name || "Trainer",
            employeeCode: p.trainerProfile?.employeeCode || `TR-${p.trainerProfileId.slice(0, 4)}`,
            policyType: (p.trainerProfile?.compensationPolicyId ? "HOURLY_RATE" : "HOURLY_RATE") as any,
            applicableRatePaise: 0,
            eligibleSessionsCount: 0,
            verifiedMinutes: 0,
            baseAmountPaise: basePaise,
            bonusPaise: 0,
            deductionPaise: 0,
            totalPayablePaise: payablePaise,
            paidAt: p.paymentStatus === "CONFIRMED_PAID" ? p.paidAt?.toISOString() || null : null,
            payslipNumber: `PS-${p.id.slice(0, 8).toUpperCase()}`,
            batchBreakdowns: [],
            adjustments: p.adjustments.map((a) => ({
              id: a.id,
              trainerPayoutId: p.id,
              type: a.type as "BONUS" | "DEDUCTION" | "REIMBURSEMENT",
              amountPaise: Math.round((a.amount || 0) * 100),
              reason: a.reason,
              status: (a.status || "PENDING") as "PENDING" | "APPROVED" | "REJECTED",
              createdById: "system",
              createdAt: a.createdAt.toISOString(),
              decidedById: null,
              decidedAt: null,
            })),
          };
        }),
      };
    });

    const totalTrainerPayoutCost = Math.round(
      payouts.reduce((sum, p) => sum + (p.paidAmount || p.totalPayable || 0), 0) * 100
    );
    const perBatchPayroll = batches.length > 0 ? Math.round(totalTrainerPayoutCost / batches.length) : 0;

    const batchCosts = batches.map((b) => {
      const payrollCostPaise = perBatchPayroll;
      const studentCount = b.enrollments.length;
      return {
        batchId: b.id,
        batchCode: b.code || b.name,
        trackTitle: b.course?.name || "Full Stack Development",
        studentCount,
        enrolledStudentsCount: studentCount,
        billedPaise: 0,
        collectedPaise: 0,
        outstandingPaise: 0,
        payrollCostPaise,
        marginPaise: -payrollCostPaise,
        marginPercent: 0,
      };
    });

    return NextResponse.json({
      runs,
      batchCosts,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("Financier payroll error:", error);
    return NextResponse.json({ error: "Failed to load payroll" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["FINANCIER", "ADMIN"]);
    const body = await req.json();

    const periodName = String(body.periodName || "").trim();
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    if (!periodName || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid payroll run parameters" }, { status: 400 });
    }

    const period = await prisma.payrollPeriod.create({
      data: {
        periodName,
        startDate,
        endDate,
        status: "DRAFT",
        totalGrossAmount: 0,
        totalDeductions: 0,
        totalNetAmount: 0,
      },
    });

    return NextResponse.json(
      {
        run: {
          id: period.id,
          runNumber: period.periodName,
          periodName: period.periodName,
          startDate: period.startDate.toISOString(),
          endDate: period.endDate.toISOString(),
          status: "DRAFT",
          createdById: session.userId || "system",
          createdAt: period.createdAt.toISOString(),
          reviewedById: null,
          reviewedAt: null,
          approvedById: null,
          approvedAt: null,
          paidById: null,
          paidAt: null,
          totalBasePaise: 0,
          totalAdjustmentNetPaise: 0,
          totalPayablePaise: 0,
          payouts: [],
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("Financier create payroll error:", error);
    return NextResponse.json({ error: "Failed to create payroll run" }, { status: 500 });
  }
}
