import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTransactionNumber } from "@/lib/finance";
import { z } from "zod";

const RecordPaymentSchema = z.object({
  studentProfileId: z.string().min(1, "Student profile is required"),
  feeAgreementId: z.string().optional().nullable(),
  invoiceId: z.string().optional().nullable(),
  amountPaise: z.number().int().positive().optional(),
  amount: z.number().positive().optional(),
  currency: z.string().default("INR"),
  paymentMethod: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD", "ONLINE_GATEWAY", "OTHER"]).default("UPI"),
  externalReference: z.string().optional().nullable(),
  paymentDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["FINANCIER", "ADMIN", "MANAGER"]);

    const [rawPayments, rawRefunds] = await Promise.all([
      prisma.studentPayment.findMany({
        include: {
          studentProfile: {
            include: {
              user: { select: { name: true, email: true, phone: true } },
              enrollments: { include: { batch: { include: { course: true } } } },
            },
          },
          feeAgreement: {
            include: { admission: { include: { course: true, targetBatch: true } } },
          },
          receipt: true,
          refunds: true,
        },
        orderBy: { paymentDate: "desc" },
      }),
      prisma.refund.findMany({
        include: {
          studentPayment: {
            include: {
              studentProfile: {
                include: { user: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const payments = rawPayments.map((p) => {
      const activeBatch =
        p.studentProfile?.enrollments[0]?.batch || p.feeAgreement?.admission?.targetBatch;
      const course = activeBatch?.course || p.feeAgreement?.admission?.course;

      const amountPaise = Math.round((p.amount || 0) * 100);
      const refundedPaise = Math.round(
        (p.refunds || []).reduce((acc, r) => acc + (r.amount || 0), 0) * 100
      );

      return {
        id: p.id,
        transactionNumber: p.transactionNumber,
        receiptNumber: p.receipt?.receiptNumber || `REC-${p.transactionNumber.slice(-8)}`,
        studentProfileId: p.studentProfileId,
        studentName: p.studentProfile?.user?.name || "Student",
        studentEmail: p.studentProfile?.user?.email || "",
        registrationNumber: p.studentProfile?.registrationNumber || `REG-${p.studentProfileId.slice(0, 6)}`,
        feeAgreementId: p.feeAgreementId || "",
        invoiceId: null,
        batchId: activeBatch?.id || "",
        batchCode: activeBatch?.code || activeBatch?.name || "Batch",
        trackCode: course?.code || "FSD",
        trackTitle: course?.name || "Full Stack Development",
        amountPaise,
        refundedPaise,
        currency: "INR" as const,
        paymentMethod: p.paymentMethod as any,
        paymentDate: p.paymentDate.toISOString(),
        externalReference: p.externalReference || p.transactionNumber,
        verificationStatus: (p.verificationStatus === "CONFIRMED"
          ? refundedPaise >= amountPaise
            ? "REFUNDED"
            : refundedPaise > 0
            ? "PARTIALLY_REFUNDED"
            : "CONFIRMED"
          : "CONFIRMED") as "CONFIRMED" | "REFUNDED" | "PARTIALLY_REFUNDED" | "REVERSED",
      };
    });

    const refunds = rawRefunds.map((r) => ({
      id: r.id,
      paymentId: r.studentPaymentId,
      studentProfileId: r.studentPayment?.studentProfileId || "",
      studentName: r.studentPayment?.studentProfile?.user?.name || "Student",
      amountPaise: Math.round((r.amount || 0) * 100),
      reason: r.reason || "Tuition fee refund",
      status: (r.status === "CONFIRMED" ? "EXECUTED" : "APPROVED") as
        | "REQUESTED"
        | "APPROVED"
        | "REJECTED"
        | "EXECUTED",
      requestedById: "system",
      requestedAt: r.createdAt.toISOString(),
      decidedById: r.processedById,
      decidedAt: r.processedAt ? r.processedAt.toISOString() : null,
      executedById: r.processedById,
      executedAt: r.processedAt ? r.processedAt.toISOString() : null,
      settlementReference: r.refundReference || `REF-${r.id.slice(0, 8)}`,
    }));

    return NextResponse.json({ payments, refunds });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("Fetch payments error:", error);
    return NextResponse.json({ error: "Failed to fetch payments ledger" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["FINANCIER", "ADMIN"]);
    const json = await req.json();
    const data = RecordPaymentSchema.parse(json);

    const amountInr = data.amount || (data.amountPaise ? data.amountPaise / 100 : 0);
    if (amountInr <= 0) {
      return NextResponse.json({ error: "Payment amount must be greater than zero" }, { status: 400 });
    }

    const transactionNumber = generateTransactionNumber("PMT");

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.studentPayment.create({
        data: {
          studentProfileId: data.studentProfileId,
          feeAgreementId: data.feeAgreementId,
          transactionNumber,
          amount: amountInr,
          currency: data.currency || "INR",
          paymentMethod: data.paymentMethod,
          externalReference: data.externalReference || transactionNumber,
          verificationStatus: "CONFIRMED",
          verifiedById: session.userId,
          verifiedAt: new Date(),
          collectedById: session.userId,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
          notes: data.notes,
        },
      });

      const receiptNumber = `REC-${transactionNumber.slice(-8)}`;
      await tx.receipt.create({
        data: {
          studentPaymentId: p.id,
          receiptNumber,
          pdfUrl: `/api/financier/payments/${p.id}/receipt.pdf`,
        },
      });

      return p;
    });

    return NextResponse.json(
      {
        payment: {
          id: payment.id,
          transactionNumber: payment.transactionNumber,
          receiptNumber: `REC-${payment.transactionNumber.slice(-8)}`,
          studentProfileId: payment.studentProfileId,
          studentName: "Student",
          studentEmail: "",
          registrationNumber: "",
          feeAgreementId: payment.feeAgreementId || "",
          invoiceId: null,
          batchId: "",
          batchCode: "",
          trackCode: "FSD",
          trackTitle: "Full Stack Development",
          amountPaise: Math.round(payment.amount * 100),
          refundedPaise: 0,
          currency: "INR" as const,
          paymentMethod: payment.paymentMethod as any,
          paymentDate: payment.paymentDate.toISOString(),
          externalReference: payment.externalReference || payment.transactionNumber,
          verificationStatus: "CONFIRMED" as const,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("Financier record payment error:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
