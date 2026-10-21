import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roundCurrency, recordLedgerEntry } from "@/lib/finance";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const ExecuteRefundSchema = z.object({
  refundMethod: z.enum(["ORIGINAL_METHOD", "BANK_TRANSFER", "CASH", "UPI"]).default("BANK_TRANSFER"),
  externalReference: z.string().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(["FINANCIER", "ADMIN"]);
    const { id } = await params;
    const body = await req.json();
    const parsed = ExecuteRefundSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const refundRequest = await prisma.refundRequest.findUnique({
      where: { id },
      include: {
        studentPayment: {
          include: {
            feeAgreement: {
              include: { installments: { orderBy: { installmentNumber: "desc" } } },
            },
          },
        },
      },
    });

    if (!refundRequest) {
      return NextResponse.json({ error: "Refund request record not found" }, { status: 404 });
    }

    // Critical Requirement: Cannot execute refund without Admin approval!
    if (refundRequest.status !== "APPROVED") {
      return NextResponse.json(
        {
          error: `Cannot execute refund in '${refundRequest.status}' status. Executive Admin approval is strictly required before execution.`,
        },
        { status: 403 }
      );
    }

    const payment = refundRequest.studentPayment;

    // Execute atomic refund transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Refund record
      const refund = await tx.refund.create({
        data: {
          refundRequestId: refundRequest.id,
          studentPaymentId: payment.id,
          amount: refundRequest.requestedAmount,
          refundMethod: parsed.data.refundMethod,
          externalReference: parsed.data.externalReference || null,
          status: "CONFIRMED",
          executedById: session.userId,
          executedAt: new Date(),
        },
      });

      // 2. Adjust payment status if fully refunded
      const totalRefundedOnPayment =
        (await tx.refund.aggregate({
          where: { studentPaymentId: payment.id, status: "CONFIRMED" },
          _sum: { amount: true },
        }))._sum.amount || 0;

      const isFullyRefunded = totalRefundedOnPayment >= payment.amount - 0.01;
      await tx.studentPayment.update({
        where: { id: payment.id },
        data: {
          verificationStatus: isFullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED",
        },
      });

      // 3. Reverse installment allocation (re-increasing student's remaining balance)
      let unreversed = refundRequest.requestedAmount;
      if (payment.feeAgreement && payment.feeAgreement.installments.length > 0) {
        for (const inst of payment.feeAgreement.installments) {
          if (unreversed <= 0.001) break;
          const reversableOnInst = inst.amountPaid;
          if (reversableOnInst <= 0.001) continue;

          const toReverse = roundCurrency(Math.min(unreversed, reversableOnInst));
          const newRemaining = roundCurrency(inst.remainingBalance + toReverse);
          const newPaid = roundCurrency(Math.max(0, inst.amountPaid - toReverse));

          await tx.feeInstallment.update({
            where: { id: inst.id },
            data: {
              remainingBalance: newRemaining,
              amountPaid: newPaid,
              status: newRemaining > 0.01 ? "PARTIALLY_PAID" : "PAID",
            },
          });

          unreversed = roundCurrency(unreversed - toReverse);
        }
      }

      // 4. Record in Financial Ledger
      const ledgerEntry = await recordLedgerEntry(
        {
          transactionType: "REFUND",
          direction: "DEBIT",
          amount: refundRequest.requestedAmount,
          currency: payment.currency,
          accountCode: "BANK",
          referenceType: "Refund",
          referenceId: refund.id,
          studentProfileId: refundRequest.studentProfileId,
          notes: `Executed approved refund for payment ${payment.transactionNumber}. Method: ${parsed.data.refundMethod}. Ref: ${parsed.data.externalReference || "N/A"}`,
          createdById: session.userId,
        },
        tx
      );

      await tx.refund.update({
        where: { id: refund.id },
        data: { ledgerEntryId: ledgerEntry.id },
      });

      return refund;
    });

    await logAuditEvent({
      userId: session.userId,
      action: "REFUND_EXECUTED",
      entityType: "Refund",
      entityId: result.id,
      details: {
        paymentTransactionNumber: payment.transactionNumber,
        amount: refundRequest.requestedAmount,
        refundMethod: parsed.data.refundMethod,
      },
    });

    return NextResponse.json({
      success: true,
      refund: result,
      message: "Approved refund successfully executed. Ledger and student balances updated.",
    });
  } catch (error: any) {
    console.error("Execute refund error:", error);
    return NextResponse.json({ error: "Failed to execute refund" }, { status: 500 });
  }
}
