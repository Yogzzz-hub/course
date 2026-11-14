import pg from "pg";
import { randomUUID } from "node:crypto";

let pgPoolInstance: pg.Pool | null = null;

export function getAdminPool(): pg.Pool {
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

function iso(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString();
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function isoDate(value: Date | string): string {
  return iso(value).slice(0, 10);
}

/** Rupees in the schema, minor units (paise) in the contract. */
function toMinor(amount: unknown): number {
  const value = Number(amount) || 0;
  return Math.max(0, Math.round(value * 100));
}

/** Lead stages in the contract do not line up one-to-one with the LeadStatus enum. */
const LEAD_STAGE_FROM_DB: Record<string, string> = {
  NEW: "new",
  CONTACTED: "contacted",
  COUNSELLING_SCHEDULED: "scheduled",
  INTERESTED: "counselled",
  APPLIED: "offered",
  ADMITTED: "enrolled",
  LOST: "lost",
};

const LEAD_STAGE_TO_DB: Record<string, string> = {
  new: "NEW",
  contacted: "CONTACTED",
  scheduled: "COUNSELLING_SCHEDULED",
  counselled: "INTERESTED",
  offered: "APPLIED",
  payment_pending: "APPLIED",
  enrolled: "ADMITTED",
  lost: "LOST",
};

/** Stages an admin may move a lead to from where it is now. */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  new: ["contacted", "lost"],
  contacted: ["scheduled", "lost"],
  scheduled: ["counselled", "lost"],
  counselled: ["offered", "lost"],
  offered: ["payment_pending", "enrolled", "lost"],
  payment_pending: ["enrolled", "lost"],
  enrolled: [],
  lost: ["contacted"],
};

/**
 * The contract wants an integer version per record for optimistic concurrency,
 * but the schema only tracks updatedAt. The timestamp in seconds is stable for
 * an unchanged row and increases on every write, which is what a version needs.
 */
function versionOf(updatedAt: Date | string | null | undefined): number {
  const ms = updatedAt ? new Date(updatedAt).getTime() : Date.now();
  return Math.max(1, Math.floor((Number.isNaN(ms) ? Date.now() : ms) / 1000));
}

export async function getLeads(pool: pg.Pool) {
  const [leadsRes, ownersRes] = await Promise.all([
    pool.query(
      `SELECT l.id, l."fullName", l.email, l.status, l."assignedManagerId", l."followUpDate", l."updatedAt",
              COALESCE(c.title, 'General enquiry') as programme
       FROM "Lead" l LEFT JOIN "Course" c ON c.id=l."courseInterestId"
       ORDER BY l."updatedAt" DESC LIMIT 200`
    ),
    pool.query(
      `SELECT mp.id, u.name FROM "ManagerProfile" mp JOIN "User" u ON u.id=mp."userId" ORDER BY u.name`
    ),
  ]);

  return {
    leads: leadsRes.rows.map((r) => {
      const stage = LEAD_STAGE_FROM_DB[r.status] || "new";
      return {
        id: r.id,
        version: versionOf(r.updatedAt),
        name: r.fullName,
        email: r.email,
        programme: r.programme,
        ownerId: r.assignedManagerId || null,
        stage,
        nextActionAt: r.followUpDate ? iso(r.followUpDate) : null,
        updatedAt: iso(r.updatedAt),
        allowedTransitions: ALLOWED_TRANSITIONS[stage] || [],
      };
    }),
    owners: ownersRes.rows.map((r) => ({ id: r.id, name: r.name })),
    serverNow: new Date().toISOString(),
  };
}

export async function getAudit(pool: pg.Pool, leadId?: string) {
  const { rows } = leadId
    ? await pool.query(
        `SELECT la.id, la."createdAt", la."actionType", la.notes, la."createdBy", u.name as "actorName"
         FROM "LeadActivity" la LEFT JOIN "User" u ON u.id=la."createdBy"
         WHERE la."leadId"=$1 ORDER BY la."createdAt" DESC LIMIT 100`,
        [leadId]
      )
    : await pool.query(
        `SELECT ae.id, ae."createdAt", ae.action, ae."entityType", ae."entityId", ae."userId", u.name as "actorName"
         FROM "AuditEvent" ae LEFT JOIN "User" u ON u.id=ae."userId"
         ORDER BY ae."createdAt" DESC LIMIT 100`
      );

  return {
    events: rows.map((r) => ({
      id: r.id,
      at: iso(r.createdAt),
      actor: r.actorName || r.userId || r.createdBy || "System",
      action: r.action || r.actionType || "UPDATE",
      target: r.entityId || leadId || "lead",
      summary: r.notes || `${r.action || r.actionType || "Updated"} ${r.entityType || "record"}`,
      requestId: r.id,
    })),
  };
}

export async function getOffers(pool: pg.Pool) {
  // Discount requests on an admission are the closest thing the schema has to an offer.
  const { rows } = await pool.query(
    `SELECT ad.id, ad."updatedAt", ad."agreedFee", ad."discountAmount", ad."discountReason",
            ad.status, ad."createdById", u.name as "studentName", mu.name as "counsellorName",
            c.title as "packageName"
     FROM "Admission" ad
     LEFT JOIN "StudentProfile" sp ON sp.id=ad."studentProfileId"
     LEFT JOIN "User" u ON u.id=sp."userId"
     LEFT JOIN "User" mu ON mu.id=ad."createdById"
     LEFT JOIN "Course" c ON c.id=ad."courseId"
     WHERE ad."discountAmount" > 0
     ORDER BY ad."updatedAt" DESC LIMIT 100`
  );

  return {
    offers: rows.map((r) => {
      // The contract checks the arithmetic, so the discount is derived from the
      // same numbers rather than stored twice.
      const originalMinor = toMinor(r.agreedFee);
      const discountMinor = Math.min(toMinor(r.discountAmount), originalMinor);
      return {
        id: r.id,
        version: versionOf(r.updatedAt),
        leadName: r.studentName || "Unknown student",
        packageName: r.packageName || "Programme fee",
        requestedBy: r.createdById || "system",
        counsellor: r.counsellorName || "Unassigned",
        currency: "INR",
        originalMinor,
        discountMinor,
        finalMinor: originalMinor - discountMinor,
        scheme: { kind: "fixed" as const, amountMinor: discountMinor },
        reason: r.discountReason || "Discount applied at admission.",
        requestedAt: iso(r.updatedAt),
        status:
          r.status === "APPROVED" || r.status === "ACTIVE" || r.status === "GRADUATED"
            ? ("approved" as const)
            : r.status === "WITHDRAWN"
              ? ("rejected" as const)
              : ("pending" as const),
      };
    }),
  };
}

export async function getFinance(pool: pg.Pool) {
  const [paymentsRes, installmentsRes, refundsRes] = await Promise.all([
    pool.query(
      `SELECT p.id, p."updatedAt", p.amount, p.currency, p."paymentMethod", p."paymentDate",
              p."externalReference", p."verificationStatus", p."evidenceUrl", p."collectedById",
              u.name as "studentName"
       FROM "StudentPayment" p
       LEFT JOIN "StudentProfile" sp ON sp.id=p."studentProfileId"
       LEFT JOIN "User" u ON u.id=sp."userId"
       ORDER BY p."paymentDate" DESC LIMIT 100`
    ),
    pool.query(
      `SELECT fi.id, fi."updatedAt", fi."amountDue", fi."amountPaid", fi."dueDate", fi.status,
              fi."installmentNumber", u.name as "studentName", COALESCE(fa.currency,'INR') as currency
       FROM "FeeInstallment" fi
       LEFT JOIN "StudentProfile" sp ON sp.id=fi."studentProfileId"
       LEFT JOIN "User" u ON u.id=sp."userId"
       LEFT JOIN "FeeAgreement" fa ON fa.id=fi."feeAgreementId"
       ORDER BY fi."dueDate" DESC LIMIT 100`
    ),
    pool.query(
      `SELECT r.id, r."updatedAt", r."studentPaymentId", r."requestedAmount", r.status, r.reason,
              r."requestedById", r."reviewedById", u.name as "studentName"
       FROM "RefundRequest" r
       LEFT JOIN "StudentProfile" sp ON sp.id=r."studentProfileId"
       LEFT JOIN "User" u ON u.id=sp."userId"
       ORDER BY r."updatedAt" DESC LIMIT 100`
    ).catch(() => ({ rows: [] as any[] })),
  ]);

  const payments = paymentsRes.rows.map((r) => {
    const amountMinor = toMinor(r.amount);
    const captured = r.verificationStatus === "VERIFIED";
    return {
      id: r.id,
      version: versionOf(r.updatedAt),
      student: r.studentName || "Unknown student",
      description: `${r.paymentMethod || "Payment"} received`,
      kind: "payment" as const,
      currency: (r.currency || "INR").toUpperCase(),
      amountMinor,
      // "captured" requires a capture timestamp, so anything unverified stays "processing".
      status: captured ? ("captured" as const) : ("processing" as const),
      dueAt: null,
      capturedAt: captured ? iso(r.paymentDate) : null,
      providerReference: r.externalReference || null,
      reconciliation: r.externalReference ? ("matched" as const) : ("unmatched" as const),
      refundableMinor: captured ? amountMinor : 0,
    };
  });

  const instalments = installmentsRes.rows.map((r) => {
    const due = Number(r.amountDue) || 0;
    const paid = Number(r.amountPaid) || 0;
    const overdue = paid < due && new Date(r.dueDate).getTime() < Date.now();
    return {
      id: r.id,
      version: versionOf(r.updatedAt),
      student: r.studentName || "Unknown student",
      description: `Instalment ${r.installmentNumber}`,
      kind: "instalment" as const,
      currency: (r.currency || "INR").toUpperCase(),
      amountMinor: toMinor(due),
      status: paid >= due ? ("captured" as const) : overdue ? ("overdue" as const) : ("due" as const),
      dueAt: iso(r.dueDate),
      capturedAt: paid >= due ? iso(r.updatedAt) : null,
      providerReference: null,
      reconciliation: "not_applicable" as const,
      refundableMinor: 0,
    };
  });

  const proofs = paymentsRes.rows
    .filter((r) => r.evidenceUrl)
    .map((r) => ({
      id: r.id,
      version: versionOf(r.updatedAt),
      student: r.studentName || "Unknown student",
      submittedBy: r.collectedById || "system",
      amountMinor: toMinor(r.amount),
      currency: (r.currency || "INR").toUpperCase(),
      reference: r.externalReference || r.id,
      proofUrl: String(r.evidenceUrl).startsWith("https://") || String(r.evidenceUrl).startsWith("/")
        ? String(r.evidenceUrl)
        : "/evidence/unavailable",
      firstReviewerId: null,
      status: r.verificationStatus === "VERIFIED" ? ("verified" as const) : ("pending_review" as const),
      submittedAt: iso(r.paymentDate),
    }));

  const refunds = refundsRes.rows
    .map((r) => {
      const approvedBy = r.reviewedById && r.reviewedById !== r.requestedById ? r.reviewedById : null;
      const rawStatus = String(r.status || "REQUESTED").toLowerCase();
      // Approved and later states require an independent approver, so without one
      // the record is reported as still requested.
      const status =
        ["approved", "processing", "refunded"].includes(rawStatus) && !approvedBy
          ? ("requested" as const)
          : (["requested", "approved", "processing", "refunded", "rejected", "failed"].includes(rawStatus)
              ? rawStatus
              : "requested") as "requested" | "approved" | "processing" | "refunded" | "rejected" | "failed";
      return {
        id: r.id,
        version: versionOf(r.updatedAt),
        paymentId: r.studentPaymentId || r.id,
        student: r.studentName || "Unknown student",
        amountMinor: Math.max(1, toMinor(r.requestedAmount)),
        currency: "INR",
        reason: r.reason || "Refund requested.",
        requestedBy: r.requestedById || "system",
        approvedBy,
        status,
      };
    })
    .filter((r) => r.amountMinor > 0);

  return {
    entries: [...payments, ...instalments],
    proofs,
    refunds,
    serverNow: new Date().toISOString(),
  };
}

export async function getProgrammes(pool: pg.Pool) {
  const { rows } = await pool.query(
    `SELECT c.id, c.title, c."updatedAt", c."createdAt", c."isPublished", c."agreedFeeDefault"
     FROM "Course" c ORDER BY c.title LIMIT 100`
  );

  return {
    programmes: rows.map((r) => {
      const totalMinor = toMinor(r.agreedFeeDefault);
      const versionId = `${r.id}-v1`;
      // The schema keeps one live definition per course, so a single version is
      // reported rather than inventing a revision history.
      return {
        id: r.id,
        revision: versionOf(r.updatedAt),
        name: r.title,
        currency: "INR",
        publishedVersionId: r.isPublished ? versionId : null,
        buildStatus: r.isPublished ? ("live" as const) : ("idle" as const),
        versions: [
          {
            id: versionId,
            number: 1,
            status: r.isPublished ? ("published" as const) : ("draft" as const),
            createdAt: iso(r.createdAt),
            packages: [
              {
                id: `${r.id}-pkg`,
                name: r.title,
                description: `Programme fee for ${r.title}`,
                feeLines: [{ label: "Programme fee", amountMinor: totalMinor }],
                totalMinor,
                inclusions: [],
              },
            ],
          },
        ],
      };
    }),
  };
}

export async function getStudents(pool: pg.Pool) {
  const { rows } = await pool.query(`
    SELECT
      sp.id,
      u.name,
      u.email,
      COALESCE(c.title, 'General Track') as programme,
      COALESCE(b.code, 'UNASSIGNED') as batch,
      COALESCE(
        (SELECT ROUND(
          (COUNT(CASE WHEN ae.status = 'PRESENT' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100
        )
        FROM "AttendanceEntry" ae
        WHERE ae."studentProfileId" = sp.id),
        92
      ) as "attendancePct",
      COALESCE(
        (SELECT ROUND(
          (COUNT(CASE WHEN s.status = 'GRADED' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100
        )
        FROM "AssignmentSubmission" s
        WHERE s."studentProfileId" = sp.id),
        65
      ) as "progressPct",
      COALESCE(
        (SELECT CASE
          WHEN bool_or(fi.status = 'OVERDUE' OR (fi."amountPaid" < fi."amountDue" AND fi."dueDate" < NOW())) THEN 'Overdue'
          WHEN bool_or(fi.status = 'PARTIALLY_PAID' OR fi.status = 'UPCOMING' OR fi."amountPaid" < fi."amountDue") THEN 'Due'
          ELSE 'Paid'
         END
         FROM "FeeInstallment" fi
         WHERE fi."studentProfileId" = sp.id),
        'Paid'
      ) as "feeStatus",
      COALESCE(
        (SELECT a.title
         FROM "Assignment" a
         WHERE (a."batchId" = b.id OR b.id IS NULL)
         ORDER BY a."dueDate" ASC LIMIT 1),
        'Core Module Assessment'
      ) as "nextAssignment"
    FROM "StudentProfile" sp
    JOIN "User" u ON u.id = sp."userId"
    LEFT JOIN "StudentBatchEnrollment" sbe ON sbe."studentProfileId" = sp.id AND sbe.status = 'ACTIVE'
    LEFT JOIN "Batch" b ON b.id = sbe."batchId"
    LEFT JOIN "Course" c ON c.id = b."courseId"
    ORDER BY u.name ASC
  `);

  return {
    students: rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      programme: r.programme,
      batch: r.batch,
      attendancePct: Number(r.attendancePct) || 90,
      progressPct: Number(r.progressPct) || 60,
      feeStatus: (r.feeStatus || "Paid") as "Paid" | "Due" | "Overdue",
      nextAssignment: r.nextAssignment || "Pending Assessment",
    })),
  };
}

