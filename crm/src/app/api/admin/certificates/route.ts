import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { issueStudentCertificate } from "@/lib/certificate";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const IssueCertificateSchema = z.object({
  completionDecisionId: z.string().min(1, "Completion decision ID is required"),
  templateId: z.string().optional().nullable(),
});

export async function GET() {
  try {
    await requireAuth(["ADMIN", "MANAGER"]);

    const [certificates, eligibleCompletions, templates] = await Promise.all([
      prisma.certificate.findMany({
        include: {
          studentProfile: {
            include: { user: { select: { name: true, email: true } } },
          },
          course: { select: { code: true, title: true } },
          batch: { select: { code: true } },
          template: true,
        },
        orderBy: { issueDate: "desc" },
      }),
      // Eligible completions without an active certificate
      prisma.studentCompletionDecision.findMany({
        where: {
          status: "APPROVED",
          isEligible: true,
          certificate: null,
        },
        include: {
          studentProfile: {
            include: { user: { select: { name: true, email: true } } },
          },
          batch: {
            include: { course: true },
          },
        },
        orderBy: { decidedAt: "desc" },
      }),
      prisma.certificateTemplate.findMany(),
    ]);

    return NextResponse.json({
      certificates,
      eligibleCompletions,
      templates,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch certificates ledger" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["ADMIN"]);
    const body = await req.json();
    const parsed = IssueCertificateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const { completionDecisionId, templateId } = parsed.data;

    const decision = await prisma.studentCompletionDecision.findUnique({
      where: { id: completionDecisionId },
      include: {
        batch: true,
      },
    });

    if (!decision) {
      return NextResponse.json({ error: "Completion decision record not found" }, { status: 404 });
    }

    const result = await issueStudentCertificate({
      studentProfileId: decision.studentProfileId,
      courseId: decision.batch.courseId,
      batchId: decision.batchId,
      completionDecisionId: decision.id,
      issuedById: session.userId,
      templateId: templateId || undefined,
    });

    await logAuditEvent({
      userId: session.userId,
      action: "CERTIFICATE_ISSUED",
      entityType: "Certificate",
      entityId: result.certificate.id,
      details: {
        certificateNumber: result.certificate.certificateNumber,
        studentName: result.certificate.studentName,
        course: result.certificate.courseTitle,
      },
    });

    return NextResponse.json({
      success: true,
      certificate: result.certificate,
      message: result.message,
    });
  } catch (error: any) {
    console.error("Certificate issuance error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to issue certificate" },
      { status: 400 }
    );
  }
}
