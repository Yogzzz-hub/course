import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roundCurrency } from "@/lib/finance";

export async function GET() {
  try {
    const session = await requireAuth(["TRAINER"]);

    const trainerProfile = await prisma.trainerProfile.findUnique({
      where: { userId: session.userId },
      include: {
        compensationPolicies: {
          where: { isActive: true },
          orderBy: { effectiveStartDate: "desc" },
          take: 1,
        },
        payouts: {
          include: { payrollPeriod: true, adjustments: true },
          orderBy: { createdAt: "desc" },
        },
        classSessions: {
          where: { isLocked: true },
          select: { id: true, sessionDate: true },
        },
      },
    });

    if (!trainerProfile) {
      return NextResponse.json({ error: "Trainer profile not found" }, { status: 404 });
    }

    const activePolicy = trainerProfile.compensationPolicies[0] || {
      policyType: "PER_SESSION",
      baseRate: 1500,
      currency: "INR",
    };

    let totalConfirmedPaid = 0;
    let pendingApprovalAmount = 0;
    let approvedPendingDisbursement = 0;

    for (const p of trainerProfile.payouts) {
      if (p.paymentStatus === "CONFIRMED_PAID") {
        totalConfirmedPaid = roundCurrency(totalConfirmedPaid + p.paidAmount);
      } else if (p.adminApprovalStatus === "APPROVED") {
        approvedPendingDisbursement = roundCurrency(approvedPendingDisbursement + p.totalPayable);
      } else if (p.adminApprovalStatus === "PENDING") {
        pendingApprovalAmount = roundCurrency(pendingApprovalAmount + p.totalPayable);
      }
    }

    return NextResponse.json({
      trainer: {
        id: trainerProfile.id,
        employeeCode: trainerProfile.employeeCode,
        policyType: activePolicy.policyType,
        baseRate: activePolicy.baseRate,
        currency: activePolicy.currency,
      },
      summary: {
        totalConfirmedPaid,
        approvedPendingDisbursement,
        pendingApprovalAmount,
        verifiedSessionsCount: trainerProfile.classSessions.length,
      },
      payouts: trainerProfile.payouts.map((p) => ({
        id: p.id,
        periodName: p.payrollPeriod.periodName,
        policyType: p.compensationPolicyType,
        applicableRate: p.applicableRate,
        eligibleSessionsCount: p.eligibleSessionsCount,
        verifiedHours: p.verifiedHours,
        baseAmount: p.baseAmount,
        totalPayable: p.totalPayable,
        adminApprovalStatus: p.adminApprovalStatus,
        paymentStatus: p.paymentStatus,
        paidAmount: p.paidAmount,
        paidAt: p.paidAt,
        paymentMethod: p.paymentMethod,
        paymentReference: p.paymentReference,
        notes: p.notes,
      })),
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("Trainer earnings error:", error);
    return NextResponse.json({ error: "Failed to load trainer earnings" }, { status: 500 });
  }
}