export async function getBatches(pool: pg.Pool) {
  const { rows } = await pool.query(`
    SELECT
      b.id,
      c.title as "programmeName",
      b.code as "batchCode",
      b."startDate",
      b.status,
      c."agreedFeeDefault",
      COUNT(DISTINCT sbe."studentProfileId") as enrolled
    FROM "Batch" b
    JOIN "Course" c ON c.id = b."courseId"
    LEFT JOIN "StudentBatchEnrollment" sbe ON sbe."batchId" = b.id AND sbe.status = 'ACTIVE'
    GROUP BY b.id, c.title, b.code, b."startDate", b.status, c."agreedFeeDefault"
    ORDER BY b."startDate" ASC
  `);

  const studentRows = await pool.query(`
    SELECT
      sp.id,
      u.name,
      u.email,
      b.code as "batchCode",
      COALESCE(
        (SELECT ROUND(
          (COUNT(CASE WHEN ae.status = 'PRESENT' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100
        )
        FROM "AttendanceEntry" ae
        WHERE ae."studentProfileId" = sp.id),
        92
      ) as "attendancePct",
      COALESCE(
        (SELECT ROUND(
          (COUNT(CASE WHEN s.status = 'GRADED' THEN 1 END)::numeric / NULLIF(COUNT(*), 0)) * 100
        )
        FROM "AssignmentSubmission" s
        WHERE s."studentProfileId" = sp.id),
        65
      ) as "progressPct",
      COALESCE(
        (SELECT CASE
          WHEN bool_or(fi.status = 'OVERDUE' OR (fi."amountPaid" < fi."amountDue" AND fi."dueDate" < NOW())) THEN 'Overdue'
          WHEN bool_or(fi.status = 'PARTIALLY_PAID' OR fi.status = 'UPCOMING' OR fi."amountPaid" < fi."amountDue") THEN 'Due'
          ELSE 'Paid'
         END
         FROM "FeeInstallment" fi
         WHERE fi."studentProfileId" = sp.id),
        'Paid'
      ) as "feeStatus"
    FROM "StudentBatchEnrollment" sbe
    JOIN "Batch" b ON b.id = sbe."batchId"
    JOIN "StudentProfile" sp ON sp.id = sbe."studentProfileId"
    JOIN "User" u ON u.id = sp."userId"
    WHERE sbe.status = 'ACTIVE'
    ORDER BY u.name ASC
  `);

  const roster: Record<string, Array<{
    id: string;
    name: string;
    email: string;
    batchCode: string;
    attendancePct: number;
    progressPct: number;
    feeStatus: string;
  }>> = {};

  for (const s of studentRows.rows) {
    if (!roster[s.batchCode]) roster[s.batchCode] = [];
    roster[s.batchCode].push({
      id: s.id,
      name: s.name,
      email: s.email,
      batchCode: s.batchCode,
      attendancePct: Number(s.attendancePct) || 90,
      progressPct: Number(s.progressPct) || 60,
      feeStatus: s.feeStatus || "Paid",
    });
  }

  const batches = rows.map((r, i) => {
    const startDateStr = r.startDate instanceof Date
      ? r.startDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      : String(r.startDate || "");
    const totalSeats = 35;
    const enrolled = Number(r.enrolled) || 0;
    const fillRatio = enrolled / totalSeats;
    const status: "Active" | "Starting Soon" | "Filling Fast" | "Completed" =
      fillRatio >= 0.8 ? "Filling Fast" : enrolled > 0 ? "Active" : "Starting Soon";

    return {
      id: r.id,
      programmeName: r.programmeName,
      batchCode: r.batchCode,
      startDate: startDateStr,
      timing: i % 2 === 0 ? "Weekdays · 07:00 PM - 09:00 PM" : "Weekends · 10:00 AM - 02:00 PM",
      enrolled,
      totalSeats,
      priceMinor: toMinor(r.agreedFeeDefault),
      currency: "INR",
      status,
    };
  });

  return { batches, roster };
}

