import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(["TRAINER", "ADMIN"]);
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    const where: any = {};
    if (courseId) where.courseId = courseId;

    const banks = await prisma.questionBank.findMany({
      where,
      include: {
        course: { select: { id: true, title: true, code: true } },
        questions: {
          include: { subtopic: { select: { id: true, title: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      questionBanks: banks,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load question banks" },
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
      questionBankId: providedBankId,
      questionText,
      type,
      difficulty,
      marks,
      explanation,
      correctAnswer,
      options,
      numericTolerance,
      subtopicId,
      tags,
    } = body;

    if (!questionText || !correctAnswer) {
      return NextResponse.json(
        { error: "Question text and correct answer are required" },
        { status: 400 }
      );
    }

    // Ensure QuestionBank exists or create default for course
    let questionBankId = providedBankId;
    if (!questionBankId) {
      if (!courseId) {
        return NextResponse.json(
          { error: "Either questionBankId or courseId is required" },
          { status: 400 }
        );
      }
      let defaultBank = await prisma.questionBank.findFirst({
        where: { courseId },
      });
      if (!defaultBank) {
        defaultBank = await prisma.questionBank.create({
          data: {
            courseId,
            title: "Standard Question Bank",
            description: "Core assessment repository",
          },
        });
      }
      questionBankId = defaultBank.id;
    }

    const question = await prisma.question.create({
      data: {
        questionBankId,
        subtopicId: subtopicId || null,
        questionText,
        type: type || "MCQ_SINGLE",
        difficulty: difficulty || "MEDIUM",
        marks: typeof marks === "number" ? marks : 1.0,
        explanation: explanation || null,
        correctAnswer: String(correctAnswer),
        optionsJson: options ? JSON.stringify(options) : null,
        numericTolerance: typeof numericTolerance === "number" ? numericTolerance : 0.0,
        tags: tags || null,
        createdById: session.userId,
        isApproved: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Question added to question bank successfully.",
      question,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create question" },
      { status: error.status || 400 }
    );
  }
}
