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

    const units = await prisma.learningUnit.findMany({
      where,
      include: {
        course: { select: { id: true, title: true, code: true } },
        lessons: {
          orderBy: { orderIndex: "asc" },
          include: {
            resources: true,
            subtopic: true,
            _count: { select: { completions: true } },
          },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    return NextResponse.json({
      success: true,
      units,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load learning units" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(["TRAINER", "ADMIN"]);
    const body = await request.json();
    const { courseId, title, description, estimatedMinutes, prerequisites, orderIndex } = body;

    if (!courseId || !title) {
      return NextResponse.json(
        { error: "Course ID and Unit Title are required" },
        { status: 400 }
      );
    }

    const unit = await prisma.learningUnit.create({
      data: {
        courseId,
        title,
        description: description || null,
        estimatedMinutes: estimatedMinutes || 120,
        prerequisites: prerequisites || null,
        orderIndex: typeof orderIndex === "number" ? orderIndex : 0,
        isPublished: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Learning unit created successfully.",
      unit,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create learning unit" },
      { status: error.status || 400 }
    );
  }
}