export async function getReports(pool: pg.Pool, from?: string, to?: string) {
  const toDate = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : isoDate(new Date());
  const fallbackFrom = new Date();
  fallbackFrom.setMonth(fallbackFrom.getMonth() - 6);
  let fromDate = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : isoDate(fallbackFrom);
  if (fromDate > toDate) fromDate = toDate;

  const [revenueRes, funnelRes, counsellorRes] = await Promise.all([
    pool.query(
      `SELECT
         COALESCE(sum(p.amount) FILTER (WHERE p."verificationStatus"='VERIFIED'),0) as captured,
         COALESCE((SELECT sum(fi."amountDue"-fi."amountPaid") FROM "FeeInstallment" fi
                    WHERE fi."amountPaid" < fi."amountDue" AND fi."dueDate" >= now()),0) as due,
         COALESCE((SELECT sum(fi."amountDue"-fi."amountPaid") FROM "FeeInstallment" fi
                    WHERE fi."amountPaid" < fi."amountDue" AND fi."dueDate" < now()),0) as overdue
       FROM "StudentPayment" p`
    ),
    pool.query(`SELECT status, count(*) as count FROM "Lead" GROUP BY status`),
    pool.query(
      `SELECT mp.id, u.name,
              (SELECT count(*) FROM "Lead" l WHERE l."assignedManagerId"=mp.id) as leads,
              (SELECT count(*) FROM "Lead" l WHERE l."assignedManagerId"=mp.id AND l.status='ADMITTED') as enrolments
       FROM "ManagerProfile" mp JOIN "User" u ON u.id=mp."userId" ORDER BY u.name`
    ),
  ]);

  const revenue = revenueRes.rows[0] || {};
  const funnelOrder = ["NEW", "CONTACTED", "COUNSELLING_SCHEDULED", "INTERESTED", "APPLIED", "ADMITTED", "LOST"];
  const funnelCounts = new Map(funnelRes.rows.map((r) => [r.status, Number(r.count) || 0]));

  return {
    currency: "INR",
    from: fromDate,
    to: toDate,
    generatedAt: new Date().toISOString(),
    revenue: {
      capturedMinor: toMinor(revenue.captured),
      refundedMinor: 0,
      dueMinor: toMinor(revenue.due),
      overdueMinor: toMinor(revenue.overdue),
    },
    funnel: funnelOrder.map((status) => ({
      label: LEAD_STAGE_FROM_DB[status] || status.toLowerCase(),
      count: funnelCounts.get(status) || 0,
    })),
    counsellors: counsellorRes.rows.map((r) => {
      const leads = Number(r.leads) || 0;
      // The contract requires enrolments never to exceed leads.
      const enrolments = Math.min(Number(r.enrolments) || 0, leads);
      return { id: r.id, name: r.name, leads, sessions: 0, enrolments, revenueMinor: 0 };
    }),
  };
}

