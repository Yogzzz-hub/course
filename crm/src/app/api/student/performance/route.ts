import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateStudentLearningProgress } from "@/lib/lms";
import { calculateStudentAcademicPerformance } from "@/lib/assessment";
import { calculateBatchSyllabusProgress } from "@/lib/progress";
import { generateLearningRecommendations } from "@/lib/academic-alerts";

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
        attendanceEntries: true,
      },
    });

    if (!studentProfile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const performanceData = await Promise.all(
      studentProfile.enrollments.map(async (enrollment) => {
        const batch = enrollment.batch;
        const course = batch.course;

        const [
          batchProgressRes,
          learningProgress,
          academicPerformance,
          alerts,
          recommendations,
        ] = await Promise.all([
          calculateBatchSyllabusProgress(batch.id).catch(() => null),
          calculateStudentLearningProgress(studentProfile.id, course.id),
          calculateStudentAcademicPerformance(studentProfile.id, batch.id),
          prisma.academicAlert.findMany({
            where: {
              studentProfileId: studentProfile.id,
              batchId: batch.id,
              status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] },
            },
            orderBy: { createdAt: "desc" },
          }),
          generateLearningRecommendations(studentProfile.id, course.id),
        ]);

        const syllabusCoverage = batchProgressRes?.overallPercentage ?? 0;

        // Attendance Percentage
        const studentAttendance = studentProfile.attendanceEntries.filter((a) =>
          ["PRESENT", "ABSENT", "LEAVE"].includes(a.status)
        );
        const presentCount = studentAttendance.filter((a) => a.status === "PRESENT").length;
        const attendancePercentage =
          studentAttendance.length > 0
            ? Math.round((presentCount / studentAttendance.length) * 1000) / 10
            : 100.0;

        return {
          course: {
            id: course.id,
            code: course.code,
            title: course.title,
          },
          batch: {
            id: batch.id,
            code: batch.code,
          },
          metrics: {
            attendancePercentage,
            syllabusCoveragePercent: syllabusCoverage,
            learningProgressPercent: learningProgress.progressPercentage,
            overallAcademicScore: academicPerformance.overallAcademicScore,
            assignmentScoreAverage: academicPerformance.assignmentScoreAverage,
            quizScoreAverage: academicPerformance.quizScoreAverage,
            projectScoreAverage: academicPerformance.projectScoreAverage,
            isAcademicallyEligible: academicPerformance.isAcademicallyEligible,
          },
          policy: academicPerformance.policy,
          alerts,
          recommendations,
        };
      })
    );

    return NextResponse.json({
      success: true,
      performance: performanceData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load academic performance" },
      { status: error.status || 500 }
    );
  }
}
