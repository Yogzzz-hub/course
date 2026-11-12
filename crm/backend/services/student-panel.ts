import crypto from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { getSession, type SessionPayload } from "./auth";
import { generateSlots } from "./booking";
import { submitAssignment } from "./assessment";
import { createPaymentGatewayOrder } from "./payment-gateway";

export class StudentPanelHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "StudentPanelHttpError";
  }
}

export function handleStudentPanelError(error: unknown, fallbackMessage: string) {
  if (error instanceof StudentPanelHttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const errObj = error as { status?: number; message?: string } | null;
  if (errObj?.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (errObj?.message === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (errObj?.message === "ACCOUNT_INACTIVE") {
    return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
  }
  const status = typeof errObj?.status === "number" ? errObj.status : 500;
  return NextResponse.json(
    { error: errObj?.message || fallbackMessage },
    { status }
  );
}

export function createPanelCsrfToken(session: SessionPayload): string {
  const secret = process.env.JWT_SECRET || "default-academy-secret-key-32-chars-long!!";
  return crypto
    .createHmac("sha256", secret)
    .update(`csrf:${session.userId}:${session.role}:${session.email}`)
    .digest("hex")
    .slice(0, 32);
}

export async function requireStudentSession(): Promise<{
  session: SessionPayload;
  studentProfileId: string;
}> {
  const session = await getSession();
  if (!session) {
    throw new StudentPanelHttpError(401, "Unauthorized");
  }
  if (session.role !== "STUDENT") {
    throw new StudentPanelHttpError(403, "Forbidden: student access required");
  }

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true, user: { select: { isActive: true } } },
  });

  if (!studentProfile) {
    throw new StudentPanelHttpError(404, "Student profile not found");
  }
  if (!studentProfile.user.isActive) {
    throw new StudentPanelHttpError(403, "Account is inactive");
  }

  return { session, studentProfileId: studentProfile.id };
}

function toSafeHttpsUrlOrNull(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function toSafeLinkOrNull(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\/(?!\/)/.test(trimmed) && !/[\\\s]/.test(trimmed)) {
    return trimmed;
  }
  return toSafeHttpsUrlOrNull(trimmed);
}

function normalizeCurrency(currency?: string | null): string {
  const upper = (currency || "INR").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(upper) ? upper : "INR";
}

function combineDateAndTime(date: Date, timeStr: string, fallbackMinutesOffset = 0): Date {
  const base = new Date(date);
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
  if (match) {
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      base.setUTCHours(hours, minutes, 0, 0);
    }
  }
  if (fallbackMinutesOffset !== 0) {
    base.setTime(base.getTime() + fallbackMinutesOffset * 60 * 1000);
  }
  return base;
}

function mapLeadStatus(
  rawStatus?: string | null,
  hasPendingOrder = false
): "new" | "counselling_booked" | "counselling_complete" | "plan_ready" | "payment_pending" {
  if (hasPendingOrder) return "payment_pending";
  switch ((rawStatus || "").toUpperCase()) {
    case "COUNSELLING_SCHEDULED":
    case "SCHEDULED":
      return "counselling_booked";
    case "COUNSELLED":
    case "COUNSELLING_COMPLETE":
      return "counselling_complete";
    case "OFFERED":
    case "PLAN_READY":
      return "plan_ready";
    case "PAYMENT_PENDING":
      return "payment_pending";
    default:
      return "new";
  }
}