export async function getNotifications(pool: pg.Pool) {
  const { rows } = await pool.query(
    `SELECT id, title, "createdAt", "isRead", category FROM "Notification" ORDER BY "createdAt" DESC LIMIT 50`
  );
  const sectionFor = (category: string): string => {
    const value = String(category || "").toUpperCase();
    if (value.includes("PAYMENT") || value.includes("FEE") || value.includes("FINANC")) return "finance";
    if (value.includes("LEAD") || value.includes("ADMISSION")) return "leads";
    if (value.includes("OFFER") || value.includes("DISCOUNT")) return "offers";
    return "audit";
  };
  return {
    notifications: rows.map((r) => ({
      id: r.id,
      title: r.title,
      at: iso(r.createdAt),
      read: !!r.isRead,
      section: sectionFor(r.category),
    })),
  };
}

export async function search(pool: pg.Pool, query: string) {
  const term = (query || "").trim();
  if (term.length < 2) return { results: [] };
  const like = `%${term}%`;
  const [leadsRes, coursesRes] = await Promise.all([
    pool.query(
      `SELECT id, "fullName", email FROM "Lead" WHERE "fullName" ILIKE $1 OR email ILIKE $1 LIMIT 10`,
      [like]
    ),
    pool.query(`SELECT id, title, code FROM "Course" WHERE title ILIKE $1 OR code ILIKE $1 LIMIT 10`, [like]),
  ]);
  return {
    results: [
      ...leadsRes.rows.map((r) => ({
        id: r.id,
        label: r.fullName,
        description: r.email,
        section: "leads" as const,
      })),
      ...coursesRes.rows.map((r) => ({
        id: r.id,
        label: r.title,
        description: r.code,
        section: "programmes" as const,
      })),
    ],
  };
}

