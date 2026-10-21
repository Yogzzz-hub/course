import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateBatchSyllabusProgress } from "@/lib/progress";

export async function GET() {
  try {
    const session = await requireAuth(["TRAINER", "ADMIN"]);

    if (session.role === "ADMIN") {
      const allBatches = await prisma.batch.findMany({
        include: {
          course: true,
          syllabusVersion: {
            include: {
              modules: {
                include: { subtopics: true },
              },
            },
          },
          enrollments: { where: { status: "ACTIVE" } },
          trainerAllocations: { include: { trainerProfile: { include: { user: true } } } },
          classSessions: { orderBy: { sessionDate: "desc" }, take: 1 },
        },
      });

      const batchIds = allBatches.map((b) => b.id);
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

      const formatted = allBatches.map((batch) => {
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
        const percent = totalReq > 0 ? Math.round((covReq / totalReq) * 100) : 0;

        return {
          id: batch.id,
          code: batch.code,
          course: {
            id: batch.course.id,
            title: batch.course.title,
            code: batch.course.code,
          },
          syllabusVersion: {
            title: batch.syllabusVersion?.title || "",
            versionNumber: batch.syllabusVersion?.versionNumber || 1,
          },
          scheduleType: batch.scheduleType,
          classDays: batch.classDays,
          startTime: batch.startTime,
          endTime: batch.endTime,
          activeStudentsCount: batch.enrollments.length,
          status: batch.status,
          lastSessionDate: batch.classSessions[0]?.sessionDate || null,
          syllabusProgressPercent: percent,
          uniqueCoveredSubtopics: covReq,
          totalRequiredSubtopics: totalReq,
        };
      });

      return NextResponse.json({ batches: formatted });
    }

    const tr = await prisma.trainerProfile.findUnique({
      where: { userId: session.userId },
    });
    if (!tr) {
      return NextResponse.json({ error: "Trainer profile not found" }, { status: 404 });
    }
    const trainerProfileId = tr.id;

    // Get only explicitly allocated batches for this trainer
    const allocations = await prisma.trainerBatchAllocation.findMany({
      where: { trainerProfileId },
      include: {
        batch: {
          include: {
            course: true,
            syllabusVersion: {
              include: {
                modules: {
                  include: { subtopics: true },
                },
              },
            },
            enrollments: {
              where: { status: "ACTIVE" },
            },
            classSessions: {
              orderBy: { sessionDate: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { allocatedAt: "desc" },
    });

    const batchIds = allocations.map((a) => a.batch.id);

    // Fetch ALL coverages for all these batches in ONE single fast query
    const coverages = await prisma.subtopicCoverage.findMany({
      where: {
        classSession: {
          batchId: { in: batchIds },
        },
      },
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

    const batchesWithProgress = allocations.map((alloc) => {
      const batch = alloc.batch;
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

      const overallPercentage = totalReq > 0 ? Math.round((covReq / totalReq) * 100) : 0;

      return {
        id: batch.id,
        code: batch.code,
        course: {
          id: batch.course.id,
          title: batch.course.title,
          code: batch.course.code,
        },
        syllabusVersion: {
          title: batch.syllabusVersion?.title || "",
          versionNumber: batch.syllabusVersion?.versionNumber || 1,
        },
        scheduleType: batch.scheduleType,
        classDays: batch.classDays,
        startTime: batch.startTime,
        endTime: batch.endTime,
        activeStudentsCount: batch.enrollments.length,
        status: batch.status,
        lastSessionDate: batch.classSessions[0]?.sessionDate || null,
        syllabusProgressPercent: overallPercentage,
        uniqueCoveredSubtopics: covReq,
        totalRequiredSubtopics: totalReq,
      };
    });

    return NextResponse.json({ batches: batchesWithProgress });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("Trainer batches fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch batches" }, { status: 500 });
  }
}
