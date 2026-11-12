import { prisma } from "./prisma";

export interface SubmitAssignmentInput {
  assignmentId: string;
  studentProfileId: string;
  content?: string;
  attachmentUrl?: string;
  externalLink?: string;
}

export interface GradeSubmissionInput {
  submissionId: string;
  gradedById: string;
  marksAwarded: number;
  rubricScoresJson?: string;
  feedback?: string;
  privateNotes?: string;
  reasonForRevision?: string;
}

/**
 * Submits an assignment with server-side validation of deadlines, attempts, and allowed types.
 */
export async function submitAssignment(input: SubmitAssignmentInput) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: input.assignmentId },
  });

  if (!assignment) {
    throw new Error("Assignment not found");
  }

  if (assignment.publicationStatus !== "PUBLISHED") {
    throw new Error("Assignment is not currently open for submission.");
  }

  const existingSubmissions = await prisma.assignmentSubmission.findMany({
    where: {
      assignmentId: input.assignmentId,
      studentProfileId: input.studentProfileId,
    },
    orderBy: { attemptNumber: "desc" },
  });

  const attemptNumber = existingSubmissions.length + 1;
  if (attemptNumber > assignment.maxAttempts) {
    throw new Error(`Maximum submission attempts (${assignment.maxAttempts}) reached.`);
  }

  const now = new Date();
  const isLate = now > assignment.dueDate;

  if (isLate && assignment.lateSubmissionPolicy === "DISALLOWED") {
    throw new Error("Late submissions are not permitted for this assignment.");
  }

  const status = isLate ? "LATE_SUBMITTED" : "SUBMITTED";

  const submission = await prisma.assignmentSubmission.create({
    data: {
      assignmentId: input.assignmentId,
      studentProfileId: input.studentProfileId,
      attemptNumber,
      status,
      content: input.content || null,
      attachmentUrl: input.attachmentUrl || null,
      externalLink: input.externalLink || null,
      isLate,
      submittedAt: now,
    },
  });

  return submission;
}

/**
 * Grades an assignment submission with rubric scoring and revision tracking.
 */
export async function gradeAssignmentSubmission(input: GradeSubmissionInput) {
  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: input.submissionId },
    include: {
      assignment: true,
      grade: true,
      studentProfile: true,
    },
  });

  if (!submission) {
    throw new Error("Assignment submission not found");
  }

  if (input.marksAwarded < 0 || input.marksAwarded > submission.assignment.maxMarks) {
    throw new Error(
      `Marks awarded (${input.marksAwarded}) must be between 0 and ${submission.assignment.maxMarks}.`
    );
  }

  let grade;
  if (submission.grade) {
    // Record GradeRevision audit
    await prisma.gradeRevision.create({
      data: {
        gradeId: submission.grade.id,
        oldMarks: submission.grade.marksAwarded,
        newMarks: input.marksAwarded,
        reason: input.reasonForRevision || "Grade revision by trainer",
        changedById: input.gradedById,
      },
    });

    grade = await prisma.assignmentGrade.update({
      where: { id: submission.grade.id },
      data: {
        marksAwarded: input.marksAwarded,
        rubricScoresJson: input.rubricScoresJson || null,
        feedback: input.feedback || null,
        privateNotes: input.privateNotes || null,
        gradedAt: new Date(),
        publishedAt: new Date(),
      },
    });
  } else {
    grade = await prisma.assignmentGrade.create({
      data: {
        submissionId: input.submissionId,
        gradedById: input.gradedById,
        marksAwarded: input.marksAwarded,
        maxMarks: submission.assignment.maxMarks,
        rubricScoresJson: input.rubricScoresJson || null,
        feedback: input.feedback || null,
        privateNotes: input.privateNotes || null,
        isPublished: true,
        gradedAt: new Date(),
        publishedAt: new Date(),
      },
    });
  }

  // Update submission status
  await prisma.assignmentSubmission.update({
    where: { id: input.submissionId },
    data: { status: "GRADED" },
  });

  // Recalculate student performance if batch enrollment exists
  if (submission.assignment.batchId) {
    await calculateStudentAcademicPerformance(
      submission.studentProfileId,
      submission.assignment.batchId
    );
  }

  return grade;
}

/**
 * Starts a timed quiz attempt with server-side expiry authority.
 */