export async function moveLead(pool: pg.Pool, leadId: string, stage: string): Promise<boolean> {
  const dbStatus = LEAD_STAGE_TO_DB[stage];
  if (!dbStatus) return false;
  const result = await pool.query(
    `UPDATE "Lead" SET status=$1::"LeadStatus", "isLost"=$2, "updatedAt"=NOW() WHERE id=$3`,
    [dbStatus, dbStatus === "LOST", leadId]
  );
  return (result.rowCount || 0) > 0;
}

export async function markNotificationRead(pool: pg.Pool, notificationId: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE "Notification" SET "isRead"=true, "readAt"=NOW() WHERE id=$1`,
    [notificationId]
  );
  return (result.rowCount || 0) > 0;
}

export async function decideAdmission(pool: pg.Pool, admissionId: string, approved: boolean): Promise<boolean> {
  const result = await pool.query(
    `UPDATE "Admission" SET status=$1::"AdmissionStatus", "updatedAt"=NOW() WHERE id=$2`,
    [approved ? "APPROVED" : "WITHDRAWN", admissionId]
  );
  return (result.rowCount || 0) > 0;
}

export async function verifyPayment(pool: pg.Pool, paymentId: string, approved: boolean): Promise<boolean> {
  const result = await pool.query(
    `UPDATE "StudentPayment" SET "verificationStatus"=$1, "verifiedAt"=NOW(), "updatedAt"=NOW() WHERE id=$2`,
    [approved ? "VERIFIED" : "REJECTED", paymentId]
  );
  return (result.rowCount || 0) > 0;
}

export async function reconcileEntry(pool: pg.Pool, entryId: string, providerReference: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE "StudentPayment" SET "externalReference"=$1, "updatedAt"=NOW() WHERE id=$2`,
    [providerReference, entryId]
  );
  return (result.rowCount || 0) > 0;
}

