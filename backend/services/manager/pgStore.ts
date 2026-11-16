import pg from "pg";
import { randomUUID } from "node:crypto";

let pgPoolInstance: pg.Pool | null = null;

export function getManagerPool(): pg.Pool {
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

function fmtDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatINR(amount: number): string {
  return `₹ ${Math.round(amount).toLocaleString("en-IN")}`;
}

const LEAD_STATUS_TO_UI: Record<string, string> = {
  NEW: "New Lead",
  CONTACTED: "New Lead",
  COUNSELLING_SCHEDULED: "Counselling Scheduled",
  INTERESTED: "Counselling Scheduled",
  APPLIED: "Offer Extended",
  ADMITTED: "Admitted",
  LOST: "Lost",
};

const UI_TO_LEAD_STATUS: Record<string, string> = {
  "New Lead": "NEW",
  "Counselling Scheduled": "COUNSELLING_SCHEDULED",
  "Offer Extended": "APPLIED",
  Admitted: "ADMITTED",
  Lost: "LOST",
};

const LEAD_SCORE_BY_STATUS: Record<string, number> = {
  NEW: 55,
  CONTACTED: 60,
  COUNSELLING_SCHEDULED: 75,
  INTERESTED: 80,
  APPLIED: 90,
  ADMITTED: 98,
  LOST: 30,
};

function mapAdmissionStatus(status: string): "APPROVED" | "PENDING_VERIFICATION" | "DRAFT" {
  if (status === "DRAFT") return "DRAFT";
  if (status === "APPROVED" || status === "ACTIVE" || status === "GRADUATED") return "APPROVED";
  return "PENDING_VERIFICATION";
}

function mapBatchStatus(status: string): "ACTIVE" | "UPCOMING" | "COMPLETED" {
  if (status === "ACTIVE") return "ACTIVE";
  if (status === "DRAFT" || status === "UPCOMING") return "UPCOMING";
  return "COMPLETED";
}

function timeProgress(start: Date, end: Date, status: string): number {
  if (status === "TEACHING_COMPLETE" || status === "CLOSED" || status === "ARCHIVED") return 100;
  if (status === "DRAFT" || status === "UPCOMING") return 0;
  const now = Date.now();
  const span = end.getTime() - start.getTime();
  if (span <= 0) return 0;
  const pct = Math.round((100 * (now - start.getTime())) / span);
  return Math.max(0, Math.min(100, pct));
}

export async function ensureManagerSeeded(_pool: pg.Pool): Promise<void> {
  // Mock seeding removed. Real database schema and data are used.
}

export async function getManagerSnapshot(pool: pg.Pool) {
  await ensureManagerSeeded(pool);

  const [leadsRes, admissionsRes, batchesRes, alertsRes, counsellorsRes, feesRes, annRes, revenueRes] = await Promise.all([
    pool.query(`
      SELECT l.id, l."fullName" as name, l.email, l.phone, c.title as track, l."createdAt",
             l.status, l.source, u2.name as "counsellorName",
             (SELECT array_agg(la.notes ORDER BY la."createdAt") FROM "LeadActivity" la WHERE la."leadId"=l.id) as notes
      FROM "Lead" l
      LEFT JOIN "Course" c ON c.id=l."courseInterestId"
      LEFT JOIN "ManagerProfile" mp ON mp.id=l."assignedManagerId"
      LEFT JOIN "User" u2 ON u2.id=mp."userId"
      ORDER BY l."createdAt" DESC LIMIT 200
    `),
    pool.query(`
      SELECT ad.id, u.name as "studentName", u.email, u.phone, sp."registrationNumber",
             c.title as course, b.code as batch, ad.status, ad."createdAt", fa."isApproved" as "agreementSigned",
             fa.id as "feeAgreementId"
      FROM "Admission" ad
      LEFT JOIN "StudentProfile" sp ON sp.id=ad."studentProfileId"
      LEFT JOIN "User" u ON u.id=sp."userId"
      LEFT JOIN "Course" c ON c.id=ad."courseId"
      LEFT JOIN "Batch" b ON b.id=ad."targetBatchId"
      LEFT JOIN "FeeAgreement" fa ON fa."admissionId"=ad.id
      ORDER BY ad."createdAt" DESC LIMIT 200
    `),
    pool.query(`
      SELECT b.id, b.code, c.title as "courseTitle", b."startDate", b."expectedEndDate", b.status, b.capacity,
             (SELECT count(*) FROM "StudentBatchEnrollment" e WHERE e."batchId"=b.id AND e.status='ACTIVE') as "enrolledCount",
             (SELECT u2.name FROM "TrainerBatchAllocation" tba JOIN "TrainerProfile" tp ON tp.id=tba."trainerProfileId" JOIN "User" u2 ON u2.id=tp."userId" WHERE tba."batchId"=b.id AND tba."isPrimary" LIMIT 1) as "facultyName",
             (SELECT round(avg(CASE WHEN ae.status='PRESENT' THEN 100.0 ELSE 0 END)) FROM "AttendanceEntry" ae JOIN "ClassSession" cs ON cs.id=ae."classSessionId" WHERE cs."batchId"=b.id) as "attendanceAverage"
      FROM "Batch" b LEFT JOIN "Course" c ON c.id=b."courseId"
      ORDER BY b."createdAt" DESC LIMIT 100
    `),
    pool.query(`
      SELECT aa.id, aa.severity, aa."evidenceJson", sp.id as "studentProfileId", u.name as "studentName", u.email, u.phone,
             b.code as "batchCode", c.title as "batchName"
      FROM "AcademicAlert" aa
      JOIN "StudentProfile" sp ON sp.id=aa."studentProfileId"
      JOIN "User" u ON u.id=sp."userId"
      JOIN "Batch" b ON b.id=aa."batchId"
      LEFT JOIN "Course" c ON c.id=b."courseId"
      WHERE aa.status='OPEN'
      ORDER BY aa."createdAt" DESC LIMIT 100
    `),
    pool.query(`
      SELECT mp.id, u.name, u.email, u.phone, u."isActive",
             (SELECT count(*) FROM "Lead" l WHERE l."assignedManagerId"=mp.id AND l.status NOT IN ('ADMITTED','LOST')) as "activeLeadsCount",
             (SELECT count(*) FROM "Lead" l WHERE l."assignedManagerId"=mp.id AND l.status='ADMITTED') as "convertedCount"
      FROM "ManagerProfile" mp JOIN "User" u ON u.id=mp."userId" ORDER BY u.name
    `),
    pool.query(`
      SELECT fi.id, u.name as "studentName", c.title as course, fi."amountDue", fi."amountPaid", fi."dueDate", fi."lastPaymentDate", fi.status
      FROM "FeeInstallment" fi
      JOIN "StudentProfile" sp ON sp.id=fi."studentProfileId"
      JOIN "User" u ON u.id=sp."userId"
      LEFT JOIN "FeeAgreement" fa ON fa.id=fi."feeAgreementId"
      LEFT JOIN "Admission" ad ON ad.id=fa."admissionId"
      LEFT JOIN "Course" c ON c.id=ad."courseId"
      ORDER BY fi."dueDate" DESC LIMIT 100
    `),
    pool.query(`SELECT id,title,body,"authorName",audience,priority,"createdAt" FROM "Announcement" WHERE panel='MANAGER' ORDER BY "createdAt" DESC LIMIT 50`),
    pool.query(`SELECT COALESCE(sum(amount),0) as total FROM "StudentPayment" WHERE "verificationStatus"='VERIFIED'`),
  ]);

  const leads = leadsRes.rows.map((r) => {
    const uiStatus = LEAD_STATUS_TO_UI[r.status] || "New Lead";
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      track: r.track || "General Track",
      date: fmtDate(r.createdAt),
      status: uiStatus,
      assignedCounsellor: r.counsellorName || "Unassigned",
      notes: (r.notes as string[] | null) || [],
      source: r.source,
      score: LEAD_SCORE_BY_STATUS[r.status] ?? 50,
    };
  });

  const admissions = admissionsRes.rows.map((r) => ({
    id: r.id,
    studentName: r.studentName || "Unknown Student",
    email: r.email || "",
    phone: r.phone || "",
    registrationNumber: r.registrationNumber || "",
    course: r.course || "",
    batch: r.batch || "",
    feeStatus: r.agreementSigned ? "Full Payment Verified" : "Installment Due",
    agreementSigned: !!r.agreementSigned,
    enrolledDate: fmtDate(r.createdAt),
    status: mapAdmissionStatus(r.status),
  }));

  const cohorts = batchesRes.rows.map((r) => {
    const start = new Date(r.startDate);
    const end = new Date(r.expectedEndDate);
    return {
      id: r.id,
      name: r.courseTitle ? `${r.courseTitle} (${r.code})` : r.code,
      code: r.code,
      courseTitle: r.courseTitle || "",
      facultyName: r.facultyName || "Unassigned",
      enrolledCount: Number(r.enrolledCount) || 0,
      maxSeats: r.capacity,
      startDate: fmtDate(r.startDate),
      endDate: fmtDate(r.expectedEndDate),
      status: mapBatchStatus(r.status),
      attendanceAverage: Number(r.attendanceAverage) || 0,
      progress: timeProgress(start, end, r.status),
    };
  });

  const alerts = alertsRes.rows.map((r) => {
    const evidence = (() => {
      try {
        return JSON.parse(r.evidenceJson || "{}");
      } catch {
        return {};
      }
    })();
    return {
      id: r.id,
      studentId: r.studentProfileId,
      studentName: r.studentName,
      email: r.email,
      phone: r.phone,
      batchCode: r.batchCode,
      batchName: r.batchName || r.batchCode,
      attendancePercentage: evidence.attendancePercentage ?? 0,
      missedSessions: evidence.missedSessions ?? 0,
      lastAttended: evidence.lastAttended ? fmtDate(evidence.lastAttended) : "",
      riskLevel: (r.severity as string) || "MEDIUM",
      warningSent: !!evidence.warningSent,
    };
  });

  const payments = feesRes.rows.map((r) => {
    const amountDue = Number(r.amountDue) || 0;
    const amountPaid = Number(r.amountPaid) || 0;
    const overdue = amountPaid < amountDue && new Date(r.dueDate) < new Date();
    const status = amountPaid >= amountDue ? "PAID" : overdue ? "OVERDUE" : "PENDING";
    return {
      id: r.id,
      invoiceId: r.id,
      studentName: r.studentName,
      course: r.course || "",
      amount: formatINR(amountDue),
      dueDate: fmtDate(r.dueDate),
      paidDate: r.lastPaymentDate ? fmtDate(r.lastPaymentDate) : undefined,
      status,
      method: undefined,
    };
  });

  const counsellors = counsellorsRes.rows.map((r) => {
    const active = Number(r.activeLeadsCount) || 0;
    const converted = Number(r.convertedCount) || 0;
    const target = Math.max(10, Math.ceil(((converted + active) * 1.15) / 10) * 10);
    return {
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone || "",
      activeLeadsCount: active,
      convertedCount: converted,
      targetCount: target,
      conversionRate: target > 0 ? Math.round((converted / target) * 1000) / 10 : 0,
      status: r.isActive ? "ACTIVE" : "ON_LEAVE",
    };
  });

  const announcements = annRes.rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    author: r.authorName,
    audience: r.audience,
    createdAt: fmtDate(r.createdAt),
    priority: r.priority,
  }));

  const stats = {
    newEnquiries: leads.filter((l) => l.status === "New Lead").length,
    pendingFollowUps: leads.filter((l) => l.status !== "Admitted" && l.status !== "Lost").length,
    activeStudents: cohorts.reduce((sum, c) => sum + c.enrolledCount, 0),
    runningBatches: cohorts.filter((c) => c.status === "ACTIVE").length,
    attendanceAlertsCount: alerts.length,
    pendingAdmissionsCount: admissions.filter((a) => a.status === "PENDING_VERIFICATION").length,
    totalRevenue: formatINR(Number(revenueRes.rows[0].total) || 0),
  };

  const reports = await getManagerReports(pool);

  return { stats, leads, admissions, cohorts, alerts, payments, counsellors, announcements, reports };
}