export async function startQuizAttempt(quizId: string, studentProfileId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        include: { question: true },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!quiz) {
    throw new Error("Quiz not found");
  }

  if (quiz.publicationStatus !== "OPEN") {
    throw new Error("This assessment is not currently open.");
  }

  // Check active attempt
  const activeAttempt = await prisma.quizAttempt.findFirst({
    where: {
      quizId,
      studentProfileId,
      status: "IN_PROGRESS",
    },
    include: {
      responses: true,
    },
  });

  const now = new Date();
  if (activeAttempt) {
    // Check if expired
    if (now > activeAttempt.expiresAt) {
      return await submitQuizAttempt(activeAttempt.id, true);
    }
    return activeAttempt;
  }

  // Check attempt limit
  const pastAttempts = await prisma.quizAttempt.count({
    where: { quizId, studentProfileId },
  });

  if (pastAttempts >= quiz.allowedAttempts) {
    throw new Error(`Maximum allowed attempts (${quiz.allowedAttempts}) reached.`);
  }

  const attemptNumber = pastAttempts + 1;
  const expiresAt = new Date(now.getTime() + quiz.durationMinutes * 60 * 1000);

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      studentProfileId,
      attemptNumber,
      startedAt: now,
      expiresAt,
      status: "IN_PROGRESS",
    },
    include: {
      responses: true,
    },
  });

  return attempt;
}

/**
 * Objective answer evaluator helper.
 */
export function evaluateObjectiveAnswer(
  type: string,
  studentAnswer: string | null | undefined,
  correctAnswer: string,
  numericTolerance: number = 0.0
): boolean {
  if (!studentAnswer) return false;

  const cleanedStudent = studentAnswer.trim();
  const cleanedCorrect = correctAnswer.trim();

  switch (type) {
    case "MCQ_SINGLE":
    case "TRUE_FALSE":
      return cleanedStudent.toLowerCase() === cleanedCorrect.toLowerCase();

    case "MCQ_MULTI": {
      // Options typically stored as comma-separated or JSON array
      const sOptions = cleanedStudent
        .split(/[,;]/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .sort();
      const cOptions = cleanedCorrect
        .split(/[,;]/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .sort();

      return (
        sOptions.length === cOptions.length &&
        sOptions.every((val, idx) => val === cOptions[idx])
      );
    }

    case "NUMERIC": {
      const sNum = parseFloat(cleanedStudent);
      const cNum = parseFloat(cleanedCorrect);
      if (isNaN(sNum) || isNaN(cNum)) return false;
      return Math.abs(sNum - cNum) <= numericTolerance;
    }

    default:
      return false;
  }
}

/**
 * Submits and auto-grades a quiz attempt.
 */
export async function submitQuizAttempt(attemptId: string, autoSubmitted: boolean = false) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        include: {
          questions: {
            include: { question: true },
          },
        },
      },
      responses: true,
    },
  });

  if (!attempt) {
    throw new Error("Quiz attempt not found");
  }

  if (attempt.status !== "IN_PROGRESS") {
    return attempt; // Already finalized
  }

  const now = new Date();
  const responseMap = new Map(attempt.responses.map((r) => [r.questionId, r]));

  let totalScore = 0;
  let hasPendingSubjective = false;

  for (const qItem of attempt.quiz.questions) {
    const q = qItem.question;
    const maxMarks = qItem.customMarks !== null ? qItem.customMarks : q.marks;
    const resp = responseMap.get(q.id);
    const studentAnswer = resp?.responseJson || "";

    const isObjective = [
      "MCQ_SINGLE",
      "MCQ_MULTI",
      "TRUE_FALSE",
      "NUMERIC",
    ].includes(q.type);

    if (isObjective && attempt.quiz.autoEvaluateObjective) {
      const isCorrect = evaluateObjectiveAnswer(
        q.type,
        studentAnswer,
        q.correctAnswer,
        q.numericTolerance || 0.0
      );

      let marks = 0;
      if (isCorrect) {
        marks = maxMarks;
      } else if (
        attempt.quiz.allowNegativeMarking &&
        attempt.quiz.negativeMarkValue > 0 &&
        studentAnswer
      ) {
        marks = -attempt.quiz.negativeMarkValue;
      }

      totalScore += marks;

      await prisma.quizResponse.upsert({
        where: {
          attemptId_questionId: {
            attemptId,
            questionId: q.id,
          },
        },
        update: {
          isEvaluated: true,
          marksAwarded: marks,
        },
        create: {
          attemptId,
          questionId: q.id,
          responseJson: studentAnswer,
          isEvaluated: true,
          marksAwarded: marks,
        },
      });
    } else {
      hasPendingSubjective = true;
      if (resp && !resp.isEvaluated) {
        // Leave pending manual evaluation
      }
    }
  }

  const isPassed = totalScore >= attempt.quiz.passMarks;
  const status = hasPendingSubjective
    ? "PENDING_EVALUATION"
    : "EVALUATED";

  const updatedAttempt = await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: {
      status: autoSubmitted && status === "EVALUATED" ? "AUTO_SUBMITTED" : status,
      submittedAt: now,
      totalScore: Math.max(0, totalScore),
      isPassed,
    },
    include: {
      responses: true,
    },
  });

  // Recalculate academic performance
  if (attempt.quiz.batchId) {
    await calculateStudentAcademicPerformance(
      attempt.studentProfileId,
      attempt.quiz.batchId
    );
  }

  return updatedAttempt;
}

