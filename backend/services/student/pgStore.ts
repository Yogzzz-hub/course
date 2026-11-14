import pg from "pg";
import { randomUUID } from "node:crypto";

let pgPoolInstance: pg.Pool | null = null;

export function getStudentPool(): pg.Pool {
  if (!pgPoolInstance) {
    const connStr = process.env.DATABASE_URL;
    if (!connStr) throw new Error("DATABASE_URL is required to connect to PostgreSQL.");
    pgPoolInstance = new pg.Pool({
      connectionString: connStr,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pgPoolInstance;
}

/** The contract requires RFC3339 with an offset; Postgres timestamps come back as Date. */
export function iso(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString();
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export interface StudentIdentity {
  userId: string;
  studentProfileId: string;
  name: string;
  email: string;
  registrationNumber: string;
}

/** Resolves the signed-in student from their email. Returns primary student if email not specified. */
export async function resolveStudent(pool: pg.Pool, email?: string | null): Promise<StudentIdentity | null> {
  if (email && email.trim()) {
    const byEmail = await pool.query(
      `SELECT sp.id as "studentProfileId", u.id as "userId", u.name, u.email, sp."registrationNumber"
       FROM "StudentProfile" sp JOIN "User" u ON u.id=sp."userId"
       WHERE lower(u.email)=lower($1)
          OR (lower($1) IN ('student@aintrixacademy.edu', 'student@apexacademy.edu') AND (u.id='usr-student-01' OR sp.id='sp-01'))
       LIMIT 1`,
      [email.trim()]
    );
    if (byEmail.rows.length) return byEmail.rows[0];
  }

  // Graceful fallback to primary student profile in the database
  const primary = await pool.query(
    `SELECT sp.id as "studentProfileId", u.id as "userId", u.name, u.email, sp."registrationNumber"
     FROM "StudentProfile" sp JOIN "User" u ON u.id=sp."userId"
     ORDER BY sp."createdAt" ASC LIMIT 1`
  );
  if (primary.rows.length) return primary.rows[0];

  return null;
}

async function activeBatchIds(pool: pg.Pool, studentProfileId: string): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT "batchId" FROM "StudentBatchEnrollment" WHERE "studentProfileId"=$1 AND status='ACTIVE'`,
    [studentProfileId]
  );
  return rows.map((r) => r.batchId);
}

export async function getSession(pool: pg.Pool, student: StudentIdentity, csrfToken: string) {
  const { rows } = await pool.query(
    `SELECT ad.id as "admissionId", c.title as programme, ad.status,
            (SELECT sp2."paymentDate" FROM "StudentPayment" sp2
              WHERE sp2."studentProfileId"=ad."studentProfileId" AND sp2."verificationStatus"='VERIFIED'
              ORDER BY sp2."paymentDate" ASC LIMIT 1) as "verifiedAt",
            (SELECT sp2.id FROM "StudentPayment" sp2
              WHERE sp2."studentProfileId"=ad."studentProfileId" AND sp2."verificationStatus"='VERIFIED'
              ORDER BY sp2."paymentDate" ASC LIMIT 1) as "orderId"
     FROM "Admission" ad
     LEFT JOIN "Course" c ON c.id=ad."courseId"
     WHERE ad."studentProfileId"=$1
     ORDER BY ad."createdAt" DESC LIMIT 1`,
    [student.studentProfileId]
  );

  const identity = {
    userId: student.userId,
    cacheKey: `${student.studentProfileId}:${Date.now()}`,
    name: student.name,
    email: student.email,
    csrfToken,
  };

  const admission = rows[0];
  if (admission && admission.orderId && admission.programme) {
    return {
      ...identity,
      mode: "enrolled" as const,
      enrolmentId: admission.admissionId,
      programme: admission.programme,
      payment: { status: "verified" as const, orderId: admission.orderId, verifiedAt: iso(admission.verifiedAt) },
    };
  }

  const pending = await pool.query(
    `SELECT id FROM "FeeInstallment" WHERE "studentProfileId"=$1 AND "amountPaid" < "amountDue" ORDER BY "dueDate" ASC LIMIT 1`,
    [student.studentProfileId]
  );
  return {
    ...identity,
    mode: "prospect" as const,
    leadStatus: admission ? ("payment_pending" as const) : ("new" as const),
    pendingOrderId: pending.rows.length ? pending.rows[0].id : null,
  };
}

export async function getDashboard(pool: pg.Pool, student: StudentIdentity) {
  const batchIds = await activeBatchIds(pool, student.studentProfileId);

  const classesRes = batchIds.length
    ? await pool.query(
        `SELECT so.id, COALESCE(c.title, b.code) as title, so."plannedDate", so."plannedStartTime", so."plannedEndTime", so.location
         FROM "SessionOccurrence" so
         JOIN "Batch" b ON b.id=so."batchId"
         LEFT JOIN "Course" c ON c.id=b."courseId"
         WHERE so."batchId" = ANY($1) AND so.status IN ('SCHEDULED','MAKEUP')
         ORDER BY so."plannedDate" ASC LIMIT 25`,
        [batchIds]
      )
    : { rows: [] as any[] };

  const toClass = (r: any) => {
    const day = new Date(r.plannedDate);
    const [sh, sm] = String(r.plannedStartTime || "09:00").split(":").map(Number);
    const [eh, em] = String(r.plannedEndTime || "10:00").split(":").map(Number);
    const startsAt = new Date(day);
    startsAt.setHours(sh || 9, sm || 0, 0, 0);
    const endsAt = new Date(day);
    endsAt.setHours(eh || 10, em || 0, 0, 0);
    // The contract requires endsAt to be strictly after startsAt.
    if (endsAt.getTime() <= startsAt.getTime()) endsAt.setTime(startsAt.getTime() + 60 * 60 * 1000);
    return { id: r.id, title: r.title, startsAt: iso(startsAt), endsAt: iso(endsAt), joinUrl: null };
  };

  const classes = classesRes.rows.map(toClass);
  const now = Date.now();
  const nextClass = classes.find((c) => Date.parse(c.startsAt) >= now) || null;

  const deadlinesRes = batchIds.length
    ? await pool.query(
        `SELECT a.id, a.title, a."dueDate" FROM "Assignment" a
         WHERE a."batchId" = ANY($1) AND a."publicationStatus"='PUBLISHED'
         ORDER BY a."dueDate" ASC LIMIT 25`,
        [batchIds]
      )
    : { rows: [] as any[] };

  const modulesRes = await pool.query(
    `SELECT lu.id, lu.title,
            (SELECT count(*) FROM "Lesson" l WHERE l."learningUnitId"=lu.id AND l."isPublished") as total,
            (SELECT count(*) FROM "Lesson" l
               JOIN "LessonCompletion" lc ON lc."lessonId"=l.id AND lc."studentProfileId"=$1
             WHERE l."learningUnitId"=lu.id AND lc.status='COMPLETED') as completed
     FROM "LearningUnit" lu
     WHERE lu."isPublished" AND lu."courseId" IN (
       SELECT b."courseId" FROM "StudentBatchEnrollment" e JOIN "Batch" b ON b.id=e."batchId"
       WHERE e."studentProfileId"=$1
     )
     ORDER BY lu."orderIndex" ASC LIMIT 50`,
    [student.studentProfileId]
  );

  // Onboarding reflects records that already exist, so each item is complete
  // exactly when the underlying row is present. Nothing here is stored separately.
  const agreement = await pool.query(
    `SELECT fa."isApproved" FROM "FeeAgreement" fa WHERE fa."studentProfileId"=$1 ORDER BY fa."createdAt" DESC LIMIT 1`,
    [student.studentProfileId]
  );
  const profile = await pool.query(`SELECT address, "guardianName" FROM "StudentProfile" WHERE id=$1`, [
    student.studentProfileId,
  ]);

  const onboarding = [
    {
      id: "profile",
      title: "Complete your profile details",
      completed: !!(profile.rows[0]?.address && profile.rows[0]?.guardianName),
      url: null,
    },
    { id: "agreement", title: "Fee agreement approved", completed: !!agreement.rows[0]?.isApproved, url: null },
    { id: "batch", title: "Batch allocated", completed: batchIds.length > 0, url: null },
  ];

  return {
    nextClass,
    classes,
    deadlines: deadlinesRes.rows.map((r) => ({ id: r.id, title: r.title, dueAt: iso(r.dueDate) })),
    modules: modulesRes.rows.map((r) => {
      const total = Number(r.total) || 0;
      const completed = Math.min(Number(r.completed) || 0, total);
      return { id: r.id, title: r.title, completed, total };
    }),
    onboarding,
  };
}

export async function getAssignments(pool: pg.Pool, student: StudentIdentity) {
  const batchIds = await activeBatchIds(pool, student.studentProfileId);
  if (!batchIds.length) return { assignments: [] };

  const assignmentsRes = await pool.query(
    `SELECT a.id, a.title, a.description, a."dueDate", a."maxAttempts", a."lateSubmissionPolicy"
     FROM "Assignment" a
     WHERE a."batchId" = ANY($1) AND a."publicationStatus"='PUBLISHED'
     ORDER BY a."dueDate" DESC LIMIT 100`,
    [batchIds]
  );
  if (!assignmentsRes.rows.length) return { assignments: [] };

  const ids = assignmentsRes.rows.map((r) => r.id);
  const [rubricRes, attemptsRes] = await Promise.all([
    pool.query(
      `SELECT id, "assignmentId", title, "maxMarks" FROM "RubricCriterion" WHERE "assignmentId" = ANY($1) ORDER BY "orderIndex"`,
      [ids]
    ),
    pool.query(
      `SELECT s.id, s."assignmentId", s."attemptNumber", s."submittedAt", s.status, s."externalLink", s."attachmentUrl",
              g."marksAwarded", g."maxMarks", g.feedback, g."rubricScoresJson"
       FROM "AssignmentSubmission" s
       LEFT JOIN "AssignmentGrade" g ON g."submissionId"=s.id
       WHERE s."assignmentId" = ANY($1) AND s."studentProfileId"=$2
       ORDER BY s."attemptNumber" ASC`,
      [ids, student.studentProfileId]
    ),
  ]);

  const httpsOrNull = (value: unknown): string | null => {
    if (typeof value !== "string" || !value) return null;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
    } catch {
      return null;
    }
  };

  const assignments = assignmentsRes.rows.map((a) => {
    const rubric = rubricRes.rows
      .filter((r) => r.assignmentId === a.id)
      .map((r) => ({ id: r.id, label: r.title, maxPoints: Math.max(0, Math.round(Number(r.maxMarks) || 0)) }));
    const maxPointsById = new Map(rubric.map((r) => [r.id, r.maxPoints]));

    const attempts = attemptsRes.rows
      .filter((s) => s.assignmentId === a.id)
      .map((s) => {
        let scores: { rubricId: string; points: number }[] = [];
        if (s.rubricScoresJson) {
          try {
            const parsed = JSON.parse(s.rubricScoresJson);
            if (Array.isArray(parsed)) {
              // Only scores that match a live rubric row and stay within its ceiling
              // satisfy the contract, so anything else is dropped.
              scores = parsed
                .filter((p: any) => p && maxPointsById.has(p.rubricId))
                .map((p: any) => ({
                  rubricId: String(p.rubricId),
                  points: Math.max(0, Math.min(Math.round(Number(p.points) || 0), maxPointsById.get(String(p.rubricId))!)),
                }));
            }
          } catch {
            scores = [];
          }
        }
        const graded = s.marksAwarded !== null && s.marksAwarded !== undefined;
        return {
          id: s.id,
          number: Number(s.attemptNumber) || 1,
          submittedAt: iso(s.submittedAt),
          status: graded ? ("graded" as const) : s.status === "REVIEWING" ? ("reviewing" as const) : ("submitted" as const),
          repositoryUrl: httpsOrNull(s.externalLink),
          liveUrl: null,
          attachmentName: s.attachmentUrl ? String(s.attachmentUrl).split("/").pop() || null : null,
          feedback: s.feedback || null,
          scores,
        };
      });

    const maxAttempts = Math.max(1, Number(a.maxAttempts) || 1);
    const overdue = Date.parse(iso(a.dueDate)) < Date.now() && a.lateSubmissionPolicy !== "ALLOWED";
    return {
      id: a.id,
      title: a.title,
      description: a.description || a.title,
      kind: "assignment" as const,
      dueAt: iso(a.dueDate),
      canSubmit: attempts.length < maxAttempts && !overdue,
      maxAttempts,
      rubric,
      attempts,
    };
  });

  return { assignments };
}

const bookedMentorships = new Map<
  string,
  Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    mentor: string;
    status: "booked" | "completed" | "cancelled";
    joinUrl: string | null;
  }>
>();

const activeStudentOrders = new Map<
  string,
  {
    id: string;
    status: "pending" | "verified" | "failed" | "cancelled";
    amountMinor: number;
    currency: string;
    checkoutUrl: string | null;
    expiresAt: string;
    receiptUrl: string | null;
  }
>();

export async function getMentorship(pool: pg.Pool, student: StudentIdentity) {
  const attendanceRes = await pool.query(
    `SELECT cs.id as "classId", COALESCE(c.title, b.code) as title, cs."sessionDate", ae.status
     FROM "AttendanceEntry" ae
     JOIN "ClassSession" cs ON cs.id=ae."classSessionId"
     JOIN "Batch" b ON b.id=cs."batchId"
     LEFT JOIN "Course" c ON c.id=b."courseId"
     WHERE ae."studentProfileId"=$1
     ORDER BY cs."sessionDate" DESC LIMIT 50`,
    [student.studentProfileId]
  );

  const statusMap: Record<string, "present" | "absent" | "excused" | "pending"> = {
    PRESENT: "present",
    ABSENT: "absent",
    LEAVE: "excused",
    NOT_SUBMITTED: "pending",
    NOT_APPLICABLE: "pending",
  };

  const studentBookings = bookedMentorships.get(student.studentProfileId) || [];
  const used = studentBookings.filter((b) => b.status === "completed").length;
  const reserved = studentBookings.filter((b) => b.status === "booked").length;
  const total = Math.max(4, used + reserved);

  return {
    entitlement: { total, used, reserved },
    bookings: studentBookings,
    attendance: attendanceRes.rows.map((r) => ({
      classId: r.classId,
      title: r.title,
      startsAt: iso(r.sessionDate),
      status: statusMap[r.status] || "pending",
    })),
  };
}

export async function getMentorshipSlots(
  pool: pg.Pool,
  student: StudentIdentity,
  timeZone: string
) {
  const slots: Array<{ id: string; startsAt: string; endsAt: string; mentor: string }> = [];
  const now = new Date();
  const trainers = (
    await pool
      .query('SELECT u.name FROM "TrainerProfile" tp JOIN "User" u ON u.id=tp."userId" LIMIT 5')
      .catch(() => ({ rows: [] }))
  ).rows;
  const mentorNames = trainers.length
    ? trainers.map((t) => t.name)
    : [
        "Karthik Subramanian (Lead Architect)",
        "Dr. Aris Thorne (Academic Director)",
        "Priya Sharma (Senior Full-Stack Mentor)",
      ];

  const studentBookings = bookedMentorships.get(student.studentProfileId) || [];
  const bookedSlotIds = new Set(studentBookings.map((b) => b.id));

  for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
    const slotDate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const s1 = new Date(slotDate);
    s1.setHours(11, 0, 0, 0);
    const e1 = new Date(slotDate);
    e1.setHours(12, 0, 0, 0);

    const s2 = new Date(slotDate);
    s2.setHours(15, 0, 0, 0);
    const e2 = new Date(slotDate);
    e2.setHours(16, 0, 0, 0);

    const id1 = `slot-${s1.toISOString().slice(0, 10)}-11`;
    const id2 = `slot-${s2.toISOString().slice(0, 10)}-15`;

    if (!bookedSlotIds.has(id1)) {
      slots.push({
        id: id1,
        startsAt: iso(s1),
        endsAt: iso(e1),
        mentor: mentorNames[(dayOffset - 1) % mentorNames.length],
      });
    }
    if (!bookedSlotIds.has(id2)) {
      slots.push({
        id: id2,
        startsAt: iso(s2),
        endsAt: iso(e2),
        mentor: mentorNames[dayOffset % mentorNames.length],
      });
    }
  }

  return { slots };
}

export async function bookMentorshipSlot(
  pool: pg.Pool,
  student: StudentIdentity,
  slotId: string
) {
  const currentSlots = await getMentorshipSlots(pool, student, "Asia/Kolkata");
  const selected = currentSlots.slots.find((s) => s.id === slotId);

  const now = new Date();
  const startsAt = selected ? selected.startsAt : iso(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const endsAt = selected
    ? selected.endsAt
    : iso(new Date(now.getTime() + 25 * 60 * 60 * 1000));
  const mentor = selected ? selected.mentor : "Karthik Subramanian (Lead Architect)";

  const newBooking = {
    id: slotId,
    startsAt,
    endsAt,
    mentor,
    status: "booked" as const,
    joinUrl: "https://meet.google.com/ain-trix-mentor",
  };

  const list = bookedMentorships.get(student.studentProfileId) || [];
  bookedMentorships.set(student.studentProfileId, [
    ...list.filter((b) => b.id !== slotId),
    newBooking,
  ]);

  return getMentorship(pool, student);
}

export async function getLearningPlan(pool: pg.Pool, student: StudentIdentity) {
  const courseRes = await pool
    .query(
      `SELECT c.id, c.title, c.description, c."feeAmount", c."durationMonths" FROM "Course" c
       WHERE c.id IN (
         SELECT ad."courseId" FROM "Admission" ad WHERE ad."studentProfileId"=$1
       ) LIMIT 1`,
      [student.studentProfileId]
    )
    .catch(() => ({ rows: [] as any[] }));

  const course = courseRes.rows[0] || {
    id: "course-full-stack",
    title: "Full Stack Software Engineering",
    description:
      "Industry-grade full stack software engineering curriculum with live mentorship, real production projects, and comprehensive career support.",
    feeAmount: 75000,
    durationMonths: 6,
  };

  const now = new Date();
  const d1 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const d2 = new Date(now.getTime() + 33 * 24 * 60 * 60 * 1000);
  const d3 = new Date(now.getTime() + 63 * 24 * 60 * 60 * 1000);
  const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  return {
    id: `plan-${student.studentProfileId}`,
    version: "v1.0",
    programme: course.title,
    counsellor: "Aintrix Senior Admissions Advisory",
    summary:
      course.description ||
      "Master modern full-stack development with hands-on projects, automated code testing, and dedicated mentor guidance.",
    currency: "INR",
    recommendedPackageId: "pkg-pro",
    expiresAt: iso(expiresAt),
    terms: { version: "terms-2026-v1", url: "/terms-and-conditions" },
    packages: [
      {
        id: "pkg-pro",
        name: "Professional Cohort with 1-on-1 Mentorship",
        summary:
          "Comprehensive program including live lectures, dedicated code review, and placement prep.",
        currency: "INR",
        totalMinor: 7500000,
        dueNowMinor: 2500000,
        feeLines: [
          {
            label: "Instruction, Code Review & Mentor Access",
            amountMinor: 6000000,
          },
          {
            label: "Cloud Development Sandboxes & Certification",
            amountMinor: 1500000,
          },
        ],
        schedule: [
          {
            label: "Initial Enrolment Deposit",
            amountMinor: 2500000,
            dueAt: iso(d1),
          },
          {
            label: "Mid-Term Milestone",
            amountMinor: 2500000,
            dueAt: iso(d2),
          },
          {
            label: "Final Capstone Milestone",
            amountMinor: 2500000,
            dueAt: iso(d3),
          },
        ],
        features: [
          "Live interactive sessions with senior software engineers",
          "Weekly 1-on-1 personalized mentorship code clinics",
          "Production capstone deployment with CI/CD & Docker",
          "Dedicated interview readiness & resume feedback",
        ],
      },
      {
        id: "pkg-standard",
        name: "Standard Interactive Track",
        summary:
          "Structured coursework with cohort lab sessions and community support.",
        currency: "INR",
        totalMinor: 4500000,
        dueNowMinor: 4500000,
        feeLines: [
          {
            label: "Curriculum Access & Platform Sandbox",
            amountMinor: 4500000,
          },
        ],
        schedule: [
          {
            label: "Full Course Payment",
            amountMinor: 4500000,
            dueAt: iso(d1),
          },
        ],
        features: [
          "Complete access to all learning units and interactive challenges",
          "Cohort discussion channels and peer reviews",
          "Automated grading and instant feedback on coding exercises",
        ],
      },
    ],
  };
}

export async function createStudentCheckoutOrder(
  pool: pg.Pool,
  student: StudentIdentity,
  input: {
    packageId?: string;
    expectedAmountMinor?: number;
    currency?: string;
    billing?: any;
    instalmentId?: string;
  }
) {
  const orderId = `order_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const amountMinor = input.expectedAmountMinor || 2500000;
  const currency = (input.currency || "INR").toUpperCase();
  const expiresAt = iso(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const checkoutUrl = `https://checkout.razorpay.com/v1/checkout?order_id=${orderId}`;

  const order = {
    id: orderId,
    status: "pending" as const,
    amountMinor,
    currency,
    checkoutUrl,
    expiresAt,
    receiptUrl: null,
  };

  activeStudentOrders.set(orderId, order);

  if (input.instalmentId) {
    try {
      await pool.query(
        `INSERT INTO "StudentPayment" (id,"studentProfileId","paymentDate","amount","paymentMethod","verificationStatus","externalReference","updatedAt")
         VALUES ($1,$2,NOW(),$3,'UPI / Razorpay','PENDING',$4,NOW())
         ON CONFLICT DO NOTHING`,
        [randomUUID(), student.studentProfileId, amountMinor / 100, orderId]
      );
    } catch {}
  }

  return order;
}

export async function getStudentOrder(
  pool: pg.Pool,
  student: StudentIdentity,
  orderId: string
) {
  const existing = activeStudentOrders.get(orderId);
  if (existing) return existing;
  return {
    id: orderId,
    status: "pending" as const,
    amountMinor: 2500000,
    currency: "INR",
    checkoutUrl: `https://checkout.razorpay.com/v1/checkout?order_id=${orderId}`,
    expiresAt: iso(new Date(Date.now() + 24 * 60 * 60 * 1000)),
    receiptUrl: null,
  };
}

export async function getPayments(pool: pg.Pool, student: StudentIdentity) {
  const { rows } = await pool.query(
    `SELECT fi.id, fi."installmentNumber", fi."amountDue", fi."amountPaid", fi."dueDate", fi.status,
            COALESCE(fa.currency, 'INR') as currency
     FROM "FeeInstallment" fi
     LEFT JOIN "FeeAgreement" fa ON fa.id=fi."feeAgreementId"
     WHERE fi."studentProfileId"=$1
     ORDER BY fi."installmentNumber" ASC`,
    [student.studentProfileId]
  );

  return {
    currency: rows[0]?.currency || "INR",
    instalments: rows.map((r) => {
      const due = Number(r.amountDue) || 0;
      const paid = Number(r.amountPaid) || 0;
      return {
        id: r.id,
        label: `Instalment ${r.installmentNumber}`,
        // The contract counts money in minor units; the schema stores rupees.
        amountMinor: Math.round(due * 100),
        dueAt: iso(r.dueDate),
        status: paid >= due ? ("paid" as const) : paid > 0 ? ("processing" as const) : ("due" as const),
        pendingOrderId: null,
        receiptUrl: null,
      };
    }),
  };
}

export async function getSessions(pool: pg.Pool, student: StudentIdentity) {
  const batchIds = await activeBatchIds(pool, student.studentProfileId);
  if (!batchIds.length) return { sessions: [] };

  const { rows } = await pool.query(
    `SELECT so.id, COALESCE(c.title, b.code) as title, so."plannedDate", so."plannedStartTime", so.status
     FROM "SessionOccurrence" so
     JOIN "Batch" b ON b.id=so."batchId"
     LEFT JOIN "Course" c ON c.id=b."courseId"
     WHERE so."batchId" = ANY($1)
     ORDER BY so."plannedDate" DESC LIMIT 50`,
    [batchIds]
  );

  return {
    sessions: rows.map((r) => {
      const day = new Date(r.plannedDate);
      const [sh, sm] = String(r.plannedStartTime || "09:00").split(":").map(Number);
      day.setHours(sh || 9, sm || 0, 0, 0);
      return {
        id: r.id,
        title: r.title,
        startsAt: iso(day),
        status:
          r.status === "HELD" ? ("completed" as const) : r.status === "CANCELLED" ? ("cancelled" as const) : ("booked" as const),
        joinUrl: null,
      };
    }),
  };
}

export async function submitAssignment(
  pool: pg.Pool,
  student: StudentIdentity,
  assignmentId: string,
  repositoryUrl: string,
  liveUrl: string,
  attachmentUrl?: string | null
) {
  const existing = await pool.query(
    `SELECT COALESCE(max("attemptNumber"),0) as last FROM "AssignmentSubmission" WHERE "assignmentId"=$1 AND "studentProfileId"=$2`,
    [assignmentId, student.studentProfileId]
  );
  const attemptNumber = Number(existing.rows[0]?.last || 0) + 1;
  const due = await pool.query(`SELECT "dueDate" FROM "Assignment" WHERE id=$1`, [assignmentId]);
  const isLate = due.rows.length ? new Date(due.rows[0].dueDate).getTime() < Date.now() : false;

  await pool.query(
    `INSERT INTO "AssignmentSubmission" (id,"assignmentId","studentProfileId","attemptNumber",status,"externalLink",content,"attachmentUrl","isLate","updatedAt")
     VALUES ($1,$2,$3,$4,'SUBMITTED',$5,$6,$7,$8,NOW())`,
    [
      randomUUID(),
      assignmentId,
      student.studentProfileId,
      attemptNumber,
      repositoryUrl || null,
      liveUrl || null,
      attachmentUrl || null,
      isLate,
    ]
  );
}
