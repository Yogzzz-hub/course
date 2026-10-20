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

    const quizzes = await prisma.quiz.findMany({
      where: {
        batchId: { in: batchIds },
        publicationStatus: { in: ["OPEN", "SCHEDULED", "RESULTS_PUBLISHED"] },
      },
      include: {
        course: { select: { id: true, title: true, code: true } },
        batch: { select: { id: true, code: true } },
        attempts: {
          where: { studentProfileId: studentProfile.id },
          orderBy: { attemptNumber: "desc" },
        },
        _count: {
          select: { questions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = quizzes.map((q) => {
      const latestAttempt = q.attempts[0] || null;
      return {
        id: q.id,
        title: q.title,
        instructions: q.instructions,
        quizType: q.quizType,
        maxMarks: q.maxMarks,
        passMarks: q.passMarks,
        durationMinutes: q.durationMinutes,
        allowedAttempts: q.allowedAttempts,
        publicationStatus: q.publicationStatus,
        startDate: q.startDate,
        endDate: q.endDate,
        questionCount: q._count.questions,
        course: q.course,
        batch: q.batch,
        attemptCount: q.attempts.length,
        latestAttempt: latestAttempt
          ? {
              id: latestAttempt.id,
              attemptNumber: latestAttempt.attemptNumber,
              status: latestAttempt.status,
              startedAt: latestAttempt.startedAt,
              expiresAt: latestAttempt.expiresAt,
              submittedAt: latestAttempt.submittedAt,
              totalScore: latestAttempt.totalScore,
              isPassed: latestAttempt.isPassed,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      quizzes: formatted,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load quizzes" },
      { status: error.status || 500 }
    );
  }
}
