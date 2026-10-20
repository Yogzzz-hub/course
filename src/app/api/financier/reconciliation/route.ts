import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roundCurrency } from "@/lib/finance";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const RecordReconciliationSchema = z.object({
  channel: z.enum(["CASH", "BANK", "UPI", "GATEWAY", "PAYOUTS", "EXPENSES"]),
  expectedAmount: z.number(),
  actualAmount: z.number(),
  discrepancyReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  try {
    await requireAuth(["FINANCIER", "ADMIN"]);

    const records = await prisma.reconciliationRecord.findMany({
      orderBy: { reconciliationDate: "desc" },
    });

    return NextResponse.json({ records });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch reconciliation records" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["FINANCIER", "ADMIN"]);
    const body = await req.json();
    const parsed = RecordReconciliationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const { channel, expectedAmount, actualAmount, discrepancyReason, notes } = parsed.data;

    const discrepancy = roundCurrency(Math.abs(expectedAmount - actualAmount));
    const isBalanced = discrepancy <= 0.01;
    const status = isBalanced ? "BALANCED" : "DISCREPANCY_FLAGGED";

    const record = await prisma.reconciliationRecord.create({
      data: {
        channel,
        expectedAmount: roundCurrency(expectedAmount),
        actualAmount: roundCurrency(actualAmount),
        discrepancyAmount: discrepancy,
        status,
        discrepancyReason: isBalanced ? null : discrepancyReason?.trim() || "Unexplained variance",
        notes: notes?.trim() || null,
        reviewedById: session.userId,
      },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "RECONCILIATION_PERFORMED",
      entityType: "ReconciliationRecord",
      entityId: record.id,
      details: {
        channel,
        expectedAmount,
        actualAmount,
        discrepancy,
        status,
      },
    });

    return NextResponse.json({
      success: true,
      record,
      message: isBalanced
        ? `Reconciliation for ${channel} balanced with zero variance.`
        : `Reconciliation variance of ${discrepancy} flagged for investigation.`,
    });
  } catch (error: any) {
    console.error("Reconciliation error:", error);
    return NextResponse.json({ error: "Failed to record reconciliation" }, { status: 500 });
  }
}
