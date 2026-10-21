import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const RevokeCertificateSchema = z.object({
  revocationReason: z.string().min(5, "A documented justification is required for certificate revocation"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(["ADMIN"]);
    const { id } = await params;
    const body = await req.json();
    const parsed = RevokeCertificateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const cert = await prisma.certificate.findUnique({ where: { id } });
    if (!cert) {
      return NextResponse.json({ error: "Certificate record not found" }, { status: 404 });
    }

    if (cert.status === "REVOKED") {
      return NextResponse.json(
        { error: "This certificate has already been revoked." },
        { status: 400 }
      );
    }

    const updated = await prisma.certificate.update({
      where: { id },
      data: {
        status: "REVOKED",
        revocationReason: parsed.data.revocationReason.trim(),
        revokedAt: new Date(),
      },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "CERTIFICATE_REVOKED",
      entityType: "Certificate",
      entityId: cert.id,
      details: {
        certificateNumber: cert.certificateNumber,
        studentName: cert.studentName,
        reason: parsed.data.revocationReason,
      },
    });

    return NextResponse.json({
      success: true,
      certificate: updated,
      message: `Certificate ${cert.certificateNumber} officially revoked.`,
    });
  } catch (error: any) {
    console.error("Revoke certificate error:", error);
    return NextResponse.json({ error: "Failed to revoke certificate" }, { status: 500 });
  }
}
