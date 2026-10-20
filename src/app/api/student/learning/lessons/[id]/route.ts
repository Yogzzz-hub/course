import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLessonDetails, recordLessonCompletion } from "@/lib/lms";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(["STUDENT", "TRAINER", "ADMIN", "MANAGER"]);
    const { id: lessonId } = await params;

    let studentProfileId: string | undefined = undefined;
    if (session.role === "STUDENT") {
      const student = await prisma.studentProfile.findUnique({
        where: { userId: session.userId },
      });
      if (student) studentProfileId = student.id;
    }

    const lesson = await getLessonDetails(lessonId, studentProfileId);

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      lesson,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load lesson" },
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
    const { id: lessonId } = await params;

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!studentProfile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const evidence = body.evidence || "Completed by student in workspace";

    const completion = await recordLessonCompletion(
      studentProfile.id,
      lessonId,
      evidence,
      "COMPLETED"
    );

    return NextResponse.json({
      success: true,
      message: "Lesson marked as completed.",
      completion,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to complete lesson" },
      { status: error.status || 500 }
    );
  }
}
