import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(["TRAINER", "ADMIN"]);
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId");

    const where: any = {};
    if (batchId) where.batchId = batchId;

    const quizzes = await prisma.quiz.findMany({
      where,
      include: {
        course: { select: { id: true, title: true, code: true } },
        batch: { select: { id: true, code: true } },
        questions: {
          include: { question: true },
          orderBy: { orderIndex: "asc" },
        },
        attempts: {
          include: {
            studentProfile: {
              include: { user: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      quizzes,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load quizzes" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(["TRAINER", "ADMIN"]);
    const body = await request.json();

    const {
      courseId,
      batchId,
      title,
      instructions,
      quizType,
      durationMinutes,
      maxMarks,
      passMarks,
      allowedAttempts,
      shuffleQuestions,
      startDate,
      endDate,
      autoEvaluateObjective,
      allowNegativeMarking,
      negativeMarkValue,
      questionIds,
    } = body;

    if (!courseId || !title) {
      return NextResponse.json(
        { error: "Course ID and Quiz Title are required" },
        { status: 400 }
      );
    }

    let trainerProfileId: string | undefined = undefined;
    if (session.role === "TRAINER") {
      const trainer = await prisma.trainerProfile.findUnique({
        where: { userId: session.userId },
      });
      if (trainer) trainerProfileId = trainer.id;
    }

    const quiz = await prisma.quiz.create({
      data: {
        courseId,
        batchId: batchId || null,
        trainerProfileId: trainerProfileId || null,
        title,
        instructions: instructions || null,
        quizType: quizType || "MODULE_TEST",
        durationMinutes: typeof durationMinutes === "number" ? durationMinutes : 45,
        maxMarks: typeof maxMarks === "number" ? maxMarks : 100.0,
        passMarks: typeof passMarks === "number" ? passMarks : 50.0,
        allowedAttempts: typeof allowedAttempts === "number" ? allowedAttempts : 1,
        shuffleQuestions: Boolean(shuffleQuestions),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        autoEvaluateObjective: autoEvaluateObjective !== false,
        allowNegativeMarking: Boolean(allowNegativeMarking),
        negativeMarkValue: typeof negativeMarkValue === "number" ? negativeMarkValue : 0.0,
        publicationStatus: "OPEN",
      },
    });

    // Link questions from question bank
    if (Array.isArray(questionIds) && questionIds.length > 0) {
      for (let i = 0; i < questionIds.length; i++) {
        const qId = questionIds[i];
        await prisma.quizQuestion.create({
          data: {
            quizId: quiz.id,
            questionId: qId,
            orderIndex: i,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Quiz created and scheduled successfully.",
      quiz,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create quiz" },
      { status: error.status || 400 }
    );
  }
}
