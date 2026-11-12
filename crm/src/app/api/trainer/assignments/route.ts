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

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        course: { select: { id: true, title: true, code: true } },
        batch: { select: { id: true, code: true } },
        rubricCriteria: { orderBy: { orderIndex: "asc" } },
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      assignments,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load assignments" },
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
      description,
      instructions,
      learningObjectives,
      maxMarks,
      dueDate,
      allowedSubmissionTypes,
      lateSubmissionPolicy,
      maxAttempts,
      rubricCriteria,
    } = body;

    if (!courseId || !title || !dueDate) {
      return NextResponse.json(
        { error: "Course, Title, and Due Date are required" },
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

    const assignment = await prisma.assignment.create({
      data: {
        courseId,
        batchId: batchId || null,
        trainerProfileId: trainerProfileId || null,
        title,
        description,
        instructions: instructions || null,
        learningObjectives: learningObjectives || null,
        maxMarks: typeof maxMarks === "number" ? maxMarks : 100.0,
        dueDate: new Date(dueDate),
        allowedSubmissionTypes: allowedSubmissionTypes || "TEXT,PDF,DOC,CODE,LINK",
        lateSubmissionPolicy: lateSubmissionPolicy || "ALLOWED",
        maxAttempts: typeof maxAttempts === "number" ? maxAttempts : 1,
        publicationStatus: "PUBLISHED",
      },
    });

    // Create rubric criteria
    if (Array.isArray(rubricCriteria) && rubricCriteria.length > 0) {
      for (let i = 0; i < rubricCriteria.length; i++) {
        const crit = rubricCriteria[i];
        if (crit.title && crit.maxMarks) {
          await prisma.rubricCriterion.create({
            data: {
              assignmentId: assignment.id,
              title: crit.title,
              description: crit.description || null,
              maxMarks: crit.maxMarks,
              orderIndex: i,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Assignment published successfully.",
      assignment,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create assignment" },
      { status: error.status || 400 }
    );
  }
}
