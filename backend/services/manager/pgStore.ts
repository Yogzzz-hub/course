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

export async function ensureManagerSeeded(pool: pg.Pool): Promise<void> {
  const { rows } = await pool.query('SELECT count(*) FROM "Lead"');
  if (parseInt(rows[0].count, 10) > 0) return;
  await seedManagerData(pool);
}

async function seedManagerData(pool: pg.Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const counsellorSeeds = [
      { name: "Ananya Deshmukh", email: "ananya.d@aintrixacademy.edu", phone: "+91 99000 11223" },
      { name: "Rohan Sen", email: "rohan.s@aintrixacademy.edu", phone: "+91 99000 22334" },
      { name: "Kavita Rao", email: "kavita.r@aintrixacademy.edu", phone: "+91 99000 33445" },
    ];
    const counsellors: { userId: string; profileId: string }[] = [];
    for (const c of counsellorSeeds) {
      const existingUser = await client.query('SELECT id FROM "User" WHERE email=$1', [c.email]);
      let userId: string;
      if (existingUser.rows.length) {
        userId = existingUser.rows[0].id;
      } else {
        userId = randomUUID();
        await client.query(
          `INSERT INTO "User" (id,email,phone,"passwordHash",name,role,"isActive","mustChangePassword","updatedAt")
           VALUES ($1,$2,$3,'seed_not_for_login',$4,'MANAGER',true,false,NOW())`,
          [userId, c.email, c.phone, c.name]
        );
      }
      const existingProfile = await client.query('SELECT id FROM "ManagerProfile" WHERE "userId"=$1', [userId]);
      let profileId: string;
      if (existingProfile.rows.length) {
        profileId = existingProfile.rows[0].id;
      } else {
        profileId = randomUUID();
        await client.query(
          `INSERT INTO "ManagerProfile" (id,"userId",department,"updatedAt") VALUES ($1,$2,'Admissions',NOW())`,
          [profileId, userId]
        );
      }
      counsellors.push({ userId, profileId });
    }

    const courses = (await client.query('SELECT id FROM "Course" ORDER BY "createdAt" LIMIT 10')).rows;
    const batches = (await client.query('SELECT id FROM "Batch" ORDER BY "createdAt" LIMIT 10')).rows;

    const leadSeeds = [
      { name: "Rahul Sharma", email: "rahul.s@example.com", phone: "+91 98765 43210", status: "NEW", source: "Website Form", notes: ["Interested in weekend cohort", "Background in MCA"] },
      { name: "Priya Nair", email: "priya.nair@example.com", phone: "+91 98765 12345", status: "COUNSELLING_SCHEDULED", source: "Google Search", notes: ["Demo session scheduled for 12 Nov 4 PM"] },
      { name: "Anand Verma", email: "anand.v@example.com", phone: "+91 91234 56789", status: "APPLIED", source: "LinkedIn Referral", notes: ["Early-bird scholarship applied (15%)"] },
      { name: "Divya Krishnan", email: "divya.k@example.com", phone: "+91 98451 22334", status: "ADMITTED", source: "Direct Booking", notes: ["Seat confirmed"] },
      { name: "Saurabh Mishra", email: "saurabh.m@example.com", phone: "+91 99887 76655", status: "LOST", source: "Instagram Campaign", notes: ["Fee structure beyond current budget; followup in Q1"] },
    ];
    for (let i = 0; i < leadSeeds.length; i++) {
      const l = leadSeeds[i];
      const leadId = randomUUID();
      const courseId = courses.length ? courses[i % courses.length].id : null;
      const counsellor = counsellors[i % counsellors.length];
      await client.query(
        `INSERT INTO "Lead" (id,"fullName",phone,email,"courseInterestId",status,source,"assignedManagerId","isLost","lostReason","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6::"LeadStatus",$7,$8,$9,$10,NOW())
         ON CONFLICT (id) DO NOTHING`,
        [leadId, l.name, l.phone, l.email, courseId, l.status, l.source, counsellor.profileId, l.status === "LOST", l.status === "LOST" ? l.notes[l.notes.length - 1] : null]
      );
      for (const note of l.notes) {
        await client.query(
          `INSERT INTO "LeadActivity" (id,"leadId","actionType",notes,"createdBy") VALUES ($1,$2,'NOTE',$3,$4)`,
          [randomUUID(), leadId, note, counsellor.userId]
        );
      }
    }

    const annSeeds = [
      { title: "Mid-Term Evaluation Schedule Released", body: "Mid-term coding assessments for all active cohorts will commence on 25 Nov 2026. Hall tickets and slot allocations are visible in student portals.", author: "Operations Manager", audience: "All Active Batches", priority: "URGENT" },
      { title: "Guest Masterclass: Microservices & Event Architecture", body: "Join us this Saturday at 5 PM IST for an industry session with a Principal Engineer from AWS on scalable Kafka event streams.", author: "Academic Coordinator", audience: "Python & DSA Batches", priority: "NORMAL" },
    ];
    for (const a of annSeeds) {
      await client.query(
        `INSERT INTO "Announcement" (id,title,body,"authorName",audience,priority,panel) VALUES ($1,$2,$3,$4,$5,$6,'MANAGER')`,
        [randomUUID(), a.title, a.body, a.author, a.audience, a.priority]
      );
    }

    const students = (
      await client.query(
        `SELECT sp.id as "studentProfileId" FROM "StudentProfile" sp ORDER BY sp."createdAt" LIMIT 10`
      )
    ).rows;
    const alertSeeds = [
      { pct: 62.5, missed: 6, risk: "CRITICAL", warned: false },
      { pct: 68.0, missed: 4, risk: "HIGH", warned: true },
      { pct: 70.8, missed: 3, risk: "MEDIUM", warned: false },
      { pct: 72.0, missed: 3, risk: "MEDIUM", warned: false },
    ];
    for (let i = 0; i < alertSeeds.length && i < students.length && batches.length; i++) {
      const s = students[i];
      const batch = batches[i % batches.length];
      const a = alertSeeds[i];
      await client.query(
        `INSERT INTO "AcademicAlert" (id,"studentProfileId","batchId","alertType",severity,"evidenceJson","updatedAt")
         VALUES ($1,$2,$3,'LOW_ATTENDANCE',$4,$5,NOW())`,
        [
          randomUUID(),
          s.studentProfileId,
          batch.id,
          a.risk,
          JSON.stringify({ attendancePercentage: a.pct, missedSessions: a.missed, lastAttended: new Date().toISOString(), warningSent: a.warned }),
        ]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[Manager pgStore] seed failed:", err);
    throw err;
  } finally {
    client.release();
  }
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

export async function getManagerScheduledClasses(pool: pg.Pool) {
  const { rows } = await pool.query(`
    SELECT so.id, so."plannedDate", so."plannedStartTime", so."plannedEndTime", so.status, so.location,
           b.code as "batchCode", c.name as "batchName", u.name as "facultyName"
    FROM "SessionOccurrence" so
    JOIN "Batch" b ON b.id = so."batchId"
    JOIN "Course" c ON c.id = b."courseId"
    LEFT JOIN "TrainerProfile" tp ON tp.id = so."trainerProfileId"
    LEFT JOIN "User" u ON u.id = tp."userId"
    ORDER BY so."plannedDate" DESC, so."plannedStartTime" ASC
  `);
  return rows.map((r) => {
    let topic = "";
    let roomLink = "";
    if (r.location) {
      try {
        const parsed = JSON.parse(r.location);
        topic = parsed.topic || "";
        roomLink = parsed.roomLink || "";
      } catch {
        topic = r.location;
      }
    }
    const plannedDateStr = r.plannedDate instanceof Date ? r.plannedDate.toISOString().slice(0, 10) : String(r.plannedDate || "").slice(0, 10);
    return {
      id: r.id,
      batchCode: r.batchCode,
      batchName: r.batchName,
      topic: topic || `${r.batchName} Session`,
      date: fmtDate(r.plannedDate),
      dateIso: plannedDateStr,
      time: `${r.plannedStartTime} - ${r.plannedEndTime}`,
      startTime: r.plannedStartTime,
      endTime: r.plannedEndTime,
      facultyName: r.facultyName || "Faculty Lead",
      roomLink: roomLink,
      status: r.status === "HELD" ? "COMPLETED" : "UPCOMING",
    };
  });
}

export async function createManagerScheduledClass(
  pool: pg.Pool,
  data: {
    batchCode: string;
    topic: string;
    dateIso: string;
    startTime: string;
    endTime: string;
    roomLink?: string;
  }
) {
  const batchRes = await pool.query('SELECT id, "courseId" FROM "Batch" WHERE code=$1 LIMIT 1', [data.batchCode]);
  if (!batchRes.rows.length) throw new Error(`Batch not found for code ${data.batchCode}`);
  const batchId = batchRes.rows[0].id;

  const allocRes = await pool.query(
    'SELECT "trainerProfileId" FROM "TrainerBatchAllocation" WHERE "batchId"=$1 ORDER BY "isPrimary" DESC LIMIT 1',
    [batchId]
  );
  let trainerProfileId: string;
  if (allocRes.rows.length) {
    trainerProfileId = allocRes.rows[0].trainerProfileId;
  } else {
    const firstTrainer = await pool.query('SELECT id FROM "TrainerProfile" ORDER BY "createdAt" ASC LIMIT 1');
    if (!firstTrainer.rows.length) throw new Error("No trainer profiles found.");
    trainerProfileId = firstTrainer.rows[0].id;
  }

  const id = `so-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const location = JSON.stringify({ topic: data.topic, roomLink: data.roomLink || "" });
  const plannedDate = new Date(`${data.dateIso}T00:00:00.000Z`);

  await pool.query(
    `INSERT INTO "SessionOccurrence" (id, "batchId", "trainerProfileId", "plannedDate", "plannedStartTime", "plannedEndTime", status, location, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, 'SCHEDULED', $7, NOW(), NOW())`,
    [id, batchId, trainerProfileId, plannedDate, data.startTime, data.endTime, location]
  );

  return {
    id,
    batchCode: data.batchCode,
    topic: data.topic,
    dateIso: data.dateIso,
    date: fmtDate(plannedDate),
    startTime: data.startTime,
    endTime: data.endTime,
    time: `${data.startTime} - ${data.endTime}`,
    roomLink: data.roomLink || "",
    status: "UPCOMING",
  };
}

export async function deleteManagerScheduledClass(pool: pg.Pool, id: string) {
  await pool.query('DELETE FROM "SessionOccurrence" WHERE id=$1', [id]);
}

export async function createLeadRecord(
  pool: pg.Pool,
  data: {
    fullName: string;
    phone?: string;
    email: string;
    courseTrack?: string;
    source?: string;
    schedulePreference?: string;
  }
) {
  const id = `lead-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  
  let courseId: string | null = null;
  if (data.courseTrack) {
    const cRes = await pool.query('SELECT id FROM "Course" WHERE lower(name) LIKE lower($1) OR lower(category) LIKE lower($1) LIMIT 1', [`%${data.courseTrack}%`]);
    if (cRes.rows.length) courseId = cRes.rows[0].id;
  }
  if (!courseId) {
    const firstC = await pool.query('SELECT id FROM "Course" ORDER BY "createdAt" ASC LIMIT 1');
    courseId = firstC.rows.length ? firstC.rows[0].id : null;
  }

  const mRes = await pool.query('SELECT id FROM "ManagerProfile" ORDER BY "createdAt" ASC LIMIT 1');
  const assignedManagerId = mRes.rows.length ? mRes.rows[0].id : null;

  const schedulePref = data.schedulePreference === "WEEKENDS" ? "WEEKENDS" : "WEEKDAYS";

  await pool.query(
    `INSERT INTO "Lead" (id, "fullName", phone, email, "courseInterestId", "schedulePreference", status, source, "consentGiven", "isLost", "assignedManagerId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6::"ScheduleType", 'NEW', $7, true, false, $8, NOW(), NOW())`,
    [id, data.fullName, data.phone || "—", data.email, courseId, schedulePref, data.source || "WEBSITE_CONTACT", assignedManagerId]
  );

  return {
    id,
    name: data.fullName,
    phone: data.phone || "—",
    email: data.email,
    track: data.courseTrack || "Python Full-Stack",
    date: fmtDate(new Date()),
    status: "New Lead",
    score: 55,
    assignedCounsellor: "Admissions Team",
    source: data.source || "WEBSITE_CONTACT",
    notes: [],
  };
}
