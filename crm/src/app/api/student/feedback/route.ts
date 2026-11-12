import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireAuth(["STUDENT"]);

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!studentProfile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const feedbacks = await prisma.academicFeedback.findMany({
      where: { studentProfileId: studentProfile.id },
      include: {
        course: { select: { id: true, title: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      feedbacks,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load feedback" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(["STUDENT"]);

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!studentProfile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { courseId, batchId, feedbackType, rating, writtenFeedback, isAnonymous } = body;

    if (!courseId || !writtenFeedback) {
      return NextResponse.json(
        { error: "Course ID and written feedback are required" },
        { status: 400 }
      );
    }

    const feedback = await prisma.academicFeedback.create({
      data: {
        studentProfileId: studentProfile.id,
        courseId,
        batchId: batchId || null,
        feedbackType: feedbackType || "COURSE",
        rating: typeof rating === "number" ? Math.max(1, Math.min(5, rating)) : 5,
        writtenFeedback,
        isAnonymous: Boolean(isAnonymous),
        reviewStatus: "SUBMITTED",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Feedback submitted successfully.",
      feedback,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to submit feedback" },
      { status: error.status || 400 }
    );
  }
}