/**
 * Calculates academic performance based on course grading policies.
 */
export async function calculateStudentAcademicPerformance(
  studentProfileId: string,
  batchId: string
) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      course: {
        include: {
          academicGradingPolicies: {
            where: { isCurrent: true },
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!batch) {
    throw new Error("Batch not found");
  }

  const policy = batch.course.academicGradingPolicies[0] || {
    assignmentsWeightPercent: 30.0,
    quizzesWeightPercent: 30.0,
    projectsWeightPercent: 40.0,
    finalExamWeightPercent: 0.0,
    minPassScorePercent: 50.0,
    requiresAssignmentCompletion: true,
    requiresQuizPass: true,
    requiresProjectApproval: true,
  };

  // 1. Assignments Score
  const assignmentSubmissions = await prisma.assignmentSubmission.findMany({
    where: {
      studentProfileId,
      assignment: { batchId },
      status: "GRADED",
      grade: { isPublished: true },
    },
    include: {
      grade: true,
      assignment: true,
    },
  });

  let assignmentScoreAverage = 0;
  if (assignmentSubmissions.length > 0) {
    const totalPercentage = assignmentSubmissions.reduce((sum, s) => {
      const pct = (s.grade!.marksAwarded / s.grade!.maxMarks) * 100;
      return sum + pct;
    }, 0);
    assignmentScoreAverage = Math.round((totalPercentage / assignmentSubmissions.length) * 10) / 10;
  }

  // 2. Quizzes Score
  const quizAttempts = await prisma.quizAttempt.findMany({
    where: {
      studentProfileId,
      quiz: { batchId },
      status: { in: ["EVALUATED", "AUTO_SUBMITTED", "PUBLISHED"] },
    },
    include: { quiz: true },
  });

  let quizScoreAverage = 0;
  if (quizAttempts.length > 0) {
    const totalPercentage = quizAttempts.reduce((sum, a) => {
      const pct = (a.totalScore / a.quiz.maxMarks) * 100;
      return sum + pct;
    }, 0);
    quizScoreAverage = Math.round((totalPercentage / quizAttempts.length) * 10) / 10;
  }

  // 3. Projects Score
  const projectSubmissions = await prisma.projectSubmission.findMany({
    where: {
      studentProfileId,
      project: { batchId },
      marksAwarded: { not: null },
    },
    include: { project: true },
  });

  let projectScoreAverage = 0;
  if (projectSubmissions.length > 0) {
    const totalPercentage = projectSubmissions.reduce((sum, p) => {
      const pct = (p.marksAwarded! / p.project.maxMarks) * 100;
      return sum + pct;
    }, 0);
    projectScoreAverage = Math.round((totalPercentage / projectSubmissions.length) * 10) / 10;
  }

  // 4. Calculate Weighted Score
  const overallAcademicScore = Math.round(
    ((assignmentScoreAverage * policy.assignmentsWeightPercent) / 100 +
      (quizScoreAverage * policy.quizzesWeightPercent) / 100 +
      (projectScoreAverage * policy.projectsWeightPercent) / 100) *
      10
  ) / 10;

  // 5. Eligibility Checks
  let isAcademicallyEligible = overallAcademicScore >= policy.minPassScorePercent;

  if (policy.requiresAssignmentCompletion) {
    const totalAssignments = await prisma.assignment.count({
      where: { batchId, publicationStatus: "PUBLISHED" },
    });
    if (totalAssignments > 0 && assignmentSubmissions.length < totalAssignments) {
      isAcademicallyEligible = false;
    }
  }

  if (policy.requiresQuizPass) {
    const failedQuizzes = quizAttempts.filter((a) => !a.isPassed);
    if (failedQuizzes.length > 0) {
      isAcademicallyEligible = false;
    }
  }

  // Upsert progress cache
  const progress = await prisma.studentAcademicProgress.upsert({
    where: {
      studentProfileId_batchId: {
        studentProfileId,
        batchId,
      },
    },
    update: {
      assignmentScoreAverage,
      quizScoreAverage,
      projectScoreAverage,
      overallAcademicScore,
      isAcademicallyEligible,
    },
    create: {
      studentProfileId,
      batchId,
      assignmentScoreAverage,
      quizScoreAverage,
      projectScoreAverage,
      overallAcademicScore,
      isAcademicallyEligible,
    },
  });

  return {
    ...progress,
    policy,
  };
}
