import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTransactionNumber, roundCurrency } from "@/lib/finance";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const RecordPaymentSchema = z.object({
  studentProfileId: z.string().min(1, "Student profile is required"),
  feeAgreementId: z.string().optional().nullable(),
  amount: z.number().min(1, "Payment amount must be greater than zero"),
  currency: z.string().default("INR"),
  paymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD", "ONLINE_GATEWAY", "OTHER"]),
  externalReference: z.string().optional().nullable(),
  evidenceUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(["FINANCIER", "ADMIN", "MANAGER"]);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const studentProfileId = searchParams.get("studentProfileId");

    const where: any = {};
    if (status && status !== "ALL") {
      where.verificationStatus = status;
    }
    if (studentProfileId) {
      where.studentProfileId = studentProfileId;
    }

    const payments = await prisma.studentPayment.findMany({
      where,
      include: {
        studentProfile: {
          include: { user: { select: { name: true, email: true, phone: true } } },
        },
        feeAgreement: {
          include: { admission: { include: { course: true, targetBatch: true } } },
        },
        collector: { select: { name: true } },
        verifier: { select: { name: true } },
        receipt: true,
        refunds: true,
      },
      orderBy: { paymentDate: "desc" },
    });

    return NextResponse.json({ payments });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch payments ledger" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["FINANCIER", "ADMIN"]);
    const body = await req.json();
    const parsed = RecordPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const {
      studentProfileId,
      feeAgreementId,
      amount,
      currency,
      paymentMethod,
      externalReference,
      evidenceUrl,
      notes,
    } = parsed.data;

    // Check student profile exists
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: {
        user: true,
        feeAgreements: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const targetAgreementId = feeAgreementId || student.feeAgreements[0]?.id || null;
    const transactionNumber = await generateTransactionNumber();

    // Critical Requirement: Manual payments must be recorded in PENDING_VERIFICATION status
    const payment = await prisma.studentPayment.create({
      data: {
        transactionNumber,
        studentProfileId,
        feeAgreementId: targetAgreementId,
        amount: roundCurrency(amount),
        currency,
        paymentMethod,
        verificationStatus: "PENDING_VERIFICATION",
        externalReference: externalReference?.trim() || null,
        evidenceUrl: evidenceUrl?.trim() || null,
        notes: notes?.trim() || null,
        collectedById: session.userId,
      },
      include: {
        studentProfile: { include: { user: true } },
      },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "MANUAL_PAYMENT_RECORDED",
      entityType: "StudentPayment",
      entityId: payment.id,
      details: {
        transactionNumber,
        amount: payment.amount,
        paymentMethod,
        status: payment.verificationStatus,
      },
    });

    return NextResponse.json({
      success: true,
      payment,
      message: `Payment recorded under transaction ${transactionNumber} awaiting verification.`,
    });
  } catch (error: any) {
    console.error("Record payment error:", error);
    return NextResponse.json({ error: "Failed to record manual payment" }, { status: 500 });
  }
}
