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

    const projects = await prisma.project.findMany({
      where,
      include: {
        course: { select: { id: true, title: true, code: true } },
        batch: { select: { id: true, code: true } },
        milestones: { orderBy: { orderIndex: "asc" } },
        submissions: {
          include: {
            studentProfile: {
              include: { user: { select: { id: true, name: true } } },
            },
          },
          orderBy: { submittedAt: "desc" },
        },
      },
      orderBy: { deadline: "asc" },
    });

    return NextResponse.json({
      success: true,
      projects,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load projects" },
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
      learningObjectives,
      deadline,
      maxMarks,
      milestones,
    } = body;

    if (!courseId || !title || !deadline) {
      return NextResponse.json(
        { error: "Course ID, Title, and Deadline are required" },
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

    const project = await prisma.project.create({
      data: {
        courseId,
        batchId: batchId || null,
        trainerProfileId: trainerProfileId || null,
        title,
        description,
        learningObjectives: learningObjectives || null,
        deadline: new Date(deadline),
        maxMarks: typeof maxMarks === "number" ? maxMarks : 100.0,
        status: "ASSIGNED",
      },
    });

    if (Array.isArray(milestones) && milestones.length > 0) {
      for (let i = 0; i < milestones.length; i++) {
        const m = milestones[i];
        if (m.title) {
          await prisma.projectMilestone.create({
            data: {
              projectId: project.id,
              title: m.title,
              description: m.description || null,
              deadline: m.deadline ? new Date(m.deadline) : new Date(deadline),
              weightPercentage: typeof m.weightPercentage === "number" ? m.weightPercentage : 25.0,
              orderIndex: i,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Practical project created successfully.",
      project,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create project" },
      { status: error.status || 400 }
    );
  }
}
