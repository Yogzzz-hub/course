import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordLedgerEntry } from "@/lib/finance";
import { logAuditEvent } from "@/lib/audit";
import { dispatchNotification } from "@/lib/notification";
import { z } from "zod";

const ExecutePayoutSchema = z.object({
  paymentMethod: z.enum(["BANK_TRANSFER", "UPI", "CASH", "OTHER"]).default("BANK_TRANSFER"),
  paymentReference: z.string().min(2, "Bank reference / transaction UTR is required"),
  notes: z.string().optional().nullable(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(["FINANCIER", "ADMIN"]);
    const { id } = await params;
    const body = await req.json();
    const parsed = ExecutePayoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const payout = await prisma.trainerPayout.findUnique({
      where: { id },
      include: {
        trainerProfile: { include: { user: true } },
        payrollPeriod: true,
      },
    });

    if (!payout) {
      return NextResponse.json({ error: "Trainer payout record not found" }, { status: 404 });
    }

    // Critical Requirement: Cannot execute payout without Admin approval!
    if (payout.adminApprovalStatus !== "APPROVED") {
      return NextResponse.json(
        {
          error: `Cannot process payout. Admin approval status is '${payout.adminApprovalStatus}'. Executive Admin approval is strictly required prior to financial disbursement.`,
        },
        { status: 403 }
      );
    }

    if (payout.paymentStatus === "CONFIRMED_PAID") {
      return NextResponse.json(
        { error: "This trainer payout has already been confirmed as paid." },
        { status: 400 }
      );
    }

    // Execute atomic payout execution
    const updated = await prisma.$transaction(async (tx) => {
      const executed = await tx.trainerPayout.update({
        where: { id },
        data: {
          paymentStatus: "CONFIRMED_PAID",
          paidAmount: payout.totalPayable,
          paidAt: new Date(),
          paymentMethod: parsed.data.paymentMethod,
          paymentReference: parsed.data.paymentReference.trim(),
          executedById: session.userId,
          notes: parsed.data.notes?.trim() || null,
        },
      });

      // Record in Financial Ledger
      await recordLedgerEntry(
        {
          transactionType: "TRAINER_PAYOUT",
          direction: "DEBIT",
          amount: payout.totalPayable,
          currency: "INR",
          accountCode: "TRAINER_PAYABLE",
          referenceType: "TrainerPayout",
          referenceId: payout.id,
          notes: `Confirmed trainer payout for ${payout.trainerProfile.user.name} (${payout.payrollPeriod.periodName}). Ref: ${parsed.data.paymentReference}`,
          createdById: session.userId,
        },
        tx
      );

      return executed;
    });

    await logAuditEvent({
      userId: session.userId,
      action: "TRAINER_PAYOUT_EXECUTED",
      entityType: "TrainerPayout",
      entityId: payout.id,
      details: {
        trainerName: payout.trainerProfile.user.name,
        periodName: payout.payrollPeriod.periodName,
        paidAmount: payout.totalPayable,
        reference: parsed.data.paymentReference,
      },
    });

    // Notify trainer
    await dispatchNotification({
      recipientId: payout.trainerProfile.userId,
      recipientContact: payout.trainerProfile.user.email,
      channel: "EMAIL",
      eventType: "PAYOUT_CONFIRMED",
      subject: "Trainer Compensation Disbursed — {{period_name}}",
      message:
        "Hello {{trainer_name}}, your compensation payment of {{amount}} for {{period_name}} has been confirmed and disbursed via {{method}}. Reference: {{reference}}.",
      variables: {
        trainer_name: payout.trainerProfile.user.name,
        amount: `INR ${payout.totalPayable}`,
        period_name: payout.payrollPeriod.periodName,
        method: parsed.data.paymentMethod,
        reference: parsed.data.paymentReference,
      },
      linkUrl: "/trainer/earnings",
    });

    return NextResponse.json({
      success: true,
      payout: updated,
      message: `Trainer payout confirmed paid for ${payout.trainerProfile.user.name}.`,
    });
  } catch (error: any) {
    console.error("Execute payout error:", error);
    return NextResponse.json({ error: "Failed to execute trainer payout" }, { status: 500 });
  }
}
