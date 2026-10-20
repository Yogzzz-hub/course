import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateStudentFinancialSummary } from "@/lib/finance";

export async function GET() {
  try {
    const session = await requireAuth(["STUDENT"]);

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
      include: {
        user: true,
        admissions: {
          include: {
            course: true,
            targetBatch: true,
            feeAgreements: {
              include: {
                installments: { orderBy: { installmentNumber: "asc" } },
              },
            },
          },
        },
      },
    });

    if (!studentProfile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const summary = await calculateStudentFinancialSummary(studentProfile.id);

    // Fetch payments history
    const payments = await prisma.studentPayment.findMany({
      where: { studentProfileId: studentProfile.id },
      include: {
        receipt: true,
        allocations: {
          include: { installment: true },
        },
      },
      orderBy: { paymentDate: "desc" },
    });

    // Fetch invoices
    const invoices = await prisma.invoice.findMany({
      where: { studentProfileId: studentProfile.id },
      orderBy: { issueDate: "desc" },
    });

    // Fetch receipts
    const receipts = await prisma.receipt.findMany({
      where: { studentProfileId: studentProfile.id, isVoid: false },
      include: { studentPayment: true },
      orderBy: { receiptDate: "desc" },
    });

    return NextResponse.json({
      summary,
      payments: payments.map((p) => ({
        id: p.id,
        transactionNumber: p.transactionNumber,
        amount: p.amount,
        currency: p.currency,
        paymentMethod: p.paymentMethod,
        paymentDate: p.paymentDate,
        verificationStatus: p.verificationStatus,
        externalReference: p.externalReference,
        notes: p.notes,
        receiptId: p.receipt?.id || null,
        receiptNumber: p.receipt?.receiptNumber || null,
      })),
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        grossAmount: inv.grossAmount,
        discountAmount: inv.discountAmount,
        netTotal: inv.netTotal,
        currency: inv.currency,
        status: inv.status,
        pdfUrl: `/api/invoices/${inv.id}/pdf`,
      })),
      receipts: receipts.map((r) => ({
        id: r.id,
        receiptNumber: r.receiptNumber,
        receiptDate: r.receiptDate,
        totalPaid: r.totalPaid,
        balanceRemaining: r.balanceRemaining,
        currency: r.studentPayment.currency,
        paymentMethod: r.studentPayment.paymentMethod,
        pdfUrl: `/api/receipts/${r.id}/pdf`,
      })),
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("Student fees API error:", error);
    return NextResponse.json({ error: "Failed to load student fee account" }, { status: 500 });
  }
}
