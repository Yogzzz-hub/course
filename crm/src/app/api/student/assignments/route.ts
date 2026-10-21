import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireAuth(["STUDENT"]);

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          select: { batchId: true },
        },
      },
    });

    if (!studentProfile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const batchIds = studentProfile.enrollments.map((e) => e.batchId);

    const assignments = await prisma.assignment.findMany({
      where: {
        batchId: { in: batchIds },
        publicationStatus: { in: ["PUBLISHED", "CLOSED"] },
      },
      include: {
        course: { select: { id: true, title: true, code: true } },
        batch: { select: { id: true, code: true } },
        rubricCriteria: { orderBy: { orderIndex: "asc" } },
        submissions: {
          where: { studentProfileId: studentProfile.id },
          include: { grade: true },
          orderBy: { attemptNumber: "desc" },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    const formatted = assignments.map((a) => {
      const latestSubmission = a.submissions[0] || null;
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        maxMarks: a.maxMarks,
        dueDate: a.dueDate,
        allowedSubmissionTypes: a.allowedSubmissionTypes,
        lateSubmissionPolicy: a.lateSubmissionPolicy,
        maxAttempts: a.maxAttempts,
        publicationStatus: a.publicationStatus,
        course: a.course,
        batch: a.batch,
        submissionCount: a.submissions.length,
        latestSubmission: latestSubmission
          ? {
              id: latestSubmission.id,
              attemptNumber: latestSubmission.attemptNumber,
              status: latestSubmission.status,
              submittedAt: latestSubmission.submittedAt,
              isLate: latestSubmission.isLate,
              grade: latestSubmission.grade
                ? {
                    marksAwarded: latestSubmission.grade.marksAwarded,
                    maxMarks: latestSubmission.grade.maxMarks,
                    feedback: latestSubmission.grade.feedback,
                    rubricScoresJson: latestSubmission.grade.rubricScoresJson,
                  }
                : null,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      assignments: formatted,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load assignments" },
      { status: error.status || 500 }
    );
  }
}
