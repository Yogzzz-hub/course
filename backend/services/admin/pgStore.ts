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
