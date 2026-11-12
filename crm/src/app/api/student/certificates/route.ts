import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireAuth(["STUDENT"]);

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
      include: {
        certificates: {
          include: {
            course: true,
            batch: true,
            template: true,
          },
          orderBy: { issueDate: "desc" },
        },
        completionDecisions: {
          where: { status: "APPROVED", isEligible: true },
          include: {
            batch: { include: { course: true } },
            certificate: true,
          },
        },
      },
    });

    if (!studentProfile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      certificates: studentProfile.certificates.map((c) => ({
        id: c.id,
        certificateNumber: c.certificateNumber,
        courseTitle: c.courseTitle,
        studentName: c.studentName,
        issueDate: c.issueDate,
        completionDate: c.completionDate,
        status: c.status,
        verificationToken: c.verificationToken,
        pdfUrl: `/api/certificates/${c.id}/pdf`,
        verificationUrl: `/verify-certificate/${c.verificationToken}`,
      })),
      completedDecisions: studentProfile.completionDecisions.map((d) => ({
        id: d.id,
        batchCode: d.batch.code,
        courseTitle: d.batch.course.title,
        attendancePercentage: d.attendancePercentage,
        syllabusPercentage: d.syllabusPercentage,
        decidedAt: d.decidedAt,
        hasCertificate: !!d.certificate,
      })),
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to load student certificates" }, { status: 500 });
  }
}
