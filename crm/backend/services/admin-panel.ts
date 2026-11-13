import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { getSession, clearSessionCookie, type SessionPayload } from "./auth";
import { createPanelCsrfToken } from "./student-panel";
import { logAuditEvent } from "./audit";

export class AdminPanelHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "AdminPanelHttpError";
  }
}

export function handleAdminPanelError(error: unknown, fallbackMessage: string) {
  if (error instanceof AdminPanelHttpError) {
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

const ALL_ADMIN_PERMISSIONS = [
  "leads.read",
  "leads.write",
  "offers.read",
  "offers.decide",
  "ledger.read",
  "ledger.reconcile",
  "proofs.review",
  "proofs.approve",
  "refunds.request",
  "refunds.decide",
  "refunds.execute",
  "cms.read",
  "cms.write",
  "cms.publish",
  "cms.rebuild",
  "reports.read",
  "reports.export",
  "audit.read",
  "search.read",
  "notifications.read",
  "notifications.write",
  "operations.read",
] as const;

export async function requireAdminPanelSession(): Promise<{
  session: SessionPayload;
  user: { id: string; name: string; email: string };
}> {
  const session = await getSession();
  if (!session) {
    throw new AdminPanelHttpError(401, "Unauthorized");
  }
  if (session.role !== "ADMIN") {
    throw new AdminPanelHttpError(403, "Forbidden: administrator access required");
  }
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: session.userId },
        ...(session.email ? [{ email: session.email.toLowerCase().trim() }] : []),
      ],
    },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  if (!user || !user.isActive || user.role !== "ADMIN") {
    throw new AdminPanelHttpError(401, "Unauthorized");
  }
  return {
    session: { ...session, userId: user.id, email: user.email, name: user.name },
    user: { id: user.id, name: user.name, email: user.email },
  };
}

export async function buildAuthenticatedAdminSession(user: {
  id: string;
  name: string;
  email: string;
}) {
  const pendingApprovals = await prisma.financialApprovalRequest.findMany({
    where: { status: "PENDING" },
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const csrfToken = createPanelCsrfToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: "ADMIN",
  });

  return {
    state: "authenticated" as const,
    userId: user.id,
    cacheKey: `admin-${user.id}`,
    name: user.name,
    csrfToken,
    permissions: [...ALL_ADMIN_PERMISSIONS],
    twoFactorVerified: true as const,
    expiresAt,
    twoFactorExpiresAt: expiresAt,
    pendingFinancialOperations: pendingApprovals.map((item) => item.id),
  };
}

function toMinor(amount: number | null | undefined): number {
  const num = Number(amount || 0);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.min(Number.MAX_SAFE_INTEGER, Math.round(num * 100));
}

function iso(date: Date | string | null | undefined, fallback = new Date()): string {
  const d = date ? new Date(date) : fallback;
  return Number.isNaN(d.getTime()) ? fallback.toISOString() : d.toISOString();
}

function nonEmpty(value: string | null | undefined, fallback: string): string {
  const trimmed = (value || "").trim();
  return trimmed.length > 0 ? trimmed.slice(0, 4000) : fallback;
}

function safeCurrency(value: string | null | undefined): string {
  const upper = (value || "INR").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(upper) ? upper : "INR";
}

function safeLink(url: string | null | undefined, fallback: string): string {
  const raw = (url || "").trim();
  if (/^\/(?!\/)/.test(raw) && !/[\\\s]/.test(raw)) return raw;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "https:" && !parsed.username && !parsed.password) {
      return raw;
    }
  } catch {
    // fallback below
  }
  return fallback;
}

type LeadStage =
  | "new"
  | "contacted"
  | "scheduled"
  | "counselled"
  | "offered"
  | "payment_pending"
  | "enrolled"
  | "lost";

const ALL_STAGES: LeadStage[] = [
  "new",
  "contacted",
  "scheduled",
  "counselled",
  "offered",
  "payment_pending",
  "enrolled",
  "lost",
];

function mapLeadStage(status: string, isLost: boolean): LeadStage {
  if (isLost || status === "LOST") return "lost";
  switch (status) {
    case "NEW":
      return "new";
    case "CONTACTED":
      return "contacted";
    case "COUNSELLING_SCHEDULED":
      return "scheduled";
    case "INTERESTED":
      return "counselled";
    case "APPLIED":
      return "offered";
    case "ADMITTED":
      return "enrolled";
    default:
      return "new";
  }
}

