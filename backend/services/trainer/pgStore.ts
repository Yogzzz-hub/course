import pg from "pg";
import { randomUUID } from "node:crypto";

let pgPoolInstance: pg.Pool | null = null;

export function getTrainerPool(): pg.Pool {
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

function timeProgress(start: Date, end: Date, status: string): number {
  if (status === "TEACHING_COMPLETE" || status === "CLOSED" || status === "ARCHIVED") return 100;
  if (status === "DRAFT" || status === "UPCOMING") return 0;
  const now = Date.now();
  const span = end.getTime() - start.getTime();
  if (span <= 0) return 0;
  const pct = Math.round((100 * (now - start.getTime())) / span);
  return Math.max(0, Math.min(100, pct));
}

async function getPrimaryTrainerProfileId(pool: pg.Pool): Promise<string | null> {
  const { rows } = await pool.query('SELECT id FROM "TrainerProfile" ORDER BY "createdAt" ASC LIMIT 1');
  return rows.length ? rows[0].id : null;
}

export async function ensureTrainerSeeded(pool: pg.Pool, trainerProfileId: string): Promise<void> {
  const { rows } = await pool.query('SELECT count(*) FROM "Announcement" WHERE panel=\'TRAINER\'');
  if (parseInt(rows[0].count, 10) > 0) return;
  await seedTrainerData(pool, trainerProfileId);
}

async function seedTrainerData(pool: pg.Pool, trainerProfileId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const batches = (
      await client.query(
        `SELECT b.id, b.code FROM "Batch" b
         JOIN "TrainerBatchAllocation" tba ON tba."batchId"=b.id
         WHERE tba."trainerProfileId"=$1`,
        [trainerProfileId]
      )
    ).rows;

    if (batches.length === 0) {
      const anyBatches = (await client.query('SELECT id, code FROM "Batch" ORDER BY "createdAt" LIMIT 3')).rows;
      for (const b of anyBatches) {
        await client.query(
          `INSERT INTO "TrainerBatchAllocation" (id,"batchId","trainerProfileId","isPrimary") VALUES ($1,$2,$3,true)
           ON CONFLICT DO NOTHING`,
          [randomUUID(), b.id, trainerProfileId]
        );
        batches.push(b);
      }
    }

    const doubtSeeds = [
      { topic: "ORM select_related vs prefetch_related N+1 queries", urgency: "HIGH", status: "WAITING" },
      { topic: "Race conditions in useEffect cleanup with AbortController", urgency: "MEDIUM", status: "WAITING" },
      { topic: "Dynamic Programming memoization vs tabulation", urgency: "HIGH", status: "SCHEDULED" },
    ];
    const students = (
      await client.query(
        `SELECT sp.id as "studentProfileId", u.name
         FROM "StudentProfile" sp JOIN "User" u ON u.id=sp."userId" ORDER BY sp."createdAt" LIMIT 10`
      )
    ).rows;
    for (let i = 0; i < doubtSeeds.length && batches.length; i++) {
      const d = doubtSeeds[i];
      const student = students[i % Math.max(students.length, 1)];
      const batch = batches[i % batches.length];
      await client.query(
        `INSERT INTO "DoubtThread" (id,"batchId","studentProfileId","studentName","trainerProfileId",topic,urgency,status,"meetingTime")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          randomUUID(),
          batch.id,
          student ? student.studentProfileId : null,
          student ? student.name : "Student",
          trainerProfileId,
          d.topic,
          d.urgency,
          d.status,
          d.status === "SCHEDULED" ? "Today, 4:30 PM" : null,
        ]
      );
    }

    const annSeeds = [
      { title: "Docker Compose Practice Repositories Uploaded", body: "Please clone the multi-container compose repo before today's session." },
      { title: "TanStack Query v5 Code Sandbox Links", body: "Sandbox examples for query cancellation and retry strategies are now in student LMS units." },
    ];
    for (let i = 0; i < annSeeds.length && batches.length; i++) {
      const a = annSeeds[i];
      const batch = batches[i % batches.length];
      await client.query(
        `INSERT INTO "Announcement" (id,title,body,"authorName",audience,priority,panel,"batchId")
         VALUES ($1,$2,$3,'Trainer',$4,'NORMAL','TRAINER',$5)`,
        [randomUUID(), a.title, a.body, batch.code, batch.id]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[Trainer pgStore] seed failed:", err);
    throw err;
  } finally {
    client.release();
  }
}

export async function getTrainerSnapshot(pool: pg.Pool, explicitTrainerProfileId?: string | null) {
  const trainerProfileId = explicitTrainerProfileId || (await getPrimaryTrainerProfileId(pool));
  if (!trainerProfileId) {
    return {
      stats: { todayClasses: 0, totalStudents: 0, pendingReviews: 0, openDoubts: 0, nextClassTime: "", nextClassTitle: "", nextClassBatch: "", nextClassStudents: 0 },
      batches: [],
      schedule: [],
      rosterMap: {},
      assignments: [],
      doubts: [],
      announcements: [],
    };
  }
  await ensureTrainerSeeded(pool, trainerProfileId);

  const [batchRes, scheduleRes, submissionsRes, doubtsRes, annRes] = await Promise.all([
    pool.query(
      `SELECT b.id, b.code, c.title as track, b."classDays", b."startTime", b."endTime", b."startDate", b."expectedEndDate", b.status,
              (SELECT count(*) FROM "StudentBatchEnrollment" e WHERE e."batchId"=b.id AND e.status='ACTIVE') as "studentsCount"
       FROM "Batch" b
       JOIN "TrainerBatchAllocation" tba ON tba."batchId"=b.id
       LEFT JOIN "Course" c ON c.id=b."courseId"
       WHERE tba."trainerProfileId"=$1`,
      [trainerProfileId]
    ),
    pool.query(
      `SELECT so.id, b.code as "batchCode", c.title as "batchName", so."plannedDate", so."plannedStartTime", so."plannedEndTime", so.status
       FROM "SessionOccurrence" so
       JOIN "Batch" b ON b.id=so."batchId"
       LEFT JOIN "Course" c ON c.id=b."courseId"
       WHERE so."trainerProfileId"=$1
       ORDER BY so."plannedDate" ASC LIMIT 20`,
      [trainerProfileId]
    ),
    pool.query(
      `SELECT asub.id, u.name as "studentName", u.email as "studentEmail", b.code as "batchCode",
              a.title as "assignmentTitle", asub."submittedAt", asub."attachmentUrl", asub."externalLink",
              ag."marksAwarded", ag."maxMarks", ag.feedback
       FROM "AssignmentSubmission" asub
       JOIN "Assignment" a ON a.id=asub."assignmentId"
       JOIN "StudentProfile" sp ON sp.id=asub."studentProfileId"
       JOIN "User" u ON u.id=sp."userId"
       LEFT JOIN "Batch" b ON b.id=a."batchId"
       LEFT JOIN "AssignmentGrade" ag ON ag."submissionId"=asub.id
       WHERE a."trainerProfileId"=$1
       ORDER BY asub."submittedAt" DESC LIMIT 100`,
      [trainerProfileId]
    ),
    pool.query(
      `SELECT dt.id, dt."studentName", b.code as "batchCode", dt.topic, dt.urgency, dt.status, dt."askedAt", dt."meetingTime"
       FROM "DoubtThread" dt JOIN "Batch" b ON b.id=dt."batchId"
       WHERE dt."trainerProfileId"=$1
       ORDER BY dt."askedAt" DESC LIMIT 50`,
      [trainerProfileId]
    ),
    pool.query(
      `SELECT ann.id, ann.title, ann.body, ann."createdAt", b.code as "batchCode"
       FROM "Announcement" ann LEFT JOIN "Batch" b ON b.id=ann."batchId"
       WHERE ann.panel='TRAINER' AND (ann."batchId" IS NULL OR ann."batchId" IN (
         SELECT "batchId" FROM "TrainerBatchAllocation" WHERE "trainerProfileId"=$1
       ))
       ORDER BY ann."createdAt" DESC LIMIT 50`,
      [trainerProfileId]
    ),
  ]);

  const batchCodes = batchRes.rows.map((r) => r.code);
  const rosterByBatch = await Promise.all(
    batchRes.rows.map((b) =>
      pool.query(
        `SELECT sp.id as "studentProfileId", u.name, u.email, sp."registrationNumber",
                (SELECT ae.status FROM "AttendanceEntry" ae
                   JOIN "ClassSession" cs ON cs.id=ae."classSessionId"
                   WHERE ae."studentProfileId"=sp.id AND cs."batchId"=$1
                   ORDER BY cs."sessionDate" DESC LIMIT 1) as "lastStatus",
                (SELECT round(100.0 * count(*) FILTER (WHERE ae.status='PRESENT') / NULLIF(count(*),0))
                   FROM "AttendanceEntry" ae JOIN "ClassSession" cs ON cs.id=ae."classSessionId"
                   WHERE ae."studentProfileId"=sp.id AND cs."batchId"=$1) as "attendanceRate"
         FROM "StudentBatchEnrollment" e
         JOIN "StudentProfile" sp ON sp.id=e."studentProfileId"
         JOIN "User" u ON u.id=sp."userId"
         WHERE e."batchId"=$1 AND e.status='ACTIVE'`,
        [b.id]
      )
    )
  );

  const batches = batchRes.rows.map((r, idx) => {
    const start = new Date(r.startDate);
    const end = new Date(r.expectedEndDate);
    const roster = rosterByBatch[idx].rows;
    return {
      id: r.id,
      name: r.track ? `${r.track} (${r.code})` : r.code,
      code: r.code,
      track: r.track || "",
      studentsCount: Number(r.studentsCount) || 0,
      progress: timeProgress(start, end, r.status),
      nextSession: "",
      module: r.track || "Current Module",
      schedule: `${r.classDays} (${r.startTime} - ${r.endTime})`,
      students: roster.map((s) => ({
        id: s.studentProfileId,
        name: s.name,
        email: s.email,
        attendanceRate: s.attendanceRate === null ? 0 : Number(s.attendanceRate),
        lastPresent: s.lastStatus === "PRESENT",
      })),
    };
  });

  const nextByBatch: Record<string, string> = {};
  for (const row of scheduleRes.rows) {
    if (!nextByBatch[row.batchCode]) {
      nextByBatch[row.batchCode] = `${fmtDate(row.plannedDate)}, ${row.plannedStartTime}`;
    }
  }
  for (const b of batches) b.nextSession = nextByBatch[b.code] || "";

  const schedule = scheduleRes.rows.map((r) => ({
    id: r.id,
    batchCode: r.batchCode,
    batchName: r.batchName || r.batchCode,
    topic: r.batchName ? `${r.batchName} session` : "Scheduled session",
    date: fmtDate(r.plannedDate),
    time: `${r.plannedStartTime} - ${r.plannedEndTime}`,
    duration: "",
    roomLink: "",
    status: r.status === "HELD" ? "COMPLETED" : r.status === "SCHEDULED" ? "UPCOMING" : "UPCOMING",
  }));

  const rosterMap: Record<string, any[]> = {};
  batchRes.rows.forEach((b, idx) => {
    rosterMap[b.code] = rosterByBatch[idx].rows.map((s) => ({
      studentId: s.studentProfileId,
      name: s.name,
      rollNo: s.registrationNumber,
      status: s.lastStatus === "ABSENT" ? "ABSENT" : s.lastStatus === "LEAVE" ? "LATE" : "PRESENT",
    }));
  });

  const assignments = submissionsRes.rows.map((r) => {
    const graded = r.marksAwarded !== null && r.marksAwarded !== undefined;
    return {
      id: r.id,
      studentName: r.studentName,
      studentEmail: r.studentEmail,
      batchCode: r.batchCode || "",
      assignmentTitle: r.assignmentTitle,
      submittedAt: fmtDate(r.submittedAt),
      status: graded ? "GRADED" : "PENDING_REVIEW",
      fileUrl: r.attachmentUrl || r.externalLink || undefined,
      score: graded ? Number(r.marksAwarded) : undefined,
      maxScore: graded ? Number(r.maxMarks) : 100,
      feedback: r.feedback || undefined,
    };
  });

  const doubts = doubtsRes.rows.map((r) => ({
    id: r.id,
    studentName: r.studentName,
    batchCode: r.batchCode,
    topic: r.topic,
    urgency: r.urgency,
    requestedAt: fmtDate(r.askedAt),
    status: r.status,
    meetingTime: r.meetingTime || undefined,
  }));

  const announcements = annRes.rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    batchCode: r.batchCode || "All Batches",
    createdAt: fmtDate(r.createdAt),
  }));

  const nextOccurrence = scheduleRes.rows[0];
  const stats = {
    todayClasses: scheduleRes.rows.filter((r) => fmtDate(r.plannedDate) === fmtDate(new Date())).length,
    totalStudents: batches.reduce((sum, b) => sum + b.studentsCount, 0),
    pendingReviews: assignments.filter((a) => a.status === "PENDING_REVIEW").length,
    openDoubts: doubts.filter((d) => d.status === "WAITING").length,
    nextClassTime: nextOccurrence ? `${fmtDate(nextOccurrence.plannedDate)}, ${nextOccurrence.plannedStartTime}` : "",
    nextClassTitle: nextOccurrence ? `${nextOccurrence.batchName} session` : "",
    nextClassBatch: nextOccurrence ? nextOccurrence.batchCode : "",
    nextClassStudents: nextOccurrence ? (batches.find((b) => b.code === nextOccurrence.batchCode)?.studentsCount ?? 0) : 0,
  };

  return { stats, batches, schedule, rosterMap, assignments, doubts, announcements, batchCodes };
}

export async function saveAttendanceRecords(
  pool: pg.Pool,
  trainerProfileId: string,
  batchCode: string,
  records: { studentId: string; status: "PRESENT" | "ABSENT" | "LATE" }[]
) {
  const { rows: batchRows } = await pool.query('SELECT id FROM "Batch" WHERE code=$1', [batchCode]);
  if (!batchRows.length) return;
  const batchId = batchRows[0].id;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const sessionId = randomUUID();
    const now = new Date();
    await client.query(
      `INSERT INTO "ClassSession" (id,"batchId","trainerProfileId","sessionDate","actualStartTime","actualEndTime","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      [sessionId, batchId, trainerProfileId, now, now.toTimeString().slice(0, 5), now.toTimeString().slice(0, 5)]
    );
    const statusMap: Record<string, string> = { PRESENT: "PRESENT", ABSENT: "ABSENT", LATE: "LEAVE" };
    for (const r of records) {
      await client.query(
        `INSERT INTO "AttendanceEntry" (id,"classSessionId","studentProfileId",status,"updatedAt")
         VALUES ($1,$2,$3,$4::"AttendanceStatus",NOW())`,
        [randomUUID(), sessionId, r.studentId, statusMap[r.status] || "PRESENT"]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function gradeSubmissionRecord(pool: pg.Pool, submissionId: string, score: number, feedback: string, gradedById: string) {
  const { rows } = await pool.query('SELECT "maxMarks" FROM "Assignment" a JOIN "AssignmentSubmission" s ON s."assignmentId"=a.id WHERE s.id=$1', [
    submissionId,
  ]);
  const maxMarks = rows.length ? Number(rows[0].maxMarks) : 100;
  await pool.query(
    `INSERT INTO "AssignmentGrade" (id,"submissionId","gradedById","marksAwarded","maxMarks",feedback)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [randomUUID(), submissionId, gradedById, score, maxMarks, feedback]
  );
}

export async function acceptDoubtRecord(pool: pg.Pool, id: string) {
  await pool.query(`UPDATE "DoubtThread" SET status='SCHEDULED', "meetingTime"='Today, 5:00 PM', "respondedAt"=NOW() WHERE id=$1`, [id]);
}

export async function createTrainerAnnouncementRecord(pool: pg.Pool, data: { title: string; body: string; batchCode: string }) {
  const { rows } = await pool.query('SELECT id FROM "Batch" WHERE code=$1', [data.batchCode]);
  const batchId = rows.length ? rows[0].id : null;
  const id = randomUUID();
  await pool.query(
    `INSERT INTO "Announcement" (id,title,body,"authorName",audience,priority,panel,"batchId")
     VALUES ($1,$2,$3,'Trainer','Batch',$4,'TRAINER',$5)`,
    [id, data.title, data.body, "NORMAL", batchId]
  );
  return { id, title: data.title, body: data.body, batchCode: data.batchCode, createdAt: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) };
}
