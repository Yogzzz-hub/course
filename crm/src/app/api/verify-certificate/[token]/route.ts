import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const cleanToken = token.trim().toLowerCase();

    const cert = await prisma.certificate.findUnique({
      where: { verificationToken: cleanToken },
      include: {
        template: { select: { academyName: true } },
      },
    });

    if (!cert) {
      return NextResponse.json(
        {
          isValid: false,
          status: "NOT_FOUND",
          message: "No authentic certificate credential corresponds to this verification token.",
        },
        { status: 404 }
      );
    }

    // Log verification event asynchronously
    try {
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
      const ua = req.headers.get("user-agent") || "unknown";
      await prisma.certificateVerificationEvent.create({
        data: {
          certificateId: cert.id,
          ipAddress: ip.substring(0, 45),
          userAgent: ua.substring(0, 255),
        },
      });
    } catch {}

    const isValid = cert.status === "ISSUED";

    return NextResponse.json({
      isValid,
      status: cert.status,
      certificateNumber: cert.certificateNumber,
      studentName: cert.studentName,
      courseTitle: cert.courseTitle,
      issueDate: cert.issueDate,
      completionDate: cert.completionDate,
      academyName: cert.template?.academyName || "Apex Global Academy",
      revocationReason: cert.status === "REVOKED" ? cert.revocationReason : null,
      verificationToken: cert.verificationToken,
    });
  } catch (error: any) {
    console.error("Certificate verification error:", error);
    return NextResponse.json({ error: "Verification service temporarily unavailable" }, { status: 500 });
  }
}
