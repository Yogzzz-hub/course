import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateBatchSyllabusProgress } from "@/lib/progress";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(["TRAINER", "ADMIN"]);
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId");

    let trainerProfileId: string | undefined = undefined;
    if (session.role === "TRAINER") {
      const trainer = await prisma.trainerProfile.findUnique({
        where: { userId: session.userId },
      });
      if (trainer) trainerProfileId = trainer.id;
    }

    const batches = await prisma.batch.findMany({
      where: {
        ...(batchId ? { id: batchId } : {}),
        ...(trainerProfileId
          ? {
              trainerAllocations: {
                some: { trainerProfileId, isPrimary: true },
              },
            }
          : {}),
      },
      include: {
        course: { select: { id: true, title: true, code: true } },
        syllabusVersion: {
          include: {
            modules: {
              include: { subtopics: true },
            },
          },
        },
        enrollments: {
          where: { status: "ACTIVE" },
          select: { id: true },
        },
        assignments: {
          include: {
            _count: { select: { submissions: true } },
          },
        },
        quizzes: {
          include: {
            attempts: { select: { isPassed: true } },
          },
        },
        academicAlerts: {
          where: { status: "OPEN" },
          select: { id: true },
        },
      },
    });

    const batchIds = batches.map((b) => b.id);
    const coverages = await prisma.subtopicCoverage.findMany({
      where: { classSession: { batchId: { in: batchIds } } },
      select: {
        subtopicId: true,
        classSession: { select: { batchId: true } },
      },
    });

    const coverageMap = new Map<string, Set<string>>();
    for (const cov of coverages) {
      const bId = cov.classSession.batchId;
      if (!coverageMap.has(bId)) coverageMap.set(bId, new Set());
      coverageMap.get(bId)!.add(cov.subtopicId);
    }

    const analytics = [];

    for (const batch of batches) {
      const coveredSet = coverageMap.get(batch.id) || new Set();
      let totalReq = 0;
      let covReq = 0;
      batch.syllabusVersion?.modules?.forEach((m) => {
        m.subtopics?.forEach((st) => {
          if (st.isRequired) {
            totalReq++;
            if (coveredSet.has(st.id)) covReq++;
          }
        });
      });
      const syllabusCoverage = totalReq > 0 ? Math.round((covReq / totalReq) * 100) : 0;

      const totalStudents = batch.enrollments.length;
      const totalAssignments = batch.assignments.length;
      const totalExpectedSubmissions = totalStudents * totalAssignments;
      const actualSubmissions = batch.assignments.reduce(
        (sum, a) => sum + a._count.submissions,
        0
      );
      const submissionRate =
        totalExpectedSubmissions > 0
          ? Math.round((actualSubmissions / totalExpectedSubmissions) * 1000) / 10
          : 0;

      // Quiz attempts pass rate
      let totalAttempts = 0;
      let passedAttempts = 0;
      batch.quizzes.forEach((q) => {
        totalAttempts += q.attempts.length;
        passedAttempts += q.attempts.filter((a) => a.isPassed).length;
      });
      const quizPassRate =
        totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 1000) / 10 : 0;

      analytics.push({
        batchId: batch.id,
        batchCode: batch.code,
        courseTitle: batch.course.title,
        studentCount: totalStudents,
        syllabusCoveragePercent: syllabusCoverage,
        assignmentSubmissionRate: submissionRate,
        quizPassRate,
        activeAlertsCount: batch.academicAlerts.length,
      });
    }

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load trainer analytics" },
      { status: error.status || 500 }
    );
  }
}
