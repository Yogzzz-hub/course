import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireAuth(["MANAGER", "ADMIN"]);

    const [
      batches,
      activeAlerts,
      pendingAssignmentReviews,
      pendingQuizReviews,
      feedbackCount,
    ] = await Promise.all([
      prisma.batch.findMany({
        where: {
          status: { in: ["ACTIVE", "UPCOMING", "TEACHING_COMPLETE"] },
        },
        include: {
          course: { select: { id: true, title: true, code: true } },
          _count: {
            select: {
              enrollments: true,
              assignments: true,
              quizzes: true,
              academicAlerts: true,
            },
          },
        },
      }),
      prisma.academicAlert.findMany({
        where: { status: "OPEN" },
        include: {
          studentProfile: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          batch: { select: { id: true, code: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.assignmentSubmission.count({
        where: { status: { in: ["SUBMITTED", "LATE_SUBMITTED", "UNDER_REVIEW"] } },
      }),
      prisma.quizAttempt.count({
        where: { status: "PENDING_EVALUATION" },
      }),
      prisma.academicFeedback.count({
        where: { reviewStatus: "SUBMITTED" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      summary: {
        activeBatchesCount: batches.length,
        totalActiveAlerts: activeAlerts.length,
        pendingAssignmentReviews,
        pendingQuizReviews,
        pendingFeedbackReviews: feedbackCount,
      },
      batches: batches.map((b) => ({
        id: b.id,
        code: b.code,
        courseTitle: b.course.title,
        studentsCount: b._count.enrollments,
        assignmentsCount: b._count.assignments,
        quizzesCount: b._count.quizzes,
        openAlertsCount: b._count.academicAlerts,
      })),
      activeAlerts,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load manager academic analytics" },
      { status: error.status || 500 }
    );
  }
}