export async function getManagerReports(pool: pg.Pool) {
  const [monthlyRes, trackRes] = await Promise.all([
    pool.query(`
      SELECT to_char(months.m, 'Mon') as month,
             (SELECT count(*) FROM "Lead" l WHERE date_trunc('month', l."createdAt")=months.m) as leads,
             (SELECT count(*) FROM "Admission" a WHERE date_trunc('month', a."createdAt")=months.m) as admissions
      FROM (
        SELECT date_trunc('month', NOW()) - (interval '1 month' * gs) as m
        FROM generate_series(0,4) as gs
      ) months
      ORDER BY months.m ASC
    `),
    pool.query(`
      SELECT c.category as track, count(ad.id) as admissions_count, COALESCE(sum(fa."totalAgreedFee"),0) as revenue
      FROM "Admission" ad
      JOIN "Course" c ON c.id=ad."courseId"
      LEFT JOIN "FeeAgreement" fa ON fa."admissionId"=ad.id
      GROUP BY c.category
      ORDER BY count(ad.id) DESC
    `),
  ]);

  const totalAdmissions = trackRes.rows.reduce((sum, r) => sum + Number(r.admissions_count), 0) || 1;

  return {
    monthlyAdmissions: monthlyRes.rows.map((r) => ({ month: r.month, leads: Number(r.leads), admissions: Number(r.admissions) })),
    trackBreakdown: trackRes.rows.map((r) => ({
      track: r.track || "General",
      share: Math.round((Number(r.admissions_count) / totalAdmissions) * 100),
      revenue: formatINR(Number(r.revenue)),
    })),
  };
}

