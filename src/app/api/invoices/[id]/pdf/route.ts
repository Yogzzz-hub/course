import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInvoicePdfBuffer } from "@/lib/pdf-invoice";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        studentProfile: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice record not found" }, { status: 404 });
    }

    const isOwnerStudent =
      session.role === "STUDENT" && invoice.studentProfile.userId === session.userId;
    const isStaff = ["ADMIN", "FINANCIER", "MANAGER"].includes(session.role);

    if (!isOwnerStudent && !isStaff) {
      return NextResponse.json(
        { error: "Access denied. You are not authorized to view this invoice." },
        { status: 403 }
      );
    }

    const pdfBuffer = await generateInvoicePdfBuffer(invoice.id);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Invoice PDF error:", error);
    return NextResponse.json({ error: "Failed to render invoice PDF" }, { status: 500 });
  }
}