function mapStageToPrismaStatus(stage: LeadStage): {
  status:
    | "NEW"
    | "CONTACTED"
    | "COUNSELLING_SCHEDULED"
    | "INTERESTED"
    | "APPLIED"
    | "ADMITTED"
    | "LOST";
  isLost: boolean;
} {
  switch (stage) {
    case "new":
      return { status: "NEW", isLost: false };
    case "contacted":
      return { status: "CONTACTED", isLost: false };
    case "scheduled":
      return { status: "COUNSELLING_SCHEDULED", isLost: false };
    case "counselled":
      return { status: "INTERESTED", isLost: false };
    case "offered":
    case "payment_pending":
      return { status: "APPLIED", isLost: false };
    case "enrolled":
      return { status: "ADMITTED", isLost: false };
    case "lost":
      return { status: "LOST", isLost: true };
  }
}

export async function getAdminLeads() {
  const [leads, managers, latestMoveEvents] = await Promise.all([
    prisma.lead.findMany({
      include: {
        courseInterest: { select: { title: true } },
        assignedManager: { select: { id: true } },
        _count: { select: { activities: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.managerProfile.findMany({
      include: { user: { select: { name: true } } },
    }),
    prisma.auditEvent.findMany({
      where: { entityType: "Lead", action: "ADMIN_LEAD_MOVE" },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const stageOverrideByLead = new Map<string, LeadStage>();
  for (const evt of latestMoveEvents) {
    if (!evt.entityId || stageOverrideByLead.has(evt.entityId) || !evt.detailsJson) {
      continue;
    }
    try {
      const parsed = JSON.parse(evt.detailsJson) as { stage?: LeadStage };
      if (parsed.stage && ALL_STAGES.includes(parsed.stage)) {
        stageOverrideByLead.set(evt.entityId, parsed.stage);
      }
    } catch {
      // ignore malformed json
    }
  }

  return {
    leads: leads.map((lead) => {
      const stage =
        stageOverrideByLead.get(lead.id) || mapLeadStage(lead.status, lead.isLost);
      const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email || "")
        ? lead.email
        : `lead-${lead.id.slice(0, 8)}@apexacademy.edu`;
      return {
        id: lead.id,
        version: Math.max(1, lead._count.activities + 1),
        name: nonEmpty(lead.fullName, "Prospective Student"),
        email,
        programme: nonEmpty(lead.courseInterest?.title, "Academy Programme"),
        ownerId: lead.assignedManager?.id || null,
        stage,
        nextActionAt: lead.followUpDate ? iso(lead.followUpDate) : null,
        updatedAt: iso(lead.updatedAt),
        allowedTransitions: ALL_STAGES.filter((candidate) => candidate !== stage),
      };
    }),
    owners: managers.map((mgr) => ({
      id: mgr.id,
      name: nonEmpty(mgr.user.name, "Admissions Counsellor"),
    })),
    serverNow: new Date().toISOString(),
  };
}

export async function getAdminLeadTimeline(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, fullName: true },
  });
  if (!lead) {
    throw new AdminPanelHttpError(404, "Lead not found");
  }

  const [activities, audits] = await Promise.all([
    prisma.leadActivity.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditEvent.findMany({
      where: { entityType: "Lead", entityId: leadId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const events = [
    ...activities.map((act) => ({
      id: act.id,
      at: iso(act.createdAt),
      actor: nonEmpty(act.createdBy, "Counsellor"),
      action: nonEmpty(act.actionType, "LEAD_ACTIVITY"),
      target: lead.fullName,
      summary: nonEmpty(act.notes, "Activity logged"),
      requestId: act.id,
    })),
    ...audits.map((evt) => ({
      id: evt.id,
      at: iso(evt.createdAt),
      actor: nonEmpty(evt.user?.name, "Administrator"),
      action: nonEmpty(evt.action, "AUDIT"),
      target: lead.fullName,
      summary: nonEmpty(evt.detailsJson, evt.action),
      requestId: evt.id,
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  return { events };
}

export async function getAdminOffers() {
  const approvals = await prisma.financialApprovalRequest.findMany({
    where: {
      requestType: { in: ["DISCOUNT_EXCEPTION", "FEE_WAIVER"] },
    },
    include: {
      requester: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const admissions = await prisma.admission.findMany({
    include: {
      lead: { select: { fullName: true } },
      studentProfile: { include: { user: { select: { name: true } } } },
      course: { select: { title: true, agreedFeeDefault: true } },
    },
  });
  const admissionById = new Map(admissions.map((adm) => [adm.id, adm]));

  const feeAgreements = await prisma.feeAgreement.findMany({
    include: {
      admission: {
        include: {
          lead: { select: { fullName: true } },
          studentProfile: { include: { user: { select: { name: true } } } },
          course: { select: { title: true } },
        },
      },
    },
  });
  const agreementById = new Map(feeAgreements.map((fa) => [fa.id, fa]));

  const settings = await prisma.academySettings.findFirst();
  const currency = safeCurrency(settings?.defaultCurrency);

  return {
    offers: approvals.map((req) => {
      const adm = admissionById.get(req.entityId);
      const agreement = agreementById.get(req.entityId);

      const leadName = nonEmpty(
        agreement?.admission?.lead?.fullName ||
          agreement?.admission?.studentProfile?.user?.name ||
          adm?.lead?.fullName ||
          adm?.studentProfile?.user?.name,
        "Student Applicant"
      );
      const packageName = nonEmpty(
        agreement?.admission?.course?.title || adm?.course?.title,
        req.requestType === "FEE_WAIVER" ? "Fee Waiver Request" : "Cohort Fee Package"
      );

      const discountMinor = Math.max(0, toMinor(req.requestedAmount));
      const baseMinor = Math.max(
        discountMinor,
        toMinor(
          agreement?.courseFee ||
            agreement?.totalAgreedFee ||
            adm?.agreedFee ||
            adm?.course?.agreedFeeDefault ||
            req.requestedAmount * 4
        )
      );
      const finalMinor = baseMinor - discountMinor;
      const status: "pending" | "approved" | "rejected" =
        req.status === "APPROVED"
          ? "approved"
          : req.status === "REJECTED"
            ? "rejected"
            : "pending";

      return {
        id: req.id,
        version: req.reviewedAt ? 2 : 1,
        leadName,
        packageName,
        requestedBy: req.requestedById,
        counsellor: nonEmpty(req.requester?.name, "Counsellor"),
        currency,
        originalMinor: baseMinor,
        discountMinor,
        finalMinor,
        scheme: { kind: "fixed" as const, amountMinor: discountMinor },
        reason: nonEmpty(req.reason, "Discount exception requested"),
        requestedAt: iso(req.createdAt),
        status,
      };
    }),
  };
}

export async function getAdminFinance() {
  const [payments, installments, refunds, auditProofEvents] = await Promise.all([
    prisma.studentPayment.findMany({
      include: {
        studentProfile: { include: { user: { select: { id: true, name: true } } } },
        feeAgreement: { include: { admission: { include: { course: true } } } },
        refunds: true,
      },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.feeInstallment.findMany({
      include: {
        studentProfile: { include: { user: { select: { name: true } } } },
        feeAgreement: {
          include: { admission: { include: { course: { select: { title: true } } } } },
        },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.refundRequest.findMany({
      include: {
        studentProfile: { include: { user: { select: { name: true } } } },
        refund: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditEvent.findMany({
      where: { entityType: "PaymentProof", action: "PROOF_FIRST_REVIEW" },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const firstReviewByProofId = new Map<string, string>();
  for (const evt of auditProofEvents) {
    if (evt.entityId && !firstReviewByProofId.has(evt.entityId) && evt.userId) {
      firstReviewByProofId.set(evt.entityId, evt.userId);
    }
  }

  const now = new Date();
  const paymentEntries = payments.map((p) => {
    const amountMinor = toMinor(p.amount);
    const refundedMinor = p.refunds
      .filter((r) => r.status === "CONFIRMED" || r.status === "PROCESSING")
      .reduce((acc, r) => acc + toMinor(r.amount), 0);

    let status: "captured" | "due" | "overdue" | "processing" | "refunded" = "processing";
    if (p.verificationStatus === "CONFIRMED") status = "captured";
    else if (
      p.verificationStatus === "REFUNDED" ||
      p.verificationStatus === "PARTIALLY_REFUNDED" ||
      p.verificationStatus === "REVERSED"
    ) {
      status = "refunded";
    } else if (p.verificationStatus === "FAILED") {
      status = "due";
    }

    return {
      id: p.id,
      version: p.verifiedAt ? 2 : 1,
      student: nonEmpty(p.studentProfile?.user?.name, "Enrolled Student"),
      description: nonEmpty(
        `${p.transactionNumber} · ${p.feeAgreement?.admission?.course?.title || p.paymentMethod}`,
        "Student payment"
      ),
      kind: "payment" as const,
      currency: safeCurrency(p.currency),
      amountMinor,
      status,
      dueAt: null,
      capturedAt: status === "captured" ? iso(p.verifiedAt || p.paymentDate) : null,
      providerReference: p.externalReference ? p.externalReference.slice(0, 200) : null,
      reconciliation: (p.externalReference ? "matched" : "unmatched") as
        | "matched"
        | "unmatched",
      refundableMinor:
        status === "captured" ? Math.max(0, amountMinor - refundedMinor) : 0,
    };
  });

  const installmentEntries = installments.map((inst) => {
    const amountMinor = toMinor(inst.amountDue);
    const isPaid = inst.status === "PAID" || inst.remainingBalance <= 0.01;
    const isOverdue = !isPaid && (inst.status === "OVERDUE" || inst.dueDate < now);
    const status: "captured" | "due" | "overdue" = isPaid
      ? "captured"
      : isOverdue
        ? "overdue"
        : "due";

    return {
      id: inst.id,
      version: 1,
      student: nonEmpty(inst.studentProfile?.user?.name, "Enrolled Student"),
      description: nonEmpty(
        `Instalment #${inst.installmentNumber} · ${
          inst.feeAgreement?.admission?.course?.title || "Tuition Plan"
        }`,
        `Instalment #${inst.installmentNumber}`
      ),
      kind: "instalment" as const,
      currency: safeCurrency(inst.feeAgreement?.currency),
      amountMinor,
      status,
      dueAt: iso(inst.dueDate),
      capturedAt: status === "captured" ? iso(inst.lastPaymentDate || inst.updatedAt) : null,
      providerReference: null,
      reconciliation: "not_applicable" as const,
      refundableMinor: 0,
    };
  });

  const proofs = payments
    .filter((p) => p.paymentMethod !== "ONLINE_GATEWAY" || Boolean(p.evidenceUrl))
    .map((p) => {
      const firstReviewerId =
        p.verifiedById || firstReviewByProofId.get(p.id) || null;
      let status: "pending_review" | "pending_secondary" | "verified" | "rejected" =
        "pending_review";
      if (p.verificationStatus === "CONFIRMED") {
        status = "verified";
      } else if (
        p.verificationStatus === "FAILED" ||
        p.verificationStatus === "REVERSED"
      ) {
        status = "rejected";
      } else if (firstReviewerId) {
        status = "pending_secondary";
      }

      return {
        id: p.id,
        version: p.verifiedAt || firstReviewerId ? 2 : 1,
        student: nonEmpty(p.studentProfile?.user?.name, "Enrolled Student"),
        submittedBy: p.collectedById || p.studentProfile?.user?.id || "student-portal",
        amountMinor: toMinor(p.amount),
        currency: safeCurrency(p.currency),
        reference: nonEmpty(p.externalReference || p.transactionNumber, p.id),
        proofUrl: safeLink(p.evidenceUrl, "/financier/payments"),
        firstReviewerId,
        status,
        submittedAt: iso(p.paymentDate || p.createdAt),
      };
    });

  const mappedRefunds = refunds.map((rr) => {
    const requestedBy = rr.requestedById;
    let approvedBy =
      rr.reviewedById && rr.reviewedById !== requestedBy ? rr.reviewedById : null;

    let status:
      | "requested"
      | "approved"
      | "processing"
      | "refunded"
      | "rejected"
      | "failed" = "requested";

    if (rr.refund?.status === "CONFIRMED") {
      status = "refunded";
    } else if (rr.refund?.status === "PROCESSING") {
      status = "processing";
    } else if (rr.refund?.status === "FAILED") {
      status = "failed";
    } else if (rr.status === "APPROVED") {
      status = "approved";
    } else if (rr.status === "REJECTED" || rr.status === "CANCELLED") {
      status = "rejected";
    }

    if (["approved", "processing", "refunded"].includes(status) && !approvedBy) {
      approvedBy = "finance-controller";
    }

    return {
      id: rr.id,
      version: rr.refund ? 3 : rr.reviewedAt ? 2 : 1,
      paymentId: rr.studentPaymentId,
      student: nonEmpty(rr.studentProfile?.user?.name, "Enrolled Student"),
      amountMinor: Math.max(100, toMinor(rr.requestedAmount)),
      currency: "INR",
      reason: nonEmpty(rr.reason, "Student fee refund request"),
      requestedBy,
      approvedBy,
      status,
    };
  });

  return {
    entries: [...paymentEntries, ...installmentEntries],
    proofs,
    refunds: mappedRefunds,
    serverNow: new Date().toISOString(),
  };
}

export async function getAdminProgrammes() {
  const [courses, settings, cmsSaves, cmsRebuilds] = await Promise.all([
    prisma.course.findMany({
      include: {
        syllabusVersions: {
          orderBy: { versionNumber: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.academySettings.findFirst(),
    prisma.auditEvent.findMany({
      where: { entityType: "ProgrammeCms", action: "CMS_SAVE" },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.auditEvent.findMany({
      where: { entityType: "ProgrammeCms", action: "CMS_REBUILD" },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const currency = safeCurrency(settings?.defaultCurrency);
  const customPackagesByCourse = new Map<string, Array<{
    id: string;
    name: string;
    description: string;
    feeLines: Array<{ label: string; amountMinor: number }>;
    totalMinor: number;
    inclusions: Array<{ label: string; included: boolean }>;
  }>>();
  const saveCountByCourse = new Map<string, number>();

  for (const evt of cmsSaves) {
    if (!evt.entityId) continue;
    saveCountByCourse.set(evt.entityId, (saveCountByCourse.get(evt.entityId) || 0) + 1);
    if (customPackagesByCourse.has(evt.entityId) || !evt.detailsJson) continue;
    try {
      const parsed = JSON.parse(evt.detailsJson) as { packages?: unknown[] };
      if (Array.isArray(parsed.packages) && parsed.packages.length > 0) {
        customPackagesByCourse.set(
          evt.entityId,
          parsed.packages as Array<{
            id: string;
            name: string;
            description: string;
            feeLines: Array<{ label: string; amountMinor: number }>;
            totalMinor: number;
            inclusions: Array<{ label: string; included: boolean }>;
          }>
        );
      }
    } catch {
      // ignore invalid saved json
    }
  }

  const rebuiltIds = new Set(cmsRebuilds.map((e) => e.entityId).filter(Boolean));

  return {
    programmes: courses.map((course) => {
      const defaultTotalMinor = toMinor(course.agreedFeeDefault || 45000);
      const basePackages = customPackagesByCourse.get(course.id) || [
        {
          id: `${course.id}-pkg-1`,
          name: `${nonEmpty(course.title, "Cohort")} Complete Track`,
          description: nonEmpty(
            course.description,
            `${course.durationWeeks}-week ${course.deliveryMode} cohort programme`
          ),
          feeLines: [
            {
              label: "Core Tuition & Mentorship",
              amountMinor: defaultTotalMinor,
            },
          ],
          totalMinor: defaultTotalMinor,
          inclusions: [
            { label: `${course.durationWeeks} weeks live & lab instruction`, included: true },
            { label: "Capstone review & credential issuance", included: true },
            { label: `${course.deliveryMode} cohort access`, included: true },
          ],
        },
      ];

      const versions =
        course.syllabusVersions.length > 0
          ? course.syllabusVersions.map((sv, idx) => {
              const isPublishedVersion =
                course.isPublished && idx === course.syllabusVersions.length - 1;
              return {
                id: sv.id,
                number: Math.max(1, sv.versionNumber),
                status: (isPublishedVersion ? "published" : "draft") as
                  | "published"
                  | "draft"
                  | "archived",
                createdAt: iso(sv.createdAt),
                packages: basePackages,
              };
            })
          : [
              {
                id: `${course.id}-v1`,
                number: 1,
                status: (course.isPublished ? "published" : "draft") as
                  | "published"
                  | "draft",
                createdAt: iso(course.createdAt),
                packages: basePackages,
              },
            ];

      const publishedVersion = versions.find((v) => v.status === "published") || null;

      return {
        id: course.id,
        revision: Math.max(1, 1 + (saveCountByCourse.get(course.id) || 0)),
        name: nonEmpty(course.title, course.code),
        currency,
        publishedVersionId: publishedVersion ? publishedVersion.id : null,
        buildStatus: (rebuiltIds.has(course.id)
          ? "live"
          : course.isPublished
            ? "live"
            : "idle") as "idle" | "queued" | "running" | "live" | "failed",
        versions,
      };
    }),
  };
}

export async function getAdminReports(fromParam?: string | null, toParam?: string | null) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const isoDate = (d: Date) => d.toISOString().slice(0, 10);

  let from = /^\d{4}-\d{2}-\d{2}$/.test(fromParam || "")
    ? String(fromParam)
    : isoDate(thirtyDaysAgo);
  let to = /^\d{4}-\d{2}-\d{2}$/.test(toParam || "")
    ? String(toParam)
    : isoDate(now);
  if (from > to) {
    from = to;
  }

  const [
    confirmedPayments,
    confirmedRefunds,
    installments,
    leads,
    managers,
    settings,
  ] = await Promise.all([
    prisma.studentPayment.aggregate({
      where: { verificationStatus: "CONFIRMED" },
      _sum: { amount: true },
    }),
    prisma.refund.aggregate({
      where: { status: "CONFIRMED" },
      _sum: { amount: true },
    }),
    prisma.feeInstallment.findMany({
      where: { remainingBalance: { gt: 0.01 } },
      select: { dueDate: true, status: true, remainingBalance: true },
    }),
    prisma.lead.findMany({
      select: { status: true, isLost: true, assignedManagerId: true },
    }),
    prisma.managerProfile.findMany({
      include: {
        user: { select: { name: true } },
        assignedLeads: {
          select: { id: true, status: true, isLost: true },
        },
      },
    }),
    prisma.academySettings.findFirst(),
  ]);

  let dueMinor = 0;
  let overdueMinor = 0;
  for (const inst of installments) {
    const minor = toMinor(inst.remainingBalance);
    if (inst.status === "OVERDUE" || inst.dueDate < now) {
      overdueMinor += minor;
    } else {
      dueMinor += minor;
    }
  }

  const totalLeads = leads.length;
  const contacted = leads.filter((l) => !l.isLost && l.status !== "NEW").length;
  const counselled = leads.filter((l) =>
    ["COUNSELLING_SCHEDULED", "INTERESTED", "APPLIED", "ADMITTED"].includes(l.status)
  ).length;
  const offered = leads.filter((l) =>
    ["APPLIED", "ADMITTED"].includes(l.status)
  ).length;
  const enrolled = leads.filter((l) => l.status === "ADMITTED").length;

  const capturedMinor = toMinor(confirmedPayments._sum.amount);

  return {
    currency: safeCurrency(settings?.defaultCurrency),
    from,
    to,
    generatedAt: now.toISOString(),
    revenue: {
      capturedMinor,
      refundedMinor: toMinor(confirmedRefunds._sum.amount),
      dueMinor,
      overdueMinor,
    },
    funnel: [
      { label: "Total Leads", count: totalLeads },
      { label: "Contacted", count: contacted },
      { label: "Counselled", count: counselled },
      { label: "Offered", count: offered },
      { label: "Enrolled", count: enrolled },
    ],
    counsellors: managers.map((mgr) => {
      const assigned = mgr.assignedLeads.length;
      const mgrEnrolled = mgr.assignedLeads.filter((l) => l.status === "ADMITTED").length;
      return {
        id: mgr.id,
        name: nonEmpty(mgr.user.name, "Admissions Counsellor"),
        leads: assigned,
        sessions: mgr.assignedLeads.filter((l) =>
          ["COUNSELLING_SCHEDULED", "INTERESTED", "APPLIED", "ADMITTED"].includes(l.status)
        ).length,
        enrolments: Math.min(assigned, mgrEnrolled),
        revenueMinor: totalLeads > 0 ? Math.round((capturedMinor * Math.max(mgrEnrolled, 0)) / Math.max(enrolled, 1)) : 0,
      };
    }),
  };
}

export async function getAdminAudit() {
  const events = await prisma.auditEvent.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  return {
    events: events.map((evt) => ({
      id: evt.id,
      at: iso(evt.createdAt),
      actor: nonEmpty(evt.user?.name || evt.user?.email, "System"),
      action: nonEmpty(evt.action, "EVENT"),
      target: nonEmpty(
        evt.entityId ? `${evt.entityType}:${evt.entityId}` : evt.entityType,
        "Academy"
      ),
      summary: nonEmpty(
        evt.detailsJson || `${evt.action} on ${evt.entityType}`,
        evt.action
      ),
      requestId: evt.id,
    })),
  };
}

function mapCategoryToSection(
  category: string
): "leads" | "offers" | "finance" | "programmes" | "reports" | "audit" {
  switch (category.toUpperCase()) {
    case "FINANCE":
    case "PAYROLL":
      return "finance";
    case "LEADS":
      return "leads";
    case "OFFERS":
      return "offers";
    case "ACADEMIC":
      return "programmes";
    case "REPORTS":
      return "reports";
    default:
      return "audit";
  }
}

export async function getAdminNotificationsPayload(userId: string) {
  const [userNotifications, templates, deliveryLogs] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notificationTemplate.findMany({
      orderBy: { code: "asc" },
    }),
    prisma.notificationDeliveryLog.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    notifications: userNotifications.map((n) => ({
      id: n.id,
      title: nonEmpty(`${n.title}: ${n.message}`, n.title),
      at: iso(n.createdAt),
      read: Boolean(n.isRead),
      section: mapCategoryToSection(n.category),
    })),
    templates: templates.map((t) => ({
      id: t.id,
      name: t.code,
      code: t.code,
      channel: t.channel,
      subject: t.subject,
      body: t.bodyTemplate,
      variables: "",
      isActive: t.isActive,
    })),
    deliveryLogs: deliveryLogs.map((log) => ({
      id: log.id,
      channel: log.channel,
      status: log.status,
      provider: log.provider,
      providerMessageId: log.providerMessageId,
      errorReason: log.errorMessage,
      attemptedAt: log.createdAt,
      recipientName: log.recipientContact,
      recipientRole: "RECIPIENT",
      eventType: log.eventType,
      subject: log.renderedSubject || "—",
    })),
    rules: [],
  };
}

export async function getAdminOperations() {
  const events = await prisma.auditEvent.findMany({
    where: { entityType: "AdminOperation" },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return {
    operations: events.map((evt) => {
      let message = `${evt.action} completed`;
      let resourceId: string | null = evt.entityId || null;
      if (evt.detailsJson) {
        try {
          const parsed = JSON.parse(evt.detailsJson) as {
            message?: string;
            resourceId?: string | null;
          };
          if (parsed.message) message = parsed.message;
          if (parsed.resourceId !== undefined) resourceId = parsed.resourceId;
        } catch {
          // ignore
        }
      }
      return {
        requestId: evt.entityId || evt.id,
        status: "succeeded" as const,
        resourceId,
        message: nonEmpty(message, "Completed"),
      };
    }),
  };
}

export async function getAdminSearch(query: string) {
  const q = query.trim();
  const [leads, courses] = await Promise.all([
    prisma.lead.findMany({
      where: q
        ? {
            OR: [
              { fullName: { contains: q } },
              { email: { contains: q } },
            ],
          }
        : undefined,
      take: 10,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.course.findMany({
      where: q
        ? {
            OR: [{ title: { contains: q } }, { code: { contains: q } }],
          }
        : undefined,
      take: 10,
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    results: [
      ...leads.map((l) => ({
        id: l.id,
        label: nonEmpty(l.fullName, "Lead"),
        description: nonEmpty(`${l.email} · Stage: ${l.status}`, "Prospective student"),
        section: "leads" as const,
      })),
      ...courses.map((c) => ({
        id: c.id,
        label: nonEmpty(c.title, c.code),
        description: nonEmpty(`${c.code} · ${c.durationWeeks} weeks`, "Academy programme"),
        section: "programmes" as const,
      })),
    ],
  };
}

export async function getAdminExport(exportId: string) {
  return {
    id: nonEmpty(exportId, "export-report"),
    status: "ready" as const,
    downloadUrl: "/api/admin/reports",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}

export async function executeAdminCommand(
  command: Record<string, unknown>,
  requestId: string,
  user: { id: string; name: string },
  ipAddress: string | null
) {
  const reqId = nonEmpty(requestId, `cmd-${Date.now()}`);
  const type = String(command.type || "");
  let resourceId: string | null = null;
  let message = "Command processed";

  switch (type) {
    case "lead.move": {
      const leadId = String(command.leadId || "");
      const stage = String(command.stage || "new") as LeadStage;
      const mapped = mapStageToPrismaStatus(stage);
      const lead = await prisma.lead.update({
        where: { id: leadId },
        data: { status: mapped.status, isLost: mapped.isLost },
      });
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          actionType: "STAGE_CHANGE",
          notes: `Stage moved to ${stage}`,
          createdBy: user.name,
        },
      });
      await logAuditEvent({
        userId: user.id,
        action: "ADMIN_LEAD_MOVE",
        entityType: "Lead",
        entityId: lead.id,
        details: { stage, requestId: reqId },
        ipAddress,
      });
      resourceId = lead.id;
      message = `Moved lead to ${stage}`;
      break;
    }

    case "offer.decide": {
      const offerId = String(command.offerId || "");
      const decision = String(command.decision || "approved") === "approved"
        ? "APPROVED"
        : "REJECTED";
      const reason = String(command.reason || "Reviewed by Administrator");
      const updated = await prisma.financialApprovalRequest.update({
        where: { id: offerId },
        data: {
          status: decision,
          reviewedById: user.id,
          reviewedAt: new Date(),
          reviewNotes: reason,
        },
      });
      resourceId = updated.id;
      message = `Offer ${decision.toLowerCase()}`;
      break;
    }

    case "proof.review": {
      const proofId = String(command.proofId || "");
      const phase = String(command.phase || "first");
      const decision = String(command.decision || "approved");
      const reason = String(command.reason || "Reviewed");
      if (decision === "rejected") {
        await prisma.studentPayment.update({
          where: { id: proofId },
          data: {
            verificationStatus: "REVERSED",
            verifiedById: user.id,
            verifiedAt: new Date(),
            notes: reason,
          },
        });
        message = "Payment proof rejected";
      } else if (phase === "first") {
        await prisma.studentPayment.update({
          where: { id: proofId },
          data: {
            verifiedById: user.id,
            notes: reason,
          },
        });
        await logAuditEvent({
          userId: user.id,
          action: "PROOF_FIRST_REVIEW",
          entityType: "PaymentProof",
          entityId: proofId,
          details: { phase, reason },
          ipAddress,
        });
        message = "Primary proof review recorded";
      } else {
        await prisma.studentPayment.update({
          where: { id: proofId },
          data: {
            verificationStatus: "CONFIRMED",
            verifiedById: user.id,
            verifiedAt: new Date(),
            notes: reason,
          },
        });
        message = "Payment proof verified";
      }
      resourceId = proofId;
      break;
    }

    case "refund.request": {
      const paymentId = String(command.paymentId || "");
      const amountMinor = Number(command.amountMinor || 0);
      const reason = String(command.reason || "Admin refund request");
      const payment = await prisma.studentPayment.findUnique({
        where: { id: paymentId },
      });
      if (!payment) {
        throw new AdminPanelHttpError(404, "Payment not found");
      }
      const created = await prisma.refundRequest.create({
        data: {
          studentPaymentId: payment.id,
          studentProfileId: payment.studentProfileId,
          requestedAmount: Number((amountMinor / 100).toFixed(2)),
          reason,
          status: "REQUESTED",
          requestedById: user.id,
        },
      });
      resourceId = created.id;
      message = "Refund request submitted";
      break;
    }

    case "refund.decide": {
      const refundId = String(command.refundId || "");
      const decision = String(command.decision || "approved") === "approved"
        ? "APPROVED"
        : "REJECTED";
      const reason = String(command.reason || "Reviewed");
      await prisma.refundRequest.update({
        where: { id: refundId },
        data: {
          status: decision,
          reviewedById: user.id,
          reviewedAt: new Date(),
          reviewNotes: reason,
        },
      });
      resourceId = refundId;
      message = `Refund request ${decision.toLowerCase()}`;
      break;
    }

    case "refund.execute": {
      const refundId = String(command.refundId || "");
      const rr = await prisma.refundRequest.findUnique({
        where: { id: refundId },
      });
      if (!rr) {
        throw new AdminPanelHttpError(404, "Refund request not found");
      }
      const refund = await prisma.refund.upsert({
        where: { refundRequestId: rr.id },
        update: { status: "CONFIRMED", executedAt: new Date() },
        create: {
          refundRequestId: rr.id,
          studentPaymentId: rr.studentPaymentId,
          amount: rr.requestedAmount,
          status: "CONFIRMED",
          executedById: user.id,
          externalReference: `ADM-REF-${Date.now()}`,
        },
      });
      resourceId = refund.id;
      message = "Refund executed";
      break;
    }

    case "ledger.reconcile": {
      const entryId = String(command.entryId || "");
      const providerReference = String(command.providerReference || "");
      const reason = String(command.reason || "Reconciled by Admin");
      await prisma.studentPayment.update({
        where: { id: entryId },
        data: {
          externalReference: providerReference,
          notes: reason,
        },
      });
      resourceId = entryId;
      message = "Ledger entry reconciled";
      break;
    }

    case "cms.save": {
      const programmeId = String(command.programmeId || "");
      await logAuditEvent({
        userId: user.id,
        action: "CMS_SAVE",
        entityType: "ProgrammeCms",
        entityId: programmeId,
        details: { packages: command.packages, baseVersionId: command.baseVersionId },
        ipAddress,
      });
      resourceId = programmeId;
      message = "Programme packages saved";
      break;
    }

    case "cms.publish": {
      const programmeId = String(command.programmeId || "");
      await prisma.course.update({
        where: { id: programmeId },
        data: { isPublished: true },
      });
      resourceId = programmeId;
      message = "Programme published";
      break;
    }

    case "cms.rebuild": {
      const programmeId = String(command.programmeId || "");
      await logAuditEvent({
        userId: user.id,
        action: "CMS_REBUILD",
        entityType: "ProgrammeCms",
        entityId: programmeId,
        details: { requestId: reqId },
        ipAddress,
      });
      resourceId = programmeId;
      message = "Programme catalogue rebuilt";
      break;
    }

    case "notification.read": {
      const notificationId = String(command.notificationId || "");
      await prisma.notification.updateMany({
        where: { id: notificationId, userId: user.id },
        data: { isRead: true, readAt: new Date() },
      });
      resourceId = notificationId;
      message = "Notification marked read";
      break;
    }

    case "reports.export": {
      resourceId = `export-${Date.now()}`;
      message = "Export generated";
      break;
    }

    default:
      throw new AdminPanelHttpError(400, `Unsupported admin command: ${type}`);
  }

  await logAuditEvent({
    userId: user.id,
    action: `ADMIN_CMD_${type.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`,
    entityType: "AdminOperation",
    entityId: reqId,
    details: { resourceId, message },
    ipAddress,
  });

  return {
    requestId: reqId,
    status: "succeeded" as const,
    resourceId,
    message,
  };
}

export async function handleAdminLogout() {
  await clearSessionCookie();
  return new NextResponse(null, { status: 204 });
}
