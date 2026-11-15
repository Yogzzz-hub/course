import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const [invoices, discounts] = await Promise.all([
      prisma.invoice.findMany({
        include: {
          lines: true,
          studentProfile: {
            include: {
              user: true,
              admissions: {
                include: {
                  course: true,
                  targetBatch: true,
                },
              },
            },
          },
        },
        orderBy: { issueDate: "desc" },
      }),
      prisma.financialApprovalRequest.findMany({
        where: { requestType: "DISCOUNT" },
        include: {
          requestedBy: true,
          approvedBy: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const formattedInvoices = invoices.map((inv) => {
      const admission = inv.studentProfile?.admissions?.[0];
      const isPaid = inv.status === "PAID";
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        studentProfileId: inv.studentProfileId,
        studentName: inv.studentProfile?.user?.name || "Student",
        studentEmail: inv.studentProfile?.user?.email || "—",
        registrationNumber: inv.studentProfile?.registrationNumber || "—",
        batchId: admission?.targetBatchId || "batch-default",
        batchCode: admission?.targetBatch?.code || "BATCH-DEFAULT",
        trackCode: admission?.course?.code || "PY-FS",
        trackTitle: admission?.course?.title || "Technical Engineering",
        feeAgreementId: inv.feeAgreementId,
        issueDate: inv.issueDate.toISOString(),
        dueDate: inv.dueDate.toISOString(),
        grossAmountPaise: Math.round(inv.grossAmount * 100),
        discountAmountPaise: Math.round(inv.discountAmount * 100),
        taxAmountPaise: Math.round(inv.taxAmount * 100),
        netTotalPaise: Math.round(inv.netTotal * 100),
        paidAmountPaise: isPaid ? Math.round(inv.netTotal * 100) : 0,
        currency: "INR",
        status: inv.status,
        notes: inv.notes,
        sentAt: inv.createdAt.toISOString(),
        voidedAt: null,
        voidReason: null,
        createdById: "usr-admin",
        lines: inv.lines.map((l) => ({
          id: l.id,
          description: l.description,
          quantity: l.quantity,
          unitPricePaise: Math.round(l.unitPrice * 100),
          totalPaise: Math.round(l.total * 100),
        })),
      };
    });

    const formattedDiscounts = discounts.map((d) => ({
      id: d.id,
      studentProfileId: d.targetEntityId || "stu-1",
      studentName: "Student",
      feeAgreementId: "fa-1",
      invoiceId: null,
      kind: "FIXED",
      basisPoints: null,
      amountPaise: Math.round(d.amount * 100),
      reason: d.justification,
      status: d.status,
      requestedById: d.requestedById,
      requestedByName: d.requestedBy?.name || "Staff",
      requestedAt: d.createdAt.toISOString(),
      approvedById: d.approvedById,
      approvedByName: d.approvedBy?.name || null,
    }));

    return NextResponse.json({
      invoices: formattedInvoices,
      discounts: formattedDiscounts,
    });
  } catch (error: any) {
    console.error("[Financier Invoices API Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices", details: error.message },
      { status: 500 }
    );
  }
}
