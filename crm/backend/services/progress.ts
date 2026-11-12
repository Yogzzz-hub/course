import { prisma } from "./prisma";

export interface SubtopicInfo {
  id: string;
  title: string;
  isRequired: boolean;
  orderIndex: number;
  isCovered: boolean;
  firstCoveredDate?: Date;
  timesTaught: number;
}

export interface ModuleProgress {
  id: string;
  title: string;
  orderIndex: number;
  totalSubtopics: number;
  coveredSubtopics: number;
  percentage: number;
  subtopics: SubtopicInfo[];
}

export interface BatchSyllabusProgress {
  batchId: string;
  syllabusVersionTitle: string;
  versionNumber: number;
  totalRequiredSubtopics: number;
  uniqueCoveredRequiredSubtopics: number;
  overallPercentage: number;
  lastTeachingDate: Date | null;
  modules: ModuleProgress[];
}

// In-Memory High Performance Caches
const batchProgressCache = new Map<string, { data: BatchSyllabusProgress; expires: number }>();
const syllabusVersionCache = new Map<string, any>();

export function invalidateBatchProgressCache(batchId?: string) {
  if (batchId) {
    batchProgressCache.delete(batchId);
  } else {
    batchProgressCache.clear();
  }
}

/**
 * Calculates syllabus progress for a single batch with in-memory caching.
 */
export async function calculateBatchSyllabusProgress(
  batchId: string,
  skipCache: boolean = false
): Promise<BatchSyllabusProgress> {
  const now = Date.now();
  if (!skipCache) {
    const cached = batchProgressCache.get(batchId);
    if (cached && cached.expires > now) {
      return cached.data;
    }
  }

  // 1. Fetch batch information
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: {
      id: true,
      syllabusVersionId: true,
    },
  });

  if (!batch || !batch.syllabusVersionId) {
    throw new Error("Batch or syllabus version not found");
  }

  // 2. Resolve syllabus hierarchy (cached in memory since curriculum structure is static)
  let syllabus = syllabusVersionCache.get(batch.syllabusVersionId);
  if (!syllabus) {
    syllabus = await prisma.syllabusVersion.findUnique({
      where: { id: batch.syllabusVersionId },
      include: {
        modules: {
          orderBy: { orderIndex: "asc" },
          include: {
            subtopics: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
    });
    if (!syllabus) {
      throw new Error("Syllabus version not found");
    }
    syllabusVersionCache.set(batch.syllabusVersionId, syllabus);
  }

  // 3. Find all coverages for locked sessions in this batch
  const coverages = await prisma.subtopicCoverage.findMany({
    where: {
      classSession: {
        batchId,
      },
    },
    include: {
      classSession: {
        select: { sessionDate: true },
      },
    },
    orderBy: {
      classSession: { sessionDate: "asc" },
    },
  });

  // Group coverage counts and first dates by subtopicId
  const coverageMap = new Map<string, { count: number; firstDate: Date }>();
  let lastTeachingDate: Date | null = null;

  for (const cov of coverages) {
    const prev = coverageMap.get(cov.subtopicId);
    if (!prev) {
      coverageMap.set(cov.subtopicId, {
        count: 1,
        firstDate: cov.classSession.sessionDate,
      });
    } else {
      prev.count += 1;
    }

    if (!lastTeachingDate || cov.classSession.sessionDate > lastTeachingDate) {
      lastTeachingDate = cov.classSession.sessionDate;
    }
  }

  let totalRequiredCount = 0;
  let uniqueCoveredRequiredCount = 0;

  const modulesProgress: ModuleProgress[] = syllabus.modules.map((mod: any) => {
    let modCoveredCount = 0;
    const subtopicInfos: SubtopicInfo[] = mod.subtopics.map((st: any) => {
      const covData = coverageMap.get(st.id);
      const isCovered = !!covData && covData.count > 0;

      if (st.isRequired) {
        totalRequiredCount++;
        if (isCovered) {
          uniqueCoveredRequiredCount++;
        }
      }

      if (isCovered) {
        modCoveredCount++;
      }

      return {
        id: st.id,
        title: st.title,
        isRequired: st.isRequired,
        orderIndex: st.orderIndex,
        isCovered,
        firstCoveredDate: covData?.firstDate,
        timesTaught: covData ? covData.count : 0,
      };
    });

    const modTotal = mod.subtopics.length;
    const modPercentage = modTotal > 0 ? Math.round((modCoveredCount / modTotal) * 100) : 0;

    return {
      id: mod.id,
      title: mod.title,
      orderIndex: mod.orderIndex,
      totalSubtopics: modTotal,
      coveredSubtopics: modCoveredCount,
      percentage: modPercentage,
      subtopics: subtopicInfos,
    };
  });

  const overallPercentage =
    totalRequiredCount > 0
      ? Math.round((uniqueCoveredRequiredCount / totalRequiredCount) * 100)
      : 0;

  const result: BatchSyllabusProgress = {
    batchId,
    syllabusVersionTitle: syllabus.title,
    versionNumber: syllabus.versionNumber,
    totalRequiredSubtopics: totalRequiredCount,
    uniqueCoveredRequiredSubtopics: uniqueCoveredRequiredCount,
    overallPercentage,
    lastTeachingDate,
    modules: modulesProgress,
  };

  // Cache for 15 seconds to ensure lightning-fast dashboard navigation
  batchProgressCache.set(batchId, { data: result, expires: now + 15000 });

  return result;
}