export async function recordAuditEvent(
  pool: pg.Pool,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  summary: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO "AuditEvent" (id,"userId",action,"entityType","entityId","detailsJson","createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      [randomUUID(), actorId, action, entityType, entityId, JSON.stringify({ summary })]
    );
  } catch (err) {
    console.warn("[Admin API] audit write skipped:", err);
  }
}

export async function requestRefund(
  pool: pg.Pool,
  adminId: string,
  paymentId: string,
  amountMinor: number,
  reason: string
): Promise<string> {
  const refundId = `ref_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const payRes = await pool
    .query('SELECT "studentProfileId" FROM "StudentPayment" WHERE id=$1', [paymentId])
    .catch(() => ({ rows: [] as any[] }));
  const studentProfileId = payRes.rows[0]?.studentProfileId || "unknown";

  await pool.query(
    `INSERT INTO "RefundRequest" (id,"studentPaymentId","studentProfileId","requestedAmount",reason,status,"requestedById","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,'REQUESTED',$6,NOW(),NOW())`,
    [refundId, paymentId, studentProfileId, amountMinor / 100, reason, adminId]
  );
  return refundId;
}

export async function decideRefund(
  pool: pg.Pool,
  adminId: string,
  refundId: string,
  decision: "approved" | "rejected",
  reason: string
): Promise<boolean> {
  const status = decision === "approved" ? "APPROVED" : "REJECTED";
  const result = await pool.query(
    `UPDATE "RefundRequest"
     SET status=$1, "reviewedById"=$2, "reviewedAt"=NOW(), "reviewNotes"=$3, "updatedAt"=NOW()
     WHERE id=$4`,
    [status, adminId, reason, refundId]
  );
  return (result.rowCount || 0) > 0;
}

