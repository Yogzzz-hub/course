import { prisma } from "./prisma";

export interface LearningProgressSummary {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  lastActivityDate: Date | null;
}

/**
 * Calculates student learning progress through course lessons.
 * Strictly distinct from syllabus coverage (what trainer taught).
 */
export async function calculateStudentLearningProgress(
  studentProfileId: string,
  courseId: string
): Promise<LearningProgressSummary> {
  const publishedLessons = await prisma.lesson.findMany({
    where: {
      learningUnit: {
        courseId,
        isPublished: true,
      },
      isPublished: true,
    },
    select: { id: true },
  });

  const totalLessons = publishedLessons.length;
  if (totalLessons === 0) {
    return {
      courseId,
      totalLessons: 0,
      completedLessons: 0,
      progressPercentage: 0,
      lastActivityDate: null,
    };
  }

  const lessonIds = publishedLessons.map((l) => l.id);

  const completions = await prisma.lessonCompletion.findMany({
    where: {
      studentProfileId,
      lessonId: { in: lessonIds },
      status: { in: ["COMPLETED", "VERIFIED"] },
    },
    orderBy: { completedAt: "desc" },
  });

  const completedLessons = completions.length;
  const progressPercentage = Math.round((completedLessons / totalLessons) * 1000) / 10;
  const lastActivityDate = completions.length > 0 ? completions[0].completedAt : null;

  return {
    courseId,
    totalLessons,
    completedLessons,
    progressPercentage,
    lastActivityDate,
  };
}

/**
 * Retrieves hierarchical learning units and lessons for a course.
 */
export async function getCourseLearningStructure(
  courseId: string,
  studentProfileId?: string
) {
  const units = await prisma.learningUnit.findMany({
    where: {
      courseId,
      isPublished: true,
    },
    orderBy: { orderIndex: "asc" },
    include: {
      lessons: {
        where: { isPublished: true },
        orderBy: { orderIndex: "asc" },
        include: {
          resources: {
            orderBy: { orderIndex: "asc" },
          },
          subtopic: {
            select: { id: true, title: true },
          },
          ...(studentProfileId
            ? {
                completions: {
                  where: { studentProfileId },
                },
              }
            : {}),
        },
      },
    },
  });

  return units;
}

/**
 * Marks or updates a lesson completion state for a student.
 */
export async function recordLessonCompletion(
  studentProfileId: string,
  lessonId: string,
  evidence?: string,
  status: string = "COMPLETED",
  verifiedById?: string
) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { learningUnit: true },
  });

  if (!lesson) {
    throw new Error("Lesson not found");
  }

  const completion = await prisma.lessonCompletion.upsert({
    where: {
      studentProfileId_lessonId: {
        studentProfileId,
        lessonId,
      },
    },
    update: {
      status,
      completedAt: new Date(),
      completionEvidence: evidence || null,
      verifiedById: verifiedById || null,
    },
    create: {
      studentProfileId,
      lessonId,
      status,
      completedAt: new Date(),
      completionEvidence: evidence || null,
      verifiedById: verifiedById || null,
    },
  });

  // Update materialized progress in background
  const enrollment = await prisma.studentBatchEnrollment.findFirst({
    where: {
      studentProfileId,
      batch: { courseId: lesson.learningUnit.courseId },
      status: "ACTIVE",
    },
  });

  if (enrollment) {
    const summary = await calculateStudentLearningProgress(
      studentProfileId,
      lesson.learningUnit.courseId
    );

    await prisma.studentAcademicProgress.upsert({
      where: {
        studentProfileId_batchId: {
          studentProfileId,
          batchId: enrollment.batchId,
        },
      },
      update: {
        learningProgressPercent: summary.progressPercentage,
      },
      create: {
        studentProfileId,
        batchId: enrollment.batchId,
        learningProgressPercent: summary.progressPercentage,
      },
    });
  }

  return completion;
}

/**
 * Fetch detailed lesson view including previous and next lesson pointers.
 */
export async function getLessonDetails(lessonId: string, studentProfileId?: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      learningUnit: {
        include: {
          course: {
            select: { id: true, title: true, code: true },
          },
        },
      },
      resources: {
        orderBy: { orderIndex: "asc" },
      },
      subtopic: true,
      ...(studentProfileId
        ? {
            completions: {
              where: { studentProfileId },
            },
          }
        : {}),
    },
  });

  if (!lesson) return null;

  // Find all siblings in unit or course to compute prev/next
  const allLessons = await prisma.lesson.findMany({
    where: {
      learningUnit: {
        courseId: lesson.learningUnit.courseId,
        isPublished: true,
      },
      isPublished: true,
    },
    orderBy: [
      { learningUnit: { orderIndex: "asc" } },
      { orderIndex: "asc" },
    ],
    select: { id: true, title: true },
  });

  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < allLessons.length - 1
      ? allLessons[currentIndex + 1]
      : null;

  return {
    ...lesson,
    prevLesson,
    nextLesson,
  };
}
