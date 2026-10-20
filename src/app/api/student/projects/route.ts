import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireAuth(["STUDENT"]);

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

    const batchIds = studentProfile.enrollments.map((e) => e.batchId);

    const projects = await prisma.project.findMany({
      where: {
        batchId: { in: batchIds },
      },
      include: {
        course: { select: { id: true, title: true, code: true } },
        batch: { select: { id: true, code: true } },
        milestones: { orderBy: { orderIndex: "asc" } },
        studentAssignments: {
          where: { studentProfileId: studentProfile.id },
        },
        submissions: {
          where: { studentProfileId: studentProfile.id },
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
    const session = await requireAuth(["STUDENT"]);

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!studentProfile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { projectId, milestoneId, repoUrl, demoUrl, filesUrl, notes } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const submission = await prisma.projectSubmission.create({
      data: {
        projectId,
        milestoneId: milestoneId || null,
        studentProfileId: studentProfile.id,
        repoUrl: repoUrl || null,
        demoUrl: demoUrl || null,
        filesUrl: filesUrl || null,
        notes: notes || null,
        status: "SUBMITTED",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Project milestone submitted successfully.",
      submission,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to submit project" },
      { status: error.status || 400 }
    );
  }
}
