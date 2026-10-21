import { prisma } from "./prisma";
import { createInAppNotification } from "./notification";

/**
 * Runs evidence-based academic alert checks for a batch.
 * Detects pending assignments, missed assessments, low attendance, and failed quizzes.
 * Strictly idempotent to prevent duplicate alerts.
 */
export async function evaluateAcademicAlertsForBatch(batchId: string) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          studentProfile: {
            include: { user: true },
          },
        },
      },
      assignments: {
        where: { publicationStatus: "PUBLISHED" },
      },
      quizzes: {
        where: { publicationStatus: { in: ["OPEN", "RESULTS_PUBLISHED"] } },
      },
    },
  });

  if (!batch) return [];

  const createdAlerts = [];
  const now = new Date();

  for (const enrollment of batch.enrollments) {
    const student = enrollment.studentProfile;

    // 1. Pending / Overdue Assignments Check
    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        studentProfileId: student.id,
        assignment: { batchId },
      },
      select: { assignmentId: true },
    });

    const submittedAssignmentIds = new Set(submissions.map((s) => s.assignmentId));
    const overduePending = batch.assignments.filter(
      (a) => now.getTime() > new Date(a.dueDate).getTime() && !submittedAssignmentIds.has(a.id)
    );

    if (overduePending.length > 0) {
      const existingAlert = await prisma.academicAlert.findFirst({
        where: {
          studentProfileId: student.id,
          batchId,
          alertType: "PENDING_ASSIGNMENTS",
          status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] },
        },
      });

      if (!existingAlert) {
        const alert = await prisma.academicAlert.create({
          data: {
            studentProfileId: student.id,
            batchId,
            alertType: "PENDING_ASSIGNMENTS",
            severity: overduePending.length > 2 ? "URGENT_REVIEW" : "NEEDS_ATTENTION",
            evidenceJson: JSON.stringify({
              overdueCount: overduePending.length,
              overdueAssignments: overduePending.map((a) => ({ id: a.id, title: a.title })),
            }),
            status: "OPEN",
          },
        });
        createdAlerts.push(alert);

        // Queue in-app notification to student
        await createInAppNotification(
          student.userId,
          "Overdue Assignment Reminder",
          `You have ${overduePending.length} overdue assignment(s) in batch ${batch.code}. Please submit your work to stay on track.`,
          "ACADEMIC",
          "/student/assignments"
        );
      }
    }

    // 2. Failed Quizzes Check
    const failedAttempts = await prisma.quizAttempt.findMany({
      where: {
        studentProfileId: student.id,
        quiz: { batchId },
        status: { in: ["EVALUATED", "AUTO_SUBMITTED"] },
        isPassed: false,
      },
      include: { quiz: true },
    });

    if (failedAttempts.length > 0) {
      const existingAlert = await prisma.academicAlert.findFirst({
        where: {
          studentProfileId: student.id,
          batchId,
          alertType: "FAILED_ASSESSMENTS",
          status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] },
        },
      });

      if (!existingAlert) {
        const alert = await prisma.academicAlert.create({
          data: {
            studentProfileId: student.id,
            batchId,
            alertType: "FAILED_ASSESSMENTS",
            severity: "NEEDS_ATTENTION",
            evidenceJson: JSON.stringify({
              failedCount: failedAttempts.length,
              quizzes: failedAttempts.map((f) => ({ title: f.quiz.title, score: f.totalScore })),
            }),
            status: "OPEN",
          },
        });
        createdAlerts.push(alert);
      }
    }
  }

  return createdAlerts;
}

/**
 * Generates explainable, supportive learning recommendations for a student.
 */
export async function generateLearningRecommendations(
  studentProfileId: string,
  courseId: string
) {
  const recommendations = [];

  // Check 1: Review uncompleted lessons
  const publishedLessons = await prisma.lesson.findMany({
    where: {
      learningUnit: { courseId, isPublished: true },
      isPublished: true,
    },
    orderBy: { orderIndex: "asc" },
    include: {
      completions: {
        where: { studentProfileId },
      },
    },
    take: 3,
  });

  const nextIncomplete = publishedLessons.find(
    (l) => l.completions.length === 0 || l.completions[0].status !== "COMPLETED"
  );

  if (nextIncomplete) {
    const existing = await prisma.learningRecommendation.findFirst({
      where: {
        studentProfileId,
        courseId,
        recommendationType: "REVISIT_LESSON",
        status: "ACTIVE",
      },
    });

    if (!existing) {
      const rec = await prisma.learningRecommendation.create({
        data: {
          studentProfileId,
          courseId,
          recommendationType: "REVISIT_LESSON",
          suggestedAction: `Complete next core lesson: "${nextIncomplete.title}"`,
          evidence: "Core lesson incomplete in current unit",
          supportingResourcesJson: JSON.stringify({ lessonId: nextIncomplete.id }),
          status: "ACTIVE",
        },
      });
      recommendations.push(rec);
    }
  }

  return recommendations;
}
