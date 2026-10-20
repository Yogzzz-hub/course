import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAuth(["ADMIN", "MANAGER", "FINANCIER"]);

    // Fetch real metrics from database
    const [
      totalStudents,
      activeStudents,
      totalTrainers,
      activeCourses,
      runningBatches,
      totalLeads,
      admittedLeads,
      totalOccurrences,
      heldOccurrences,
      submittedClassSessions,
      totalSubtopics,
      totalCoverages,
    ] = await Promise.all([
      prisma.studentProfile.count(),
      prisma.studentBatchEnrollment.count({ where: { status: "ACTIVE" } }),
      prisma.trainerProfile.count(),
      prisma.course.count({ where: { active: true } }),
      prisma.batch.count({ where: { status: "ACTIVE" } }),
      prisma.lead.count(),
      prisma.lead.count({ where: { status: "ADMITTED" } }),
      prisma.sessionOccurrence.count({ where: { status: { not: "CANCELLED" } } }),
      prisma.sessionOccurrence.count({ where: { status: "HELD" } }),
      prisma.classSession.count(),
      prisma.syllabusSubtopic.count({ where: { isRequired: true } }),
      prisma.subtopicCoverage.count(),
    ]);

    // Lead conversion rate
    const conversionRate =
      totalLeads > 0 ? Math.round((admittedLeads / totalLeads) * 1000) / 10 : 0;

    // Missing attendance submissions (held occurrences without submitted classSession)
    const missingSubmissions = Math.max(0, heldOccurrences - submittedClassSessions);

    // Batch utilization data
    const batches = await prisma.batch.findMany({
      where: { status: "ACTIVE" },
      include: {
        course: { select: { code: true } },
        _count: { select: { enrollments: true } },
      },
    });

    const batchUtilization = batches.map((b) => ({
      batchCode: b.code,
      courseCode: b.course.code,
      capacity: b.capacity,
      enrolled: b._count.enrollments,
      utilizationPercentage:
        b.capacity > 0 ? Math.round((b._count.enrollments / b.capacity) * 100) : 0,
    }));

    return NextResponse.json({
      metrics: {
        totalStudents,
        activeStudents,
        totalTrainers,
        activeCourses,
        runningBatches,
        totalLeads,
        admittedLeads,
        conversionRate,
        totalOccurrences,
        heldOccurrences,
        submittedClassSessions,
        missingSubmissions,
        totalRequiredSubtopics: totalSubtopics,
        totalTopicCoverages: totalCoverages,
      },
      batchUtilization,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("Reports API error:", error);
    return NextResponse.json({ error: "Failed to load operational reports" }, { status: 500 });
  }
}
