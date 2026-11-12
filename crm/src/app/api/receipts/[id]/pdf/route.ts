import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReceiptPdfBuffer } from "@/lib/pdf-receipt";

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

    // Find receipt by id or by studentPaymentId
    const receipt = await prisma.receipt.findFirst({
      where: {
        OR: [{ id }, { studentPaymentId: id }],
      },
      include: {
        studentProfile: true,
      },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Receipt record not found" }, { status: 404 });
    }

    const isOwnerStudent =
      session.role === "STUDENT" && receipt.studentProfile.userId === session.userId;
    const isStaff = ["ADMIN", "FINANCIER", "MANAGER"].includes(session.role);

    if (!isOwnerStudent && !isStaff) {
      return NextResponse.json(
        { error: "Access denied. You are not authorized to view this receipt." },
        { status: 403 }
      );
    }

    const pdfBuffer = await generateReceiptPdfBuffer(receipt.id);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Receipt-${receipt.receiptNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Receipt PDF error:", error);
    return NextResponse.json({ error: "Failed to render receipt PDF" }, { status: 500 });
  }
}
