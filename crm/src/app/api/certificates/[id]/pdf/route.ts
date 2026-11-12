import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCertificatePdfBuffer } from "@/lib/certificate";

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

    const cert = await prisma.certificate.findUnique({
      where: { id },
      include: {
        studentProfile: true,
      },
    });

    if (!cert) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    // Role-based security check: Admin, Financier, Manager OR the owner student
    const isOwnerStudent =
      session.role === "STUDENT" && cert.studentProfile.userId === session.userId;
    const isStaff = ["ADMIN", "FINANCIER", "MANAGER"].includes(session.role);

    if (!isOwnerStudent && !isStaff) {
      return NextResponse.json(
        { error: "Access denied. You are not authorized to view this certificate." },
        { status: 403 }
      );
    }

    const pdfBuffer = await generateCertificatePdfBuffer(cert.id);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Certificate-${cert.certificateNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Certificate PDF error:", error);
    return NextResponse.json({ error: "Failed to render certificate PDF" }, { status: 500 });
  }
}
