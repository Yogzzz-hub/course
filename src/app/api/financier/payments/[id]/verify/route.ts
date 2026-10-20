import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateReceiptNumber,
  calculatePaymentAllocations,
  recordLedgerEntry,
} from "@/lib/finance";
import { logAuditEvent } from "@/lib/audit";
import { dispatchNotification } from "@/lib/notification";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(["FINANCIER", "ADMIN"]);
    const { id } = await params;

    const payment = await prisma.studentPayment.findUnique({
      where: { id },
      include: {
        studentProfile: { include: { user: true } },
        feeAgreement: {
          include: {
            installments: { orderBy: { installmentNumber: "asc" } },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment transaction record not found" }, { status: 404 });
    }

    if (payment.verificationStatus === "CONFIRMED") {
      return NextResponse.json(
        { error: "This payment has already been verified and confirmed." },
        { status: 400 }
      );
    }

    if (payment.verificationStatus === "FAILED" || payment.verificationStatus === "REVERSED") {
      return NextResponse.json(
        { error: `Cannot verify payment in ${payment.verificationStatus} state.` },
        { status: 400 }
      );
    }

    // Execute atomic verification transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark confirmed
      const verifiedPayment = await tx.studentPayment.update({
        where: { id },
        data: {
          verificationStatus: "CONFIRMED",
          verifiedById: session.userId,
          verifiedAt: new Date(),
        },
      });

      // 2. Allocate payment to installments if feeAgreement exists
      let totalRemaining = 0;
      if (payment.feeAgreement && payment.feeAgreement.installments.length > 0) {
        const allocations = calculatePaymentAllocations(
          payment.amount,
          payment.feeAgreement.installments
        );

        for (const alloc of allocations) {
          await tx.paymentAllocation.create({
            data: {
              paymentId: payment.id,
              installmentId: alloc.installmentId,
              allocatedAmount: alloc.allocatedAmount,
            },
          });

          const status = alloc.newRemainingBalance <= 0.01 ? "PAID" : "PARTIALLY_PAID";

          await tx.feeInstallment.update({
            where: { id: alloc.installmentId },
            data: {
              remainingBalance: alloc.newRemainingBalance,
              amountPaid: { increment: alloc.allocatedAmount },
              status,
              lastPaymentDate: new Date(),
            },
          });
        }

        totalRemaining = payment.feeAgreement.installments.reduce((sum, inst) => {
          const alloc = allocations.find((a) => a.installmentId === inst.id);
          const rem = alloc ? alloc.newRemainingBalance : inst.remainingBalance;
          return sum + rem;
        }, 0);
      }

      // 3. Generate Receipt
      const receiptNumber = await generateReceiptNumber();
      const receipt = await tx.receipt.create({
        data: {
          receiptNumber,
          studentPaymentId: payment.id,
          studentProfileId: payment.studentProfileId,
          totalPaid: payment.amount,
          balanceRemaining: Math.max(0, totalRemaining),
          pdfUrl: `/api/receipts/${payment.id}/pdf`,
          issuedById: session.userId,
        },
      });

      // 4. Record in Financial Ledger
      const accountCode = payment.paymentMethod === "CASH" ? "CASH" : "BANK";
      await recordLedgerEntry(
        {
          transactionType: "PAYMENT",
          direction: "CREDIT",
          amount: payment.amount,
          currency: payment.currency,
          accountCode,
          referenceType: "StudentPayment",
          referenceId: payment.id,
          studentProfileId: payment.studentProfileId,
          notes: `Verified manual payment ${payment.transactionNumber}. Method: ${payment.paymentMethod}.`,
          createdById: session.userId,
        },
        tx
      );

      return { verifiedPayment, receipt };
    });

    await logAuditEvent({
      userId: session.userId,
      action: "PAYMENT_VERIFIED",
      entityType: "StudentPayment",
      entityId: payment.id,
      details: {
        transactionNumber: payment.transactionNumber,
        amount: payment.amount,
        receiptNumber: result.receipt.receiptNumber,
      },
    });

    // Notify student
    await dispatchNotification({
      recipientId: payment.studentProfile.userId,
      recipientContact: payment.studentProfile.user.email,
      channel: "EMAIL",
      eventType: "PAYMENT_CONFIRMED",
      subject: "Payment Confirmed — Receipt {{receipt_number}}",
      message:
        "Hello {{student_name}}, your payment of {{amount}} has been officially verified and confirmed. Receipt #{{receipt_number}} is now available.",
      variables: {
        student_name: payment.studentProfile.user.name,
        amount: `${payment.currency} ${payment.amount}`,
        receipt_number: result.receipt.receiptNumber,
      },
      linkUrl: "/student/fees",
    });

    return NextResponse.json({
      success: true,
      payment: result.verifiedPayment,
      receiptNumber: result.receipt.receiptNumber,
      message: `Payment verified. Official receipt #${result.receipt.receiptNumber} issued.`,
    });
  } catch (error: any) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 });
  }
}
