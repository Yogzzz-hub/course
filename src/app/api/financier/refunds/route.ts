import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roundCurrency } from "@/lib/finance";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const RefundRequestSchema = z.object({
  studentPaymentId: z.string().min(1, "Payment transaction ID is required"),
  requestedAmount: z.number().min(1, "Refund amount must be greater than zero"),
  reason: z.string().min(3, "Detailed justification is required"),
  supportingDocUrl: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["FINANCIER", "ADMIN"]);

    const requests = await prisma.refundRequest.findMany({
      include: {
        studentProfile: {
          include: { user: { select: { name: true, email: true } } },
        },
        studentPayment: {
          select: {
            transactionNumber: true,
            amount: true,
            currency: true,
            paymentMethod: true,
            paymentDate: true,
          },
        },
        requester: { select: { name: true } },
        reviewer: { select: { name: true } },
        refund: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ refundRequests: requests });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch refund requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["FINANCIER", "ADMIN"]);
    const body = await req.json();
    const parsed = RefundRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const { studentPaymentId, requestedAmount, reason, supportingDocUrl } = parsed.data;

    // Verify payment exists and is CONFIRMED
    const payment = await prisma.studentPayment.findUnique({
      where: { id: studentPaymentId },
      include: {
        refunds: { where: { status: "CONFIRMED" } },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    if (payment.verificationStatus !== "CONFIRMED") {
      return NextResponse.json(
        { error: "Only verified and confirmed payments are eligible for refund requests." },
        { status: 400 }
      );
    }

    // Check maximum refundable amount
    const alreadyRefunded = payment.refunds.reduce((sum, r) => sum + r.amount, 0);
    const maxRefundable = roundCurrency(Math.max(0, payment.amount - alreadyRefunded));

    if (requestedAmount > maxRefundable) {
      return NextResponse.json(
        {
          error: `Requested refund (${requestedAmount}) exceeds maximum eligible refundable amount (${maxRefundable}).`,
        },
        { status: 400 }
      );
    }

    // Check pending refund request
    const existingPending = await prisma.refundRequest.findFirst({
      where: {
        studentPaymentId,
        status: { in: ["REQUESTED", "UNDER_REVIEW"] },
      },
    });

    if (existingPending) {
      return NextResponse.json(
        { error: "A refund request for this payment is already pending review." },
        { status: 409 }
      );
    }

    const refundRequest = await prisma.refundRequest.create({
      data: {
        studentPaymentId,
        studentProfileId: payment.studentProfileId,
        requestedAmount: roundCurrency(requestedAmount),
        reason: reason.trim(),
        supportingDocUrl: supportingDocUrl || null,
        status: "REQUESTED",
        requestedById: session.userId,
      },
    });

    // Also register in Admin FinancialApprovalRequest queue
    await prisma.financialApprovalRequest.create({
      data: {
        requestType: "REFUND_EXECUTION",
        entityType: "RefundRequest",
        entityId: refundRequest.id,
        requestedAmount: refundRequest.requestedAmount,
        reason: refundRequest.reason,
        supportingDocUrl: refundRequest.supportingDocUrl,
        status: "PENDING",
        requestedById: session.userId,
      },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "REFUND_REQUESTED",
      entityType: "RefundRequest",
      entityId: refundRequest.id,
      details: {
        transactionNumber: payment.transactionNumber,
        amount: requestedAmount,
        reason,
      },
    });

    return NextResponse.json({
      success: true,
      refundRequest,
      message: "Refund request submitted. Awaiting Executive Admin approval.",
    });
  } catch (error: any) {
    console.error("Refund request error:", error);
    return NextResponse.json({ error: "Failed to submit refund request" }, { status: 500 });
  }
}
