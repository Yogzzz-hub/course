import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateExpenseNumber, recordLedgerEntry, roundCurrency } from "@/lib/finance";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const RecordExpenseSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().min(3, "Description is required"),
  amount: z.number().min(1, "Amount must be greater than zero"),
  currency: z.string().default("INR"),
  paidTo: z.string().min(2, "Payee name is required"),
  paymentMethod: z.enum(["BANK_TRANSFER", "UPI", "CASH", "CARD", "OTHER"]).default("BANK_TRANSFER"),
  reference: z.string().optional().nullable(),
  receiptAttachmentUrl: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["FINANCIER", "ADMIN"]);
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");

    const where: any = {};
    if (categoryId && categoryId !== "ALL") {
      where.categoryId = categoryId;
    }

    const [expenses, categories] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          category: true,
          recorder: { select: { name: true } },
          approver: { select: { name: true } },
        },
        orderBy: { expenseDate: "desc" },
      }),
      prisma.expenseCategory.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const totalExpenseAmount = roundCurrency(
      expenses.reduce((sum, e) => sum + e.amount, 0)
    );

    return NextResponse.json({ expenses, categories, totalExpenseAmount });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["FINANCIER", "ADMIN"]);
    const body = await req.json();
    const parsed = RecordExpenseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const {
      categoryId,
      description,
      amount,
      currency,
      paidTo,
      paymentMethod,
      reference,
      receiptAttachmentUrl,
    } = parsed.data;

    const expenseNumber = await generateExpenseNumber();

    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          expenseNumber,
          categoryId,
          description: description.trim(),
          amount: roundCurrency(amount),
          currency,
          paidTo: paidTo.trim(),
          paymentMethod,
          reference: reference?.trim() || null,
          receiptAttachmentUrl: receiptAttachmentUrl?.trim() || null,
          status: "APPROVED",
          recordedById: session.userId,
          approvedById: session.userId,
          approvedAt: new Date(),
        },
        include: { category: true },
      });

      // Record in Financial Ledger
      await recordLedgerEntry(
        {
          transactionType: "EXPENSE",
          direction: "DEBIT",
          amount: expense.amount,
          currency: expense.currency,
          accountCode: "OPERATING_EXPENSE",
          referenceType: "Expense",
          referenceId: expense.id,
          notes: `Expense ${expenseNumber} — ${description} (${expense.category.name}). Paid to: ${paidTo}`,
          createdById: session.userId,
        },
        tx
      );

      return expense;
    });

    await logAuditEvent({
      userId: session.userId,
      action: "EXPENSE_RECORDED",
      entityType: "Expense",
      entityId: result.id,
      details: {
        expenseNumber,
        category: result.category.name,
        amount: result.amount,
        paidTo,
      },
    });

    return NextResponse.json({
      success: true,
      expense: result,
      message: `Expense ${expenseNumber} recorded and ledger updated.`,
    });
  } catch (error: any) {
    console.error("Record expense error:", error);
    return NextResponse.json({ error: "Failed to record expense" }, { status: 500 });
  }
}