export async function getStudentPanelSession() {
  const session = await getSession();
  if (!session || session.role !== "STUDENT") {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: session.userId },
        ...(session.email ? [{ email: session.email.toLowerCase().trim() }] : []),
      ],
    },
    include: {
      studentProfile: {
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
            include: { batch: { include: { course: true } } },
            orderBy: { effectiveStartDate: "desc" },
          },
          admissions: {
            include: { course: true },
            orderBy: { createdAt: "desc" },
          },
          feeAgreements: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          payments: {
            where: { verificationStatus: "CONFIRMED" },
            orderBy: { paymentDate: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!user || !user.isActive || !user.studentProfile) {
    return null;
  }

  const profile = user.studentProfile;
  const activeEnrollment = profile.enrollments[0];
  const latestAdmission = profile.admissions[0];
  const confirmedPayment = profile.payments[0];
  const latestAgreement = profile.feeAgreements[0];

  const effectiveSession: SessionPayload = {
    ...session,
    userId: user.id,
    email: user.email,
    name: user.name,
  };
  const csrfToken = createPanelCsrfToken(effectiveSession);
  const cacheKey = `student-${user.id}`;

  const isEnrolled =
    Boolean(activeEnrollment) ||
    Boolean(confirmedPayment) ||
    latestAdmission?.status === "APPROVED";

  if (isEnrolled) {
    const programme =
      activeEnrollment?.batch.course.title ||
      latestAdmission?.course.title ||
      "Academy Cohort Programme";
    const enrolmentId = activeEnrollment?.id || latestAdmission?.id || profile.registrationNumber;
    const verifiedAt = (
      confirmedPayment?.verifiedAt ||
      confirmedPayment?.paymentDate ||
      latestAdmission?.approvedAt ||
      activeEnrollment?.effectiveStartDate ||
      profile.createdAt
    ).toISOString();

    return {
      mode: "enrolled" as const,
      userId: user.id,
      cacheKey,
      name: user.name,
      email: user.email,
      csrfToken,
      enrolmentId,
      programme,
      payment: {
        status: "verified" as const,
        orderId: confirmedPayment?.transactionNumber || latestAgreement?.id || enrolmentId,
        verifiedAt,
      },
    };
  }

  const [lead, pendingOrder] = await Promise.all([
    prisma.lead.findFirst({
      where: { email: user.email.toLowerCase().trim() },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.paymentGatewayOrder.findFirst({
      where: {
        studentProfileId: profile.id,
        status: { in: ["CREATED", "ATTEMPTED"] },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    mode: "prospect" as const,
    userId: user.id,
    cacheKey,
    name: user.name,
    email: user.email,
    csrfToken,
    leadStatus: mapLeadStatus(lead?.status, Boolean(pendingOrder)),
    pendingOrderId: pendingOrder?.orderId || null,
  };
}

export async function getStudentPanelLearningPlan(studentProfileId: string) {
  const profile = await prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    include: {
      user: { select: { email: true } },
      enrollments: {
        where: { status: "ACTIVE" },
        include: { batch: { include: { course: true } } },
        take: 1,
      },
      admissions: {
        include: { course: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      feeAgreements: {
        include: { installments: { orderBy: { installmentNumber: "asc" } } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!profile) {
    throw new StudentPanelHttpError(404, "Student profile not found");
  }

  const agreement = profile.feeAgreements[0];
  let course:
    | NonNullable<typeof profile.admissions[number]>["course"]
    | null =
    profile.enrollments[0]?.batch.course ||
    profile.admissions[0]?.course ||
    null;
  let counsellor = "Admissions Counselling Team";

  if (!course) {
    const lead = await prisma.lead.findFirst({
      where: { email: profile.user.email.toLowerCase().trim() },
      include: {
        courseInterest: true,
        assignedManager: { include: { user: { select: { name: true } } } },
      },
      orderBy: { updatedAt: "desc" },
    });
    if (lead?.assignedManager?.user?.name) {
      counsellor = lead.assignedManager.user.name;
    }
    course =
      lead?.courseInterest ||
      (await prisma.course.findFirst({
        where: { isPublished: true, active: true },
        orderBy: { createdAt: "asc" },
      }));
  }

  if (!course && !agreement) {
    return null;
  }

  const currency = normalizeCurrency(agreement?.currency || "INR");
  const baseFeeMajor = agreement?.courseFee || course?.agreedFeeDefault || 3200;
  const discountMajor = agreement?.discountAmount || 0;
  const taxMajor = agreement?.taxAmount || 0;

  const baseMinor = Math.max(100, Math.round(baseFeeMajor * 100));
  const discountMinor = -Math.max(0, Math.min(baseMinor - 100, Math.round(discountMajor * 100)));
  const taxMinor = Math.max(0, Math.round(taxMajor * 100));
  const fullTotalMinor = baseMinor + discountMinor + taxMinor;

  const firstInstallmentMinor = agreement?.installments?.[0]
    ? Math.max(0, Math.min(fullTotalMinor, Math.round(agreement.installments[0].amountDue * 100)))
    : Math.round(fullTotalMinor / 2);

  const feeLines = [
    { label: "Programme tuition", amountMinor: baseMinor },
    ...(discountMinor < 0 ? [{ label: "Scholarship / fee waiver", amountMinor: discountMinor }] : []),
    ...(taxMinor > 0 ? [{ label: "Applicable taxes", amountMinor: taxMinor }] : []),
  ];

  const cohortPkg = {
    id: agreement ? `pkg-${agreement.id}` : `pkg-${course?.id || "standard"}-full`,
    name: agreement ? "Approved Fee Plan" : "Full Cohort Track",
    description:
      course?.description ||
      "Complete live cohort instruction, lab reviews, mentor feedback, and verified completion certificate.",
    inclusions: [
      { label: "Live faculty cohort sessions & recordings", included: true },
      { label: "Evaluated assignments & capstone rubric reviews", included: true },
      { label: "1-on-1 mentorship booking allocation", included: true },
    ],
    feeLines,
    totalMinor: fullTotalMinor,
    dueNowMinor: firstInstallmentMinor,
  };

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  return {
    id: agreement?.id || `plan-${course?.id || profile.id}`,
    version: `v${agreement?.versionNumber || 1}`,
    programme: course?.title || "Executive Engineering Cohort",
    counsellor,
    summary:
      agreement?.agreedTerms ||
      course?.description ||
      "Personalised study plan and fee schedule.",
    currency,
    recommendedPackageId: cohortPkg.id,
    expiresAt,
    terms: {
      version: "2026-v1",
      url: "/courses",
    },
    packages: [cohortPkg],
  };
}

export async function getStudentPanelDashboard(studentProfileId: string, userId: string) {
  const profile = await prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          batch: {
            include: {
              course: true,
              syllabusVersion: {
                include: {
                  modules: {
                    orderBy: { orderIndex: "asc" },
                    include: {
                      subtopics: { select: { id: true } },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { effectiveStartDate: "desc" },
        take: 1,
      },
      lessonCompletions: {
        where: { status: { in: ["COMPLETED", "VERIFIED"] } },
        select: { lessonId: true },
      },
      assignmentSubmissions: {
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!profile) {
    throw new StudentPanelHttpError(404, "Student profile not found");
  }

  const batch = profile.enrollments[0]?.batch;
  const now = new Date();
  const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [occurrences, assignments, installments, onboardingEvents] = await Promise.all([
    batch
      ? prisma.sessionOccurrence.findMany({
          where: {
            batchId: batch.id,
            status: { not: "CANCELLED" },
            plannedDate: { gte: windowStart },
          },
          orderBy: { plannedDate: "asc" },
          take: 12,
        })
      : Promise.resolve([]),
    batch
      ? prisma.assignment.findMany({
          where: {
            batchId: batch.id,
            publicationStatus: "PUBLISHED",
          },
          orderBy: { dueDate: "asc" },
          take: 10,
        })
      : Promise.resolve([]),
    prisma.feeInstallment.findMany({
      where: {
        studentProfileId,
        status: { in: ["UPCOMING", "OVERDUE", "PARTIALLY_PAID"] },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.auditEvent.findMany({
      where: {
        userId,
        action: "STUDENT_ONBOARDING_COMPLETE",
        entityType: "StudentOnboarding",
      },
      select: { entityId: true },
    }),
  ]);

  const classes = occurrences.map((occ, idx) => {
    const startsAtDate = combineDateAndTime(occ.plannedDate, occ.plannedStartTime);
    let endsAtDate = combineDateAndTime(occ.plannedDate, occ.plannedEndTime);
    if (endsAtDate.getTime() <= startsAtDate.getTime()) {
      endsAtDate = new Date(startsAtDate.getTime() + 90 * 60 * 1000);
    }
    return {
      id: occ.id,
      title: `${batch?.course.code || "Cohort"} Live Session #${idx + 1}`,
      startsAt: startsAtDate.toISOString(),
      endsAt: endsAtDate.toISOString(),
      joinUrl: toSafeLinkOrNull(occ.location),
    };
  });

  const nextClass =
    classes.find((c) => Date.parse(c.endsAt) > now.getTime()) || null;

  const deadlines = [
    ...assignments.map((a) => ({
      id: `asg-${a.id}`,
      title: `Assignment due: ${a.title}`,
      dueAt: a.dueDate.toISOString(),
    })),
    ...installments.map((inst) => ({
      id: `fee-${inst.id}`,
      title: `Fee instalment #${inst.installmentNumber} due`,
      dueAt: inst.dueDate.toISOString(),
    })),
  ].sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));

  let modules: Array<{ id: string; title: string; completed: number; total: number }> = [];
  if (batch) {
    const coveredRows = await prisma.subtopicCoverage.findMany({
      where: { classSession: { batchId: batch.id } },
      select: { subtopicId: true },
    });
    const coveredSet = new Set(coveredRows.map((c) => c.subtopicId));

    modules = batch.syllabusVersion.modules.map((mod) => {
      const total = mod.subtopics.length;
      const rawCompleted = mod.subtopics.filter((s) => coveredSet.has(s.id)).length;
      return {
        id: mod.id,
        title: mod.title,
        completed: Math.min(total, rawCompleted),
        total,
      };
    });

    if (modules.length === 0) {
      const completedLessonIds = new Set(profile.lessonCompletions.map((l) => l.lessonId));
      const units = await prisma.learningUnit.findMany({
        where: { courseId: batch.courseId, isPublished: true },
        include: { lessons: { where: { isPublished: true }, select: { id: true } } },
        orderBy: { orderIndex: "asc" },
      });
      modules = units.map((unit) => {
        const total = unit.lessons.length;
        const completed = unit.lessons.filter((l) => completedLessonIds.has(l.id)).length;
        return {
          id: unit.id,
          title: unit.title,
          completed: Math.min(total, completed),
          total,
        };
      });
    }
  }

  const completedSteps = new Set(
    onboardingEvents.map((e) => e.entityId).filter((v): v is string => Boolean(v))
  );

  const onboarding = [
    {
      id: "onboarding-profile",
      title: "Confirm registration profile & emergency contact",
      completed:
        completedSteps.has("onboarding-profile") ||
        Boolean(profile.address && profile.emergencyContact),
      url: "/student",
    },
    {
      id: "onboarding-curriculum",
      title: "Review batch timetable & syllabus modules",
      completed:
        completedSteps.has("onboarding-curriculum") ||
        profile.lessonCompletions.length > 0,
      url: null,
    },
    {
      id: "onboarding-first-submission",
      title: "Explore coursework rubric & submit first assignment",
      completed:
        completedSteps.has("onboarding-first-submission") ||
        profile.assignmentSubmissions.length > 0,
      url: null,
    },
  ];

  return {
    nextClass,
    classes,
    deadlines,
    modules,
    onboarding,
  };
}

export async function completeStudentOnboardingStep(
  studentProfileId: string,
  userId: string,
  stepId: string
) {
  const cleanStepId = stepId.trim();
  if (!cleanStepId) {
    throw new StudentPanelHttpError(400, "Onboarding step id is required");
  }

  const existing = await prisma.auditEvent.findFirst({
    where: {
      userId,
      action: "STUDENT_ONBOARDING_COMPLETE",
      entityType: "StudentOnboarding",
      entityId: cleanStepId,
    },
  });

  if (!existing) {
    await prisma.auditEvent.create({
      data: {
        userId,
        action: "STUDENT_ONBOARDING_COMPLETE",
        entityType: "StudentOnboarding",
        entityId: cleanStepId,
        detailsJson: JSON.stringify({ studentProfileId, completedAt: new Date().toISOString() }),
      },
    });
  }

  return getStudentPanelDashboard(studentProfileId, userId);
}

function parseSubmissionLinks(content?: string | null, externalLink?: string | null) {
  let parsedRepo: string | null = null;
  let parsedLive: string | null = null;

  if (content) {
    try {
      const parsed = JSON.parse(content) as { repositoryUrl?: string; liveUrl?: string };
      parsedRepo = toSafeHttpsUrlOrNull(parsed.repositoryUrl);
      parsedLive = toSafeHttpsUrlOrNull(parsed.liveUrl);
    } catch {
      // Plain text content
    }
  }

  if (!parsedRepo) {
    parsedRepo = toSafeHttpsUrlOrNull(externalLink);
  }

  return {
    repositoryUrl: parsedRepo,
    liveUrl: parsedLive,
  };
}

function formatAssignmentForPanel(a: {
  id: string;
  title: string;
  description: string;
  maxMarks: number;
  dueDate: Date;
  allowedSubmissionTypes: string;
  lateSubmissionPolicy: string;
  maxAttempts: number;
  publicationStatus: string;
  course: { id: string; title: string; code: string };
  batch: { id: string; code: string } | null;
  rubricCriteria: Array<{ id: string; title: string; maxMarks: number }>;
  submissions: Array<{
    id: string;
    attemptNumber: number;
    status: string;
    submittedAt: Date;
    isLate: boolean;
    content: string | null;
    attachmentUrl: string | null;
    externalLink: string | null;
    grade: {
      marksAwarded: number;
      maxMarks: number;
      feedback: string | null;
      rubricScoresJson: string | null;
    } | null;
  }>;
}) {
  const now = new Date();
  const rubric = a.rubricCriteria.map((r) => ({
    id: r.id,
    label: r.title,
    maxPoints: Math.max(0, Math.round(r.maxMarks)),
  }));
  const rubricMaxMap = new Map(rubric.map((r) => [r.id, r.maxPoints]));

  const latestSubmission = a.submissions[0] || null;
  const maxAttempts = Math.max(1, a.maxAttempts);
  const canSubmit =
    a.publicationStatus === "PUBLISHED" &&
    a.submissions.length < maxAttempts &&
    !(a.lateSubmissionPolicy === "DISALLOWED" && a.dueDate.getTime() < now.getTime());

  const attempts = [...a.submissions]
    .sort((left, right) => left.attemptNumber - right.attemptNumber)
    .map((s) => {
      const links = parseSubmissionLinks(s.content, s.externalLink);
      const attachmentName = s.attachmentUrl ? path.basename(s.attachmentUrl).trim() : null;
      const status =
        s.status === "GRADED" || s.grade
          ? ("graded" as const)
          : s.status === "UNDER_REVIEW"
            ? ("reviewing" as const)
            : ("submitted" as const);

      const scores: Array<{ rubricId: string; points: number }> = [];
      if (s.grade?.rubricScoresJson && rubric.length > 0) {
        try {
          const rawScores = JSON.parse(s.grade.rubricScoresJson);
          if (Array.isArray(rawScores)) {
            for (const entry of rawScores) {
              const rubricId = String(entry?.rubricId || entry?.criterionId || "");
              const maxPoints = rubricMaxMap.get(rubricId);
              const pts = Number(entry?.points ?? entry?.marks ?? 0);
              if (maxPoints !== undefined && Number.isFinite(pts)) {
                scores.push({
                  rubricId,
                  points: Math.max(0, Math.min(maxPoints, Math.round(pts))),
                });
              }
            }
          } else if (rawScores && typeof rawScores === "object") {
            for (const [rubricId, val] of Object.entries(rawScores as Record<string, unknown>)) {
              const maxPoints = rubricMaxMap.get(rubricId);
              const pts = Number(val);
              if (maxPoints !== undefined && Number.isFinite(pts)) {
                scores.push({
                  rubricId,
                  points: Math.max(0, Math.min(maxPoints, Math.round(pts))),
                });
              }
            }
          }
        } catch {
          // Ignore malformed legacy score JSON
        }
      }

      return {
        id: s.id,
        number: Math.max(0, s.attemptNumber),
        submittedAt: s.submittedAt.toISOString(),
        status,
        repositoryUrl: links.repositoryUrl,
        liveUrl: links.liveUrl,
        attachmentName: attachmentName || null,
        feedback: s.grade?.feedback ?? null,
        scores,
      };
    });

  return {
    // Existing CRM fields (consumed by crm/src/app/student/assignments/page.tsx)
    id: a.id,
    title: a.title,
    description: a.description,
    maxMarks: a.maxMarks,
    dueDate: a.dueDate,
    allowedSubmissionTypes: a.allowedSubmissionTypes,
    lateSubmissionPolicy: a.lateSubmissionPolicy,
    maxAttempts,
    publicationStatus: a.publicationStatus,
    course: a.course,
    batch: a.batch,
    submissionCount: a.submissions.length,
    latestSubmission: latestSubmission
      ? {
          id: latestSubmission.id,
          attemptNumber: latestSubmission.attemptNumber,
          status: latestSubmission.status,
          submittedAt: latestSubmission.submittedAt,
          isLate: latestSubmission.isLate,
          grade: latestSubmission.grade
            ? {
                marksAwarded: latestSubmission.grade.marksAwarded,
                maxMarks: latestSubmission.grade.maxMarks,
                feedback: latestSubmission.grade.feedback,
                rubricScoresJson: latestSubmission.grade.rubricScoresJson,
              }
            : null,
        }
      : null,
    // StudentPanel Zod contract fields (`assignmentsSchema`)
    kind: /project|capstone/i.test(a.title) ? ("project" as const) : ("assignment" as const),
    dueAt: a.dueDate.toISOString(),
    canSubmit,
    rubric,
    attempts,
  };
}

export async function getStudentPanelAssignments(studentProfileId: string) {
  const profile = await prisma.studentProfile.findUnique({
    where: { id: studentProfileId },
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
        select: { batchId: true },
      },
    },
  });

  if (!profile) {
    throw new StudentPanelHttpError(404, "Student profile not found");
  }

  const batchIds = profile.enrollments.map((e) => e.batchId);
  if (batchIds.length === 0) {
    return [];
  }

  const assignments = await prisma.assignment.findMany({
    where: {
      batchId: { in: batchIds },
      publicationStatus: { in: ["PUBLISHED", "CLOSED"] },
    },
    include: {
      course: { select: { id: true, title: true, code: true } },
      batch: { select: { id: true, code: true } },
      rubricCriteria: { orderBy: { orderIndex: "asc" } },
      submissions: {
        where: { studentProfileId },
        include: { grade: true },
        orderBy: { attemptNumber: "desc" },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  return assignments.map(formatAssignmentForPanel);
}

export async function submitStudentPanelAssignment(params: {
  assignmentId: string;
  studentProfileId: string;
  repositoryUrl?: string;
  liveUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
}) {
  const {
    assignmentId,
    studentProfileId,
    repositoryUrl = "",
    liveUrl = "",
    attachmentName,
    attachmentSize = 0,
  } = params;

  if (attachmentSize > 10 * 1024 * 1024) {
    throw new StudentPanelHttpError(413, "Attachment exceeds the 10 MB limit.");
  }

  const cleanRepo = repositoryUrl.trim();
  const cleanLive = liveUrl.trim();
  const safeRepo = cleanRepo ? toSafeHttpsUrlOrNull(cleanRepo) : null;
  const safeLive = cleanLive ? toSafeHttpsUrlOrNull(cleanLive) : null;

  if ((cleanRepo && !safeRepo) || (cleanLive && !safeLive)) {
    throw new StudentPanelHttpError(422, "Repository and live links must use HTTPS.");
  }
  if (!safeRepo && !safeLive && !attachmentName) {
    throw new StudentPanelHttpError(422, "Provide a repository link, live link, or file attachment.");
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, batchId: true },
  });
  if (!assignment) {
    throw new StudentPanelHttpError(404, "Assignment not found");
  }

  if (assignment.batchId) {
    const enrolled = await prisma.studentBatchEnrollment.findFirst({
      where: {
        studentProfileId,
        batchId: assignment.batchId,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (!enrolled) {
      throw new StudentPanelHttpError(403, "You are not enrolled in the batch for this assignment.");
    }
  }

  try {
    await submitAssignment({
      assignmentId,
      studentProfileId,
      content: JSON.stringify({ repositoryUrl: safeRepo, liveUrl: safeLive }),
      attachmentUrl: attachmentName ? path.basename(attachmentName).slice(0, 200) : undefined,
      externalLink: safeRepo || safeLive || undefined,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to submit assignment";
    throw new StudentPanelHttpError(409, msg);
  }

  const updated = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      course: { select: { id: true, title: true, code: true } },
      batch: { select: { id: true, code: true } },
      rubricCriteria: { orderBy: { orderIndex: "asc" } },
      submissions: {
        where: { studentProfileId },
        include: { grade: true },
        orderBy: { attemptNumber: "desc" },
      },
    },
  });

  if (!updated) {
    throw new StudentPanelHttpError(404, "Assignment not found");
  }

  return formatAssignmentForPanel(updated);
}

interface StoredMentorshipBooking {
  id: string;
  slotId: string;
  startsAt: string;
  endsAt: string;
  mentor: string;
  status: "booked" | "completed" | "cancelled";
  joinUrl: string | null;
}

const MENTORSHIP_ENTITLEMENT_TOTAL = 6;

async function getStoredMentorshipBookings(userId: string): Promise<StoredMentorshipBooking[]> {
  const events = await prisma.auditEvent.findMany({
    where: {
      userId,
      action: "MENTORSHIP_BOOKED",
      entityType: "MentorshipBooking",
    },
    orderBy: { createdAt: "desc" },
  });

  const nowMs = Date.now();
  const seen = new Set<string>();
  const bookings: StoredMentorshipBooking[] = [];

  for (const evt of events) {
    const slotId = evt.entityId || evt.id;
    if (seen.has(slotId)) continue;
    seen.add(slotId);

    try {
      const payload = JSON.parse(evt.detailsJson || "{}") as Partial<StoredMentorshipBooking>;
      const startsAt = payload.startsAt || new Date(evt.createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString();
      const endsAt = payload.endsAt || new Date(Date.parse(startsAt) + 45 * 60 * 1000).toISOString();
      const status =
        payload.status === "cancelled"
          ? "cancelled"
          : Date.parse(endsAt) <= nowMs
            ? "completed"
            : "booked";

      bookings.push({
        id: payload.id || evt.id,
        slotId,
        startsAt,
        endsAt,
        mentor: payload.mentor || "Assigned Faculty Mentor",
        status,
        joinUrl: toSafeLinkOrNull(payload.joinUrl),
      });
    } catch {
      // Skip corrupted booking audit row
    }
  }

  return bookings;
}

export async function getStudentPanelMentorship(studentProfileId: string, userId: string) {
  const [bookings, attendanceEntries] = await Promise.all([
    getStoredMentorshipBookings(userId),
    prisma.attendanceEntry.findMany({
      where: { studentProfileId },
      include: {
        classSession: {
          include: { batch: { include: { course: true } } },
        },
      },
      orderBy: { classSession: { sessionDate: "desc" } },
      take: 30,
    }),
  ]);

  const used = bookings.filter((b) => b.status === "completed").length;
  const reserved = bookings.filter((b) => b.status === "booked").length;
  const total = Math.max(MENTORSHIP_ENTITLEMENT_TOTAL, used + reserved);

  const attendance = attendanceEntries.map((entry) => {
    const startsAt = combineDateAndTime(
      entry.classSession.sessionDate,
      entry.classSession.actualStartTime
    );
    const statusMap: Record<string, "present" | "absent" | "excused" | "pending"> = {
      PRESENT: "present",
      LATE: "present",
      ABSENT: "absent",
      EXCUSED: "excused",
    };

    return {
      classId: entry.classSessionId,
      title: `${entry.classSession.batch.course.code} Cohort Session (${entry.classSession.batch.code})`,
      startsAt: startsAt.toISOString(),
      status: statusMap[entry.status] || "pending",
    };
  });

  return {
    entitlement: { total, used, reserved },
    bookings: bookings.map(({ id, startsAt, endsAt, mentor, status, joinUrl }) => ({
      id,
      startsAt,
      endsAt,
      mentor,
      status,
      joinUrl,
    })),
    attendance,
  };
}

export async function getStudentPanelMentorshipSlots(studentProfileId: string, userId: string) {
  const [bookings, enrollment] = await Promise.all([
    getStoredMentorshipBookings(userId),
    prisma.studentBatchEnrollment.findFirst({
      where: { studentProfileId, status: "ACTIVE" },
      include: {
        batch: {
          include: {
            trainerAllocations: {
              include: { trainerProfile: { include: { user: { select: { name: true } } } } },
              orderBy: { isPrimary: "desc" },
              take: 1,
            },
          },
        },
      },
    }),
  ]);

  const bookedSlotIds = new Set(
    bookings.filter((b) => b.status !== "cancelled").map((b) => b.slotId)
  );
  const mentorName =
    enrollment?.batch.trainerAllocations[0]?.trainerProfile.user.name ||
    "David Chen · Senior Mentor";

  return generateSlots(7)
    .filter((s) => s.available && !bookedSlotIds.has(s.id) && Date.parse(s.endsAt) > Date.parse(s.startsAt))
    .slice(0, 12)
    .map((slot) => ({
      id: slot.id,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      mentor: mentorName,
    }));
}

export async function bookStudentPanelMentorshipSlot(
  studentProfileId: string,
  userId: string,
  slotId: string
) {
  const cleanSlotId = slotId.trim();
  if (!cleanSlotId) {
    throw new StudentPanelHttpError(400, "Slot id is required");
  }

  const availableSlots = await getStudentPanelMentorshipSlots(studentProfileId, userId);
  const matchingSlot = availableSlots.find((s) => s.id === cleanSlotId);
  if (!matchingSlot) {
    throw new StudentPanelHttpError(409, "Selected mentorship slot is no longer available");
  }

  const current = await getStudentPanelMentorship(studentProfileId, userId);
  if (current.entitlement.used + current.entitlement.reserved >= current.entitlement.total) {
    throw new StudentPanelHttpError(409, "All mentorship sessions in your entitlement are already reserved");
  }

  await prisma.auditEvent.create({
    data: {
      userId,
      action: "MENTORSHIP_BOOKED",
      entityType: "MentorshipBooking",
      entityId: cleanSlotId,
      detailsJson: JSON.stringify({
        id: `bk-${cleanSlotId}`,
        slotId: cleanSlotId,
        startsAt: matchingSlot.startsAt,
        endsAt: matchingSlot.endsAt,
        mentor: matchingSlot.mentor,
        status: "booked",
        joinUrl: null,
      }),
    },
  });

  return getStudentPanelMentorship(studentProfileId, userId);
}

export async function getStudentPanelSessions(studentProfileId: string, userId: string) {
  const [mentorship, enrollment] = await Promise.all([
    getStudentPanelMentorship(studentProfileId, userId),
    prisma.studentBatchEnrollment.findFirst({
      where: { studentProfileId, status: "ACTIVE" },
      select: { batchId: true },
    }),
  ]);

  const bookingSessions = mentorship.bookings.map((b) => ({
    id: b.id,
    title: `1-on-1 Mentorship · ${b.mentor}`,
    startsAt: b.startsAt,
    status: b.status,
    joinUrl: b.joinUrl,
  }));

  if (!enrollment) {
    return bookingSessions;
  }

  const occurrences = await prisma.sessionOccurrence.findMany({
    where: {
      batchId: enrollment.batchId,
      plannedDate: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { plannedDate: "asc" },
    take: 10,
  });

  const classSessions = occurrences.map((occ, idx) => ({
    id: occ.id,
    title: `Live Cohort Session #${idx + 1}`,
    startsAt: combineDateAndTime(occ.plannedDate, occ.plannedStartTime).toISOString(),
    status:
      occ.status === "CANCELLED"
        ? ("cancelled" as const)
        : occ.status === "HELD"
          ? ("completed" as const)
          : ("booked" as const),
    joinUrl: toSafeLinkOrNull(occ.location),
  }));

  return [...bookingSessions, ...classSessions].sort(
    (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)
  );
}

export async function getStudentPanelPayments(studentProfileId: string) {
  const [agreement, openOrders, receipts] = await Promise.all([
    prisma.feeAgreement.findFirst({
      where: { studentProfileId },
      include: { installments: { orderBy: { installmentNumber: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.paymentGatewayOrder.findMany({
      where: {
        studentProfileId,
        status: { in: ["CREATED", "ATTEMPTED"] },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.receipt.findMany({
      where: { studentProfileId, isVoid: false },
      orderBy: { receiptDate: "desc" },
    }),
  ]);

  const orderByInstallment = new Map<string, string>();
  for (const order of openOrders) {
    if (order.installmentId && !orderByInstallment.has(order.installmentId)) {
      orderByInstallment.set(order.installmentId, order.orderId);
    }
  }

  const latestReceiptUrl = receipts[0] ? `/api/receipts/${receipts[0].id}/pdf` : null;

  return {
    currency: normalizeCurrency(agreement?.currency || "INR"),
    instalments: (agreement?.installments || []).map((inst) => {
      const pendingOrderId = orderByInstallment.get(inst.id) || null;
      const isPaid = inst.status === "PAID" || inst.remainingBalance <= 0;
      const status = isPaid
        ? ("paid" as const)
        : pendingOrderId
          ? ("processing" as const)
          : ("due" as const);
      const amountMajor = isPaid ? inst.amountDue : inst.remainingBalance;

      return {
        id: inst.id,
        label: `Instalment #${inst.installmentNumber}`,
        amountMinor: Math.max(0, Math.round(amountMajor * 100)),
        dueAt: inst.dueDate.toISOString(),
        status,
        pendingOrderId,
        receiptUrl: isPaid ? latestReceiptUrl : null,
      };
    }),
  };
}

function mapGatewayOrderStatus(
  status: string
): "pending" | "verified" | "failed" | "cancelled" {
  switch (status.toUpperCase()) {
    case "PAID":
    case "VERIFIED":
      return "verified";
    case "FAILED":
      return "failed";
    case "EXPIRED":
    case "CANCELLED":
      return "cancelled";
    default:
      return "pending";
  }
}

export async function createStudentPanelInstalmentOrder(
  studentProfileId: string,
  installmentId: string
) {
  const installment = await prisma.feeInstallment.findFirst({
    where: { id: installmentId, studentProfileId },
  });

  if (!installment) {
    throw new StudentPanelHttpError(404, "Instalment not found");
  }
  if (installment.status === "PAID" || installment.remainingBalance <= 0) {
    throw new StudentPanelHttpError(409, "This instalment has already been paid");
  }

  const existingOpen = await prisma.paymentGatewayOrder.findFirst({
    where: {
      studentProfileId,
      installmentId: installment.id,
      status: { in: ["CREATED", "ATTEMPTED"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingOpen) {
    return {
      id: existingOpen.orderId,
      status: "pending" as const,
      amountMinor: Math.max(0, Math.round(existingOpen.amount * 100)),
      currency: normalizeCurrency(existingOpen.currency),
      checkoutUrl: toSafeHttpsUrlOrNull(existingOpen.checkoutUrl),
      expiresAt: new Date(existingOpen.createdAt.getTime() + 30 * 60 * 1000).toISOString(),
      receiptUrl: null,
    };
  }

  const agreement = await prisma.feeAgreement.findUnique({
    where: { id: installment.feeAgreementId },
    select: { currency: true },
  });

  const amountMajor =
    installment.remainingBalance > 0 ? installment.remainingBalance : installment.amountDue;

  const created = await createPaymentGatewayOrder({
    studentProfileId,
    feeAgreementId: installment.feeAgreementId,
    installmentId: installment.id,
    amount: amountMajor,
    currency: normalizeCurrency(agreement?.currency || "INR"),
    provider: "SANDBOX",
  });

  return {
    id: created.orderId,
    status: "pending" as const,
    amountMinor: Math.max(0, Math.round(created.amount * 100)),
    currency: normalizeCurrency(created.currency),
    checkoutUrl: toSafeHttpsUrlOrNull(created.checkoutUrl),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    receiptUrl: null,
  };
}

export async function createStudentPanelCheckoutOrder(
  studentProfileId: string,
  userId: string,
  input: {
    planId: string;
    expectedAmountMinor: number;
    currency: string;
  }
) {
  const plan = await getStudentPanelLearningPlan(studentProfileId);
  if (!plan) {
    throw new StudentPanelHttpError(409, "No active learning plan is ready for checkout.");
  }

  let agreement = await prisma.feeAgreement.findFirst({
    where: { studentProfileId },
    orderBy: { createdAt: "desc" },
  });

  if (!agreement) {
    const course = await prisma.course.findFirst({
      where: { isPublished: true, active: true },
      orderBy: { createdAt: "asc" },
    });
    if (!course) {
      throw new StudentPanelHttpError(409, "No published course available for admission checkout.");
    }

    const admission = await prisma.admission.create({
      data: {
        registrationNumber: `ADM-${Date.now().toString(36).toUpperCase()}`,
        studentProfileId,
        courseId: course.id,
        agreedFee: input.expectedAmountMinor / 100,
        status: "APPROVED",
        createdById: userId,
      },
    });

    agreement = await prisma.feeAgreement.create({
      data: {
        admissionId: admission.id,
        studentProfileId,
        courseFee: course.agreedFeeDefault,
        totalAgreedFee: input.expectedAmountMinor / 100,
        currency: normalizeCurrency(input.currency),
        installmentsCount: 1,
        status: "APPROVED",
        isApproved: true,
      },
    });
  }

  const created = await createPaymentGatewayOrder({
    studentProfileId,
    feeAgreementId: agreement.id,
    amount: input.expectedAmountMinor / 100,
    currency: normalizeCurrency(input.currency),
    provider: "SANDBOX",
  });

  return {
    id: created.orderId,
    status: "pending" as const,
    amountMinor: input.expectedAmountMinor,
    currency: normalizeCurrency(created.currency),
    checkoutUrl: toSafeHttpsUrlOrNull(created.checkoutUrl),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    receiptUrl: null,
  };
}

export async function getStudentPanelOrder(studentProfileId: string, orderId: string) {
  const order = await prisma.paymentGatewayOrder.findFirst({
    where: {
      studentProfileId,
      OR: [{ orderId }, { id: orderId }],
    },
  });

  if (!order) {
    throw new StudentPanelHttpError(404, "Payment order not found");
  }

  let receiptUrl: string | null = null;
  if (order.status === "PAID") {
    const receipt = await prisma.receipt.findFirst({
      where: { studentProfileId, isVoid: false },
      orderBy: { receiptDate: "desc" },
    });
    if (receipt) {
      receiptUrl = `/api/receipts/${receipt.id}/pdf`;
    }
  }

  return {
    id: order.orderId,
    status: mapGatewayOrderStatus(order.status),
    amountMinor: Math.max(0, Math.round(order.amount * 100)),
    currency: normalizeCurrency(order.currency),
    checkoutUrl: toSafeHttpsUrlOrNull(order.checkoutUrl),
    expiresAt: new Date(order.createdAt.getTime() + 30 * 60 * 1000).toISOString(),
    receiptUrl,
  };
}
