import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateStudentLearningProgress, getCourseLearningStructure } from "@/lib/lms";
import { calculateBatchSyllabusProgress } from "@/lib/progress";

export async function GET() {
  try {
    const session = await requireAuth(["STUDENT"]);

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          include: {
            batch: {
              include: {
                course: true,
              },
            },
          },
        },
      },
    });

    if (!studentProfile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const coursesData = await Promise.all(
      studentProfile.enrollments.map(async (enrollment) => {
        const course = enrollment.batch.course;
        const batchId = enrollment.batch.id;

        const [learningProgress, batchProgressRes, units] = await Promise.all([
          calculateStudentLearningProgress(studentProfile.id, course.id),
          calculateBatchSyllabusProgress(batchId).catch(() => null),
          getCourseLearningStructure(course.id, studentProfile.id),
        ]);

        const syllabusCoverage = batchProgressRes?.overallPercentage ?? 0;

        return {
          course: {
            id: course.id,
            code: course.code,
            title: course.title,
            description: course.description,
            durationWeeks: course.durationWeeks,
          },
          batch: {
            id: enrollment.batch.id,
            code: enrollment.batch.code,
            scheduleType: enrollment.batch.scheduleType,
            startDate: enrollment.batch.startDate,
          },
          learningProgress,
          syllabusCoverage,
          units,
        };
      })
    );

    return NextResponse.json({
      success: true,
      courses: coursesData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch student learning data" },
      { status: error.status || 500 }
    );
  }
}