export async function updateLeadRecord(pool: pg.Pool, id: string, patch: { status?: string; assignedCounsellor?: string }) {
  if (patch.status) {
    const dbStatus = UI_TO_LEAD_STATUS[patch.status];
    if (dbStatus) {
      await pool.query('UPDATE "Lead" SET status=$1::"LeadStatus", "isLost"=$2, "updatedAt"=NOW() WHERE id=$3', [
        dbStatus,
        dbStatus === "LOST",
        id,
      ]);
    }
  }
}

export async function updateAdmissionRecord(pool: pg.Pool, id: string, status: "APPROVED" | "PENDING_VERIFICATION" | "DRAFT") {
  const dbStatus = status === "PENDING_VERIFICATION" ? "PENDING_APPROVAL" : status;
  await pool.query('UPDATE "Admission" SET status=$1::"AdmissionStatus", "updatedAt"=NOW() WHERE id=$2', [dbStatus, id]);
}

export async function updateAlertRecord(pool: pg.Pool, id: string, patch: { warningSent?: boolean; resolved?: boolean }) {
  const { rows } = await pool.query('SELECT "evidenceJson" FROM "AcademicAlert" WHERE id=$1', [id]);
  if (!rows.length) return;
  let evidence: Record<string, unknown> = {};
  try {
    evidence = JSON.parse(rows[0].evidenceJson || "{}");
  } catch {
    evidence = {};
  }
  if (typeof patch.warningSent === "boolean") evidence.warningSent = patch.warningSent;
  if (patch.resolved) {
    await pool.query('UPDATE "AcademicAlert" SET status=\'RESOLVED\', "evidenceJson"=$1, "resolvedAt"=NOW(), "updatedAt"=NOW() WHERE id=$2', [
      JSON.stringify(evidence),
      id,
    ]);
  } else {
    await pool.query('UPDATE "AcademicAlert" SET "evidenceJson"=$1, "updatedAt"=NOW() WHERE id=$2', [JSON.stringify(evidence), id]);
  }
}

export async function createAnnouncementRecord(
  pool: pg.Pool,
  data: { title: string; body: string; author: string; audience: string; priority: string }
) {
  const id = randomUUID();
  await pool.query(
    `INSERT INTO "Announcement" (id,title,body,"authorName",audience,priority,panel) VALUES ($1,$2,$3,$4,$5,$6,'MANAGER')`,
    [id, data.title, data.body, data.author, data.audience, data.priority]
  );
  return { id, title: data.title, body: data.body, author: data.author, audience: data.audience, createdAt: fmtDate(new Date()), priority: data.priority };
}