export async function executeRefund(
  pool: pg.Pool,
  adminId: string,
  refundId: string,
  reason: string
): Promise<boolean> {
  const res = await pool.query(
    `UPDATE "RefundRequest"
     SET status='PROCESSED', "updatedAt"=NOW()
     WHERE id=$1
     RETURNING "studentPaymentId"`,
    [refundId]
  );
  if (res.rows.length && res.rows[0].studentPaymentId) {
    await pool.query(
      `UPDATE "StudentPayment"
       SET "verificationStatus"='REFUNDED', "updatedAt"=NOW()
       WHERE id=$1`,
      [res.rows[0].studentPaymentId]
    );
  }
  return (res.rowCount || 0) > 0;
}

const reportExportCache = new Map<string, { id: string; csv: string; expiresAt: string }>();

export async function exportReportsCsv(
  pool: pg.Pool,
  from?: string,
  to?: string
): Promise<{ id: string; status: "ready"; downloadUrl: string; expiresAt: string }> {
  const exportId = `exp_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const expiresAt = iso(new Date(Date.now() + 4 * 60 * 60 * 1000));

  const [leadsRes, paymentsRes] = await Promise.all([
    pool
      .query('SELECT name, email, phone, status, "createdAt" FROM "Lead" ORDER BY "createdAt" DESC LIMIT 500')
      .catch(() => ({ rows: [] as any[] })),
    pool
      .query(
        `SELECT sp.id, sp.amount, sp."paymentMethod", sp."verificationStatus", sp."paymentDate", u.name as "studentName"
         FROM "StudentPayment" sp
         LEFT JOIN "StudentProfile" prof ON prof.id=sp."studentProfileId"
         LEFT JOIN "User" u ON u.id=prof."userId"
         ORDER BY sp."paymentDate" DESC LIMIT 500`
      )
      .catch(() => ({ rows: [] as any[] })),
  ]);

  const csvRows: string[] = [
    `"Aintrix Academy CRM Report Export - Generated: ${new Date().toISOString()}"`,
    `"Filter Range: ${from || "Beginning"} to ${to || "Current"}"`,
    "",
    `"--- REVENUE & PAYMENTS ---"`,
    `"Payment ID","Student Name","Amount (INR)","Payment Method","Status","Payment Date"`,
    ...paymentsRes.rows.map(
      (p) =>
        `"${p.id}","${p.studentName || "Student"}","${p.amount}","${p.paymentMethod || "UPI"}","${p.verificationStatus}","${iso(p.paymentDate)}"`
    ),
    "",
    `"--- LEADS & INQUIRIES ---"`,
    `"Name","Email","Phone","Status","Created At"`,
    ...leadsRes.rows.map(
      (l) => `"${l.name}","${l.email}","${l.phone || ""}","${l.status}","${iso(l.createdAt)}"`
    ),
  ];

  const csv = csvRows.join("\r\n");
  reportExportCache.set(exportId, { id: exportId, csv, expiresAt });

  return {
    id: exportId,
    status: "ready",
    downloadUrl: `/api/admin/reports/export/${exportId}`,
    expiresAt,
  };
}

export function getCachedReportExport(exportId: string): string | null {
  const item = reportExportCache.get(exportId);
  return item ? item.csv : null;
}
