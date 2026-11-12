import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPaymentGatewayOrder } from "@/lib/payment-gateway";
import { z } from "zod";

const CheckoutSchema = z.object({
  installmentId: z.string().optional().nullable(),
  amount: z.number().min(1, "Amount must be greater than zero"),
  currency: z.string().default("INR"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["STUDENT"]);
    const body = await req.json();
    const parsed = CheckoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
      include: {
        feeAgreements: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!studentProfile || studentProfile.feeAgreements.length === 0) {
      return NextResponse.json(
        { error: "No active fee agreement found for student account" },
        { status: 404 }
      );
    }

    const agreement = studentProfile.feeAgreements[0];

    const orderResult = await createPaymentGatewayOrder({
      studentProfileId: studentProfile.id,
      feeAgreementId: agreement.id,
      installmentId: parsed.data.installmentId || null,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      provider: "SANDBOX",
    });

    return NextResponse.json({
      success: true,
      order: orderResult,
      message: "Payment order successfully initiated.",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("Payment checkout error:", error);
    return NextResponse.json({ error: "Failed to create payment checkout order" }, { status: 500 });
  }
}
