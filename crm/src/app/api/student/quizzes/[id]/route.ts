import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startQuizAttempt, submitQuizAttempt } from "@/lib/assessment";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(["STUDENT"]);
    const { id: quizId } = await params;

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

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: { select: { id: true, title: true, code: true } },
        batch: { select: { id: true, code: true } },
        questions: {
          include: {
            question: true,
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Verify enrollment
    const isEnrolled = studentProfile.enrollments.some(
      (e) => !quiz.batchId || e.batchId === quiz.batchId
    );

    if (!isEnrolled) {
      return NextResponse.json(
        { error: "Unauthorized: You are not enrolled in this assessment's batch." },
        { status: 403 }
      );
    }

    // Find active or latest attempt
    const activeAttempt = await prisma.quizAttempt.findFirst({
      where: {
        quizId,
        studentProfileId: studentProfile.id,
      },
      include: {
        responses: true,
      },
      orderBy: { attemptNumber: "desc" },
    });

    // Check if results are released
    const canViewAnswers =
      activeAttempt &&
      ["EVALUATED", "AUTO_SUBMITTED", "PUBLISHED"].includes(activeAttempt.status) &&
      quiz.publicationStatus === "RESULTS_PUBLISHED";

    // Strictly redact correctAnswer and explanation if results are not published
    const sanitizedQuestions = quiz.questions.map((qItem) => {
      const q = qItem.question;
      return {
        id: q.id,
        orderIndex: qItem.orderIndex,
        customMarks: qItem.customMarks !== null ? qItem.customMarks : q.marks,
        questionText: q.questionText,
        type: q.type,
        difficulty: q.difficulty,
        options: q.optionsJson ? JSON.parse(q.optionsJson) : [],
        // Only expose answers if authorized for review!
        correctAnswer: canViewAnswers ? q.correctAnswer : undefined,
        explanation: canViewAnswers ? q.explanation : undefined,
      };
    });

    return NextResponse.json({
      success: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        instructions: quiz.instructions,
        quizType: quiz.quizType,
        maxMarks: quiz.maxMarks,
        passMarks: quiz.passMarks,
        durationMinutes: quiz.durationMinutes,
        allowedAttempts: quiz.allowedAttempts,
        publicationStatus: quiz.publicationStatus,
        course: quiz.course,
        batch: quiz.batch,
        questions: sanitizedQuestions,
        activeAttempt,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load quiz" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(["STUDENT"]);
    const { id: quizId } = await params;

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!studentProfile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action || "START"; // START, SAVE_RESPONSE, SUBMIT

    if (action === "START") {
      const attempt = await startQuizAttempt(quizId, studentProfile.id);
      return NextResponse.json({
        success: true,
        message: "Quiz attempt started.",
        attempt,
      });
    }

    if (action === "SAVE_RESPONSE") {
      const { attemptId, questionId, responseJson } = body;
      const attempt = await prisma.quizAttempt.findUnique({
        where: { id: attemptId },
      });

      if (!attempt || attempt.studentProfileId !== studentProfile.id) {
        return NextResponse.json({ error: "Attempt not found or unauthorized" }, { status: 404 });
      }

      if (attempt.status !== "IN_PROGRESS") {
        return NextResponse.json(
          { error: "Attempt is already finalized" },
          { status: 400 }
        );
      }

      // Check server-side expiration (T13 requirement)
      if (new Date() > attempt.expiresAt) {
        const finalized = await submitQuizAttempt(attemptId, true);
        return NextResponse.json(
          {
            error: "Assessment time has expired. Attempt auto-submitted.",
            attempt: finalized,
          },
          { status: 400 }
        );
      }

      const response = await prisma.quizResponse.upsert({
        where: {
          attemptId_questionId: {
            attemptId,
            questionId,
          },
        },
        update: {
          responseJson: String(responseJson || ""),
        },
        create: {
          attemptId,
          questionId,
          responseJson: String(responseJson || ""),
        },
      });

      return NextResponse.json({
        success: true,
        response,
      });
    }

    if (action === "SUBMIT") {
      const { attemptId } = body;
      const attempt = await prisma.quizAttempt.findUnique({
        where: { id: attemptId },
      });

      if (!attempt || attempt.studentProfileId !== studentProfile.id) {
        return NextResponse.json({ error: "Attempt not found or unauthorized" }, { status: 404 });
      }

      const finalized = await submitQuizAttempt(attemptId, false);

      return NextResponse.json({
        success: true,
        message: "Quiz submitted successfully.",
        attempt: finalized,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process quiz action" },
      { status: error.status || 400 }
    );
  }
}
