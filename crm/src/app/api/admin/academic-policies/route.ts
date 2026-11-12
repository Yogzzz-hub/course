import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireAuth(["ADMIN"]);

    const courses = await prisma.course.findMany({
      include: {
        academicGradingPolicies: {
          orderBy: { version: "desc" },
        },
      },
      orderBy: { title: "asc" },
    });

    return NextResponse.json({
      success: true,
      courses,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load academic policies" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(["ADMIN"]);
    const body = await request.json();

    const {
      courseId,
      assignmentsWeightPercent,
      quizzesWeightPercent,
      projectsWeightPercent,
      finalExamWeightPercent,
      minPassScorePercent,
      requiresAssignmentCompletion,
      requiresQuizPass,
      requiresProjectApproval,
    } = body;

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    const totalWeight =
      (Number(assignmentsWeightPercent) || 0) +
      (Number(quizzesWeightPercent) || 0) +
      (Number(projectsWeightPercent) || 0) +
      (Number(finalExamWeightPercent) || 0);

    if (Math.abs(totalWeight - 100) > 0.01) {
      return NextResponse.json(
        { error: `Assessment weights must total exactly 100%. Currently: ${totalWeight}%` },
        { status: 400 }
      );
    }

    // Find highest version
    const lastPolicy = await prisma.academicGradingPolicy.findFirst({
      where: { courseId },
      orderBy: { version: "desc" },
    });

    const nextVersion = (lastPolicy?.version || 0) + 1;

    // Mark previous policies as not current
    await prisma.academicGradingPolicy.updateMany({
      where: { courseId },
      data: { isCurrent: false },
    });

    const newPolicy = await prisma.academicGradingPolicy.create({
      data: {
        courseId,
        version: nextVersion,
        assignmentsWeightPercent: Number(assignmentsWeightPercent) || 0,
        quizzesWeightPercent: Number(quizzesWeightPercent) || 0,
        projectsWeightPercent: Number(projectsWeightPercent) || 0,
        finalExamWeightPercent: Number(finalExamWeightPercent) || 0,
        minPassScorePercent: Number(minPassScorePercent) || 50.0,
        requiresAssignmentCompletion: Boolean(requiresAssignmentCompletion),
        requiresQuizPass: Boolean(requiresQuizPass),
        requiresProjectApproval: Boolean(requiresProjectApproval),
        isCurrent: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Academic grading policy v${nextVersion} activated successfully.`,
      policy: newPolicy,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save academic policy" },
      { status: error.status || 400 }
    );
  }
}
