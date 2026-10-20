import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateTrainerPayoutForPeriod } from "@/lib/payroll";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const GeneratePayRunSchema = z.object({
  periodName: z.string().min(2, "Period name is required (e.g. March 2026)"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date (YYYY-MM-DD)"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date (YYYY-MM-DD)"),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["FINANCIER", "ADMIN"]);

    const [periods, payouts] = await Promise.all([
      prisma.payrollPeriod.findMany({
        orderBy: { startDate: "desc" },
      }),
      prisma.trainerPayout.findMany({
        include: {
          trainerProfile: {
            include: { user: { select: { name: true, email: true } } },
          },
          payrollPeriod: true,
          adjustments: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({ periods, payouts });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch trainer payroll" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["FINANCIER", "ADMIN"]);
    const body = await req.json();
    const parsed = GeneratePayRunSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const { periodName, startDate, endDate } = parsed.data;
    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T23:59:59Z`);

    if (end < start) {
      return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });
    }

    // Check existing period
    let period = await prisma.payrollPeriod.findUnique({
      where: { periodName },
    });

    if (!period) {
      period = await prisma.payrollPeriod.create({
        data: {
          periodName,
          startDate: start,
          endDate: end,
          status: "CALCULATED",
        },
      });
    }

    // Fetch all active trainers
    const trainers = await prisma.trainerProfile.findMany({
      include: { user: true },
    });

    const generatedPayouts: any[] = [];

    for (const trainer of trainers) {
      const calc = await calculateTrainerPayoutForPeriod(trainer.id, start, end);

      const payout = await prisma.trainerPayout.upsert({
        where: {
          payrollPeriodId_trainerProfileId: {
            payrollPeriodId: period.id,
            trainerProfileId: trainer.id,
          },
        },
        create: {
          payrollPeriodId: period.id,
          trainerProfileId: trainer.id,
          compensationPolicyType: calc.policyType,
          applicableRate: calc.applicableRate,
          eligibleSessionsCount: calc.eligibleSessionsCount,
          verifiedHours: calc.verifiedHours,
          baseAmount: calc.baseAmount,
          bonusAmount: calc.bonusAmount,
          deductionAmount: calc.deductionAmount,
          totalPayable: calc.totalPayable,
          adminApprovalStatus: "PENDING",
          paymentStatus: "DRAFT",
        },
        update: {
          compensationPolicyType: calc.policyType,
          applicableRate: calc.applicableRate,
          eligibleSessionsCount: calc.eligibleSessionsCount,
          verifiedHours: calc.verifiedHours,
          baseAmount: calc.baseAmount,
          totalPayable: calc.totalPayable,
        },
      });

      generatedPayouts.push(payout);
    }

    // Register in Admin FinancialApprovalRequest queue
    const totalBatchPayable = generatedPayouts.reduce((sum, p) => sum + p.totalPayable, 0);
    await prisma.financialApprovalRequest.create({
      data: {
        requestType: "PAYROLL_APPROVAL",
        entityType: "PayrollPeriod",
        entityId: period.id,
        requestedAmount: totalBatchPayable,
        reason: `Generated trainer payroll run for ${periodName} across ${trainers.length} instructors.`,
        status: "PENDING",
        requestedById: session.userId,
      },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "PAYROLL_RUN_GENERATED",
      entityType: "PayrollPeriod",
      entityId: period.id,
      details: {
        periodName,
        totalPayable: totalBatchPayable,
        trainersCount: trainers.length,
      },
    });

    return NextResponse.json({
      success: true,
      period,
      payoutsCount: generatedPayouts.length,
      totalPayable: totalBatchPayable,
      message: `Payroll run '${periodName}' generated. Submitted to Executive Admin for approval.`,
    });
  } catch (error: any) {
    console.error("Generate pay run error:", error);
    return NextResponse.json({ error: "Failed to generate payroll run" }, { status: 500 });
  }
}
