import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(["TRAINER", "ADMIN"]);
    const { searchParams } = new URL(request.url);
    const learningUnitId = searchParams.get("learningUnitId");

    const where: any = {};
    if (learningUnitId) where.learningUnitId = learningUnitId;

    const lessons = await prisma.lesson.findMany({
      where,
      include: {
        learningUnit: {
          include: {
            course: { select: { id: true, title: true, code: true } },
          },
        },
        resources: true,
        subtopic: true,
        _count: { select: { completions: true } },
      },
      orderBy: { orderIndex: "asc" },
    });

    return NextResponse.json({
      success: true,
      lessons,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load lessons" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(["TRAINER", "ADMIN"]);
    const body = await request.json();
    const {
      learningUnitId,
      subtopicId,
      title,
      description,
      contentType,
      contentBody,
      estimatedMinutes,
      learningObjectives,
      orderIndex,
      resources,
    } = body;

    if (!learningUnitId || !title) {
      return NextResponse.json(
        { error: "Learning Unit ID and Title are required" },
        { status: 400 }
      );
    }

    const lesson = await prisma.lesson.create({
      data: {
        learningUnitId,
        subtopicId: subtopicId || null,
        title,
        description: description || null,
        contentType: contentType || "TEXT",
        contentBody: contentBody || null,
        estimatedMinutes: estimatedMinutes || 30,
        learningObjectives: learningObjectives || null,
        orderIndex: typeof orderIndex === "number" ? orderIndex : 0,
        isPublished: true,
      },
    });

    // Attach optional resources
    if (Array.isArray(resources) && resources.length > 0) {
      for (let i = 0; i < resources.length; i++) {
        const res = resources[i];
        if (res.title && res.urlOrContent) {
          await prisma.lessonResource.create({
            data: {
              lessonId: lesson.id,
              title: res.title,
              resourceType: res.resourceType || "FILE",
              urlOrContent: res.urlOrContent,
              orderIndex: i,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Lesson created successfully.",
      lesson,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create lesson" },
      { status: error.status || 400 }
    );
  }
}
