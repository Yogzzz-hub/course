import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(["TRAINER", "ADMIN"]);
    const { id: assignmentId } = await params;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        course: { select: { id: true, title: true } },
        batch: { select: { id: true, code: true } },
        rubricCriteria: { orderBy: { orderIndex: "asc" } },
        submissions: {
          include: {
            studentProfile: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
            grade: {
              include: { revisions: { orderBy: { createdAt: "desc" } } },
            },
          },
          orderBy: { submittedAt: "desc" },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      assignment,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load submissions" },
      { status: error.status || 500 }
    );
  }
}
