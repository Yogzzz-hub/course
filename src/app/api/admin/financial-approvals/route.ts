import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const FinancialDecisionSchema = z.object({
  id: z.string().min(1, "Request ID is required"),
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewNotes: z.string().optional().nullable(),
});

export async function GET() {
  try {
    await requireAuth(["ADMIN"]);

    const requests = await prisma.financialApprovalRequest.findMany({
      include: {
        requester: { select: { name: true, role: true } },
        reviewer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ requests });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch financial approval queue" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["ADMIN"]);
    const body = await req.json();
    const parsed = FinancialDecisionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const { id, decision, reviewNotes } = parsed.data;

    const approvalReq = await prisma.financialApprovalRequest.findUnique({
      where: { id },
    });

    if (!approvalReq) {
      return NextResponse.json({ error: "Financial approval request not found" }, { status: 404 });
    }

    if (approvalReq.status !== "PENDING") {
      return NextResponse.json(
        { error: `This request has already been ${approvalReq.status.toLowerCase()}.` },
        { status: 400 }
      );
    }

    // Process approval based on requestType
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update the approval request
      const updatedReq = await tx.financialApprovalRequest.update({
        where: { id },
        data: {
          status: decision,
          reviewedById: session.userId,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes?.trim() || null,
        },
      });

      // 2. Update underlying entity
      if (approvalReq.requestType === "REFUND_EXECUTION") {
        await tx.refundRequest.update({
          where: { id: approvalReq.entityId },
          data: {
            status: decision,
            reviewedById: session.userId,
            reviewedAt: new Date(),
            reviewNotes: reviewNotes?.trim() || null,
          },
        });
      } else if (approvalReq.requestType === "PAYROLL_APPROVAL") {
        await tx.payrollPeriod.update({
          where: { id: approvalReq.entityId },
          data: {
            status: decision === "APPROVED" ? "APPROVED" : "DRAFT",
            approvedById: session.userId,
            approvedAt: new Date(),
          },
        });

        await tx.trainerPayout.updateMany({
          where: { payrollPeriodId: approvalReq.entityId },
          data: {
            adminApprovalStatus: decision,
            adminApprovedById: session.userId,
            adminApprovedAt: new Date(),
            paymentStatus: decision === "APPROVED" ? "PENDING_EXECUTION" : "DRAFT",
          },
        });
      } else if (approvalReq.requestType === "EXPENSE_APPROVAL") {
        await tx.expense.update({
          where: { id: approvalReq.entityId },
          data: {
            status: decision === "APPROVED" ? "APPROVED" : "REJECTED",
            approvedById: session.userId,
            approvedAt: new Date(),
          },
        });
      }

      return updatedReq;
    });

    await logAuditEvent({
      userId: session.userId,
      action: `FINANCIAL_${decision}`,
      entityType: approvalReq.entityType,
      entityId: approvalReq.entityId,
      details: {
        requestType: approvalReq.requestType,
        amount: approvalReq.requestedAmount,
        decision,
        reviewNotes,
      },
    });

    return NextResponse.json({
      success: true,
      request: result,
      message: `Financial request ${decision.toLowerCase()} by Executive Admin.`,
    });
  } catch (error: any) {
    console.error("Financial decision error:", error);
    return NextResponse.json({ error: "Failed to process financial approval" }, { status: 500 });
  }
}
