import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submitAssignment } from "@/lib/assessment";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(["STUDENT"]);
    const { id: assignmentId } = await params;

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

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        course: { select: { id: true, title: true, code: true } },
        batch: { select: { id: true, code: true } },
        rubricCriteria: { orderBy: { orderIndex: "asc" } },
        submissions: {
          where: { studentProfileId: studentProfile.id }, // Strictly scoped to authenticated student!
          include: { grade: true },
          orderBy: { attemptNumber: "desc" },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Verify enrollment
    const isEnrolled = studentProfile.enrollments.some(
      (e) => !assignment.batchId || e.batchId === assignment.batchId
    );

    if (!isEnrolled) {
      return NextResponse.json(
        { error: "Unauthorized: You are not enrolled in the batch for this assignment." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      assignment,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load assignment" },
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
    const { id: assignmentId } = await params;

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!studentProfile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    const submission = await submitAssignment({
      assignmentId,
      studentProfileId: studentProfile.id,
      content: body.content,
      attachmentUrl: body.attachmentUrl,
      externalLink: body.externalLink,
    });

    return NextResponse.json({
      success: true,
      message: "Assignment submitted successfully.",
      submission,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to submit assignment" },
      { status: error.status || 400 }
    );
  }
}
