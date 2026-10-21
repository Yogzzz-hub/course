import { z } from "zod";

const id = z.string().trim().min(1).max(200);
const text = z.string().trim().min(1).max(4000);
const minor = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const instant = z.iso.datetime({ offset: true });
const version = z.number().int().positive();
const reason = z
  .string()
  .trim()
  .min(10, "Provide a reason of at least 10 characters.")
  .max(1200);
export const secureLink = z.string().refine((value) => {
  if (/^\/(?!\/)/.test(value) && !/[\\\s]/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}, "A local path or HTTPS URL is required.");
export const permissionSchema = z.enum([
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
]);
export type Permission = z.infer<typeof permissionSchema>;
export const adminSessionSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("anonymous") }),
  z.object({
    state: z.literal("two_factor_required"),
    challengeId: id,
    csrfToken: id,
    maskedEmail: text,
    expiresAt: instant,
  }),
  z.object({
    state: z.literal("authenticated"),
    userId: id,
    cacheKey: id,
    name: text,
    csrfToken: id,
    permissions: z.array(permissionSchema),
    twoFactorVerified: z.literal(true),
    expiresAt: instant,
    twoFactorExpiresAt: instant,
    pendingFinancialOperations: z.array(id).max(50),
  }),
]);
export type AdminSession = z.infer<typeof adminSessionSchema>;
export type VerifiedAdmin = Extract<AdminSession, { state: "authenticated" }>;
export const stageSchema = z.enum([
  "new",
  "contacted",
  "scheduled",
  "counselled",
  "offered",
  "payment_pending",
  "enrolled",
  "lost",
]);
export const leadSchema = z.object({
  id,
  version,
  name: text,
  email: z.email(),
  programme: text,
  ownerId: id.nullable(),
  stage: stageSchema,
  nextActionAt: instant.nullable(),
  updatedAt: instant,
  allowedTransitions: z.array(stageSchema),
});
export const leadsSchema = z.object({
  leads: z.array(leadSchema),
  owners: z.array(z.object({ id, name: text })),
  serverNow: instant,
});
export const auditEventSchema = z.object({
  id,
  at: instant,
  actor: text,
  action: text,
  target: text,
  summary: text,
  requestId: id,
});
export const auditSchema = z.object({ events: z.array(auditEventSchema) });
export const offersSchema = z.object({
  offers: z.array(
    z
      .object({
        id,
        version,
        leadName: text,
        packageName: text,
        requestedBy: id,
        counsellor: text,
        currency: z.string().regex(/^[A-Z]{3}$/),
        originalMinor: minor,
        discountMinor: minor,
        finalMinor: minor,
        scheme: z.discriminatedUnion("kind", [
          z.object({ kind: z.literal("fixed"), amountMinor: minor }),
          z.object({
            kind: z.literal("percentage"),
            basisPoints: z.number().int().min(0).max(10000),
          }),
        ]),
        reason: text,
        requestedAt: instant,
        status: z.enum(["pending", "approved", "rejected"]),
      })
      .refine(
        (value) =>
          value.discountMinor <= value.originalMinor &&
          value.originalMinor - value.discountMinor === value.finalMinor &&
          (value.scheme.kind === "fixed"
            ? value.scheme.amountMinor === value.discountMinor
            : Number(
                (BigInt(value.originalMinor) *
                  BigInt(value.scheme.basisPoints) +
                  5000n) /
                  10000n,
              ) === value.discountMinor),
        "Inconsistent offer prices.",
      ),
  ),
});
export const ledgerEntrySchema = z
  .object({
    id,
    version,
    student: text,
    description: text,
    kind: z.enum(["payment", "instalment"]),
    currency: z.string().regex(/^[A-Z]{3}$/),
    amountMinor: minor,
    status: z.enum(["captured", "due", "overdue", "processing", "refunded"]),
    dueAt: instant.nullable(),
    capturedAt: instant.nullable(),
    providerReference: z.string().max(200).nullable(),
    reconciliation: z.enum(["matched", "unmatched", "not_applicable"]),
    refundableMinor: minor,
  })
  .refine(
    (value) =>
      value.refundableMinor <= value.amountMinor &&
      (value.status !== "captured" || !!value.capturedAt),
    "Invalid ledger record.",
  );
export const proofSchema = z
  .object({
    id,
    version,
    student: text,
    submittedBy: id,
    amountMinor: minor,
    currency: z.string().regex(/^[A-Z]{3}$/),
    reference: text,
    proofUrl: secureLink,
    firstReviewerId: id.nullable(),
    status: z.enum([
      "pending_review",
      "pending_secondary",
      "verified",
      "rejected",
    ]),
    submittedAt: instant,
  })
  .refine(
    (value) => value.status !== "pending_secondary" || !!value.firstReviewerId,
    "Missing primary reviewer.",
  );
export const refundSchema = z
  .object({
    id,
    version,
    paymentId: id,
    student: text,
    amountMinor: minor.positive(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    reason: text,
    requestedBy: id,
    approvedBy: id.nullable(),
    status: z.enum([
      "requested",
      "approved",
      "processing",
      "refunded",
      "rejected",
      "failed",
    ]),
  })
  .refine(
    (value) =>
      !["approved", "processing", "refunded"].includes(value.status) ||
      (!!value.approvedBy && value.approvedBy !== value.requestedBy),
    "An independent refund approval is required.",
  );
export const financeSchema = z.object({
  entries: z.array(ledgerEntrySchema),
  proofs: z.array(proofSchema),
  refunds: z.array(refundSchema),
  serverNow: instant,
});
export const cmsPackageSchema = z
  .object({
    id,
    name: text,
    description: text,
    feeLines: z
      .array(
        z.object({
          label: text,
          amountMinor: z
            .number()
            .int()
            .min(-Number.MAX_SAFE_INTEGER)
            .max(Number.MAX_SAFE_INTEGER),
        }),
      )
      .min(1),
    totalMinor: minor,
    inclusions: z.array(z.object({ label: text, included: z.boolean() })),
  })
  .refine((value) => {
    let sum = 0;
    for (const line of value.feeLines) {
      sum += line.amountMinor;
      if (!Number.isSafeInteger(sum)) return false;
    }
    return sum === value.totalMinor;
  }, "Fee lines must sum to the package total.");
export const programmesSchema = z.object({
  programmes: z.array(
    z
      .object({
        id,
        revision: version,
        name: text,
        currency: z.string().regex(/^[A-Z]{3}$/),
        publishedVersionId: id.nullable(),
        buildStatus: z.enum(["idle", "queued", "running", "live", "failed"]),
        versions: z
          .array(
            z.object({
              id,
              number: version,
              status: z.enum(["draft", "published", "archived"]),
              createdAt: instant,
              packages: z.array(cmsPackageSchema).min(1),
            }),
          )
          .min(1),
      })
      .refine(
        (value) =>
          new Set(value.versions.map((item) => item.id)).size ===
            value.versions.length &&
          (!value.publishedVersionId ||
            value.versions.some(
              (item) =>
                item.id === value.publishedVersionId &&
                item.status === "published",
            )),
        "Invalid version history.",
      ),
  ),
});
export const reportsSchema = z
  .object({
    currency: z.string().regex(/^[A-Z]{3}$/),
    from: z.iso.date(),
    to: z.iso.date(),
    generatedAt: instant,
    revenue: z.object({
      capturedMinor: minor,
      refundedMinor: minor,
      dueMinor: minor,
      overdueMinor: minor,
    }),
    funnel: z.array(z.object({ label: text, count: minor })),
    counsellors: z.array(
      z
        .object({
          id,
          name: text,
          leads: minor,
          sessions: minor,
          enrolments: minor,
          revenueMinor: minor,
        })
        .refine(
          (value) => value.enrolments <= value.leads,
          "Invalid counsellor metrics.",
        ),
    ),
  })
  .refine((value) => value.to >= value.from, "Invalid reporting period.");
export const sectionSchema = z.enum([
  "leads",
  "offers",
  "finance",
  "programmes",
  "reports",
  "audit",
]);
export type AdminSection = z.infer<typeof sectionSchema>;
export const searchSchema = z.object({
  results: z.array(
    z.object({ id, label: text, description: text, section: sectionSchema }),
  ),
});
export const notificationsSchema = z.object({
  notifications: z.array(
    z.object({
      id,
      title: text,
      at: instant,
      read: z.boolean(),
      section: sectionSchema,
    }),
  ),
});
export const operationSchema = z.object({
  requestId: id,
  status: z.enum(["pending", "succeeded", "failed", "not_found"]),
  resourceId: id.nullable(),
  message: text,
});
export const operationsSchema = z.object({
  operations: z.array(operationSchema),
});
export const exportSchema = z
  .object({
    id,
    status: z.enum(["queued", "running", "ready", "failed"]),
    downloadUrl: secureLink.nullable(),
    expiresAt: instant.nullable(),
  })
  .refine(
    (value) =>
      value.status !== "ready" || (!!value.downloadUrl && !!value.expiresAt),
    "Missing export download.",
  );
export const adminCommandSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("lead.move"),
    leadId: id,
    stage: stageSchema,
    expectedVersion: version,
  }),
  z.object({
    type: z.literal("offer.decide"),
    offerId: id,
    decision: z.enum(["approved", "rejected"]),
    expectedVersion: version,
    reason,
  }),
  z.object({
    type: z.literal("proof.review"),
    proofId: id,
    phase: z.enum(["first", "second"]),
    decision: z.enum(["approved", "rejected"]),
    expectedVersion: version,
    reason,
  }),
  z.object({
    type: z.literal("refund.request"),
    paymentId: id,
    amountMinor: minor.positive(),
    expectedVersion: version,
    reason,
  }),
  z.object({
    type: z.literal("refund.decide"),
    refundId: id,
    decision: z.enum(["approved", "rejected"]),
    expectedVersion: version,
    reason,
  }),
  z.object({
    type: z.literal("refund.execute"),
    refundId: id,
    expectedVersion: version,
    reason,
  }),
  z.object({
    type: z.literal("ledger.reconcile"),
    entryId: id,
    providerReference: z.string().trim().min(3).max(200),
    expectedVersion: version,
    reason,
  }),
  z.object({
    type: z.literal("cms.save"),
    programmeId: id,
    baseVersionId: id,
    expectedRevision: version,
    packages: z.array(cmsPackageSchema).min(1),
  }),
  z.object({
    type: z.literal("cms.publish"),
    programmeId: id,
    versionId: id,
    expectedRevision: version,
  }),
  z.object({
    type: z.literal("cms.rebuild"),
    programmeId: id,
    expectedRevision: version,
  }),
  z.object({ type: z.literal("notification.read"), notificationId: id }),
  z
    .object({
      type: z.literal("reports.export"),
      from: z.iso.date(),
      to: z.iso.date(),
      format: z.literal("csv"),
    })
    .refine((value) => value.from <= value.to, "Invalid export period."),
]);
export type AdminCommand = z.infer<typeof adminCommandSchema>;
export const resourceSchemas = {
  leads: leadsSchema,
  offers: offersSchema,
  finance: financeSchema,
  programmes: programmesSchema,
  reports: reportsSchema,
  audit: auditSchema,
  timeline: auditSchema,
  search: searchSchema,
  notifications: notificationsSchema,
  operations: operationsSchema,
  export: exportSchema,
};
export type Resource = keyof typeof resourceSchemas;
export type ResourceMap = {
  [K in Resource]: z.infer<(typeof resourceSchemas)[K]>;
};
export type Lead = z.infer<typeof leadSchema>;
export type LeadStage = z.infer<typeof stageSchema>;
export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;
export type OfflineProof = z.infer<typeof proofSchema>;
export type Refund = z.infer<typeof refundSchema>;
export type CmsPackage = z.infer<typeof cmsPackageSchema>;
export type Operation = z.infer<typeof operationSchema>;
export interface AdminContext {
  csrfToken: string;
  requestId: string;
  sessionKey: string;
}
export interface AdminApi {
  session(signal?: AbortSignal): Promise<AdminSession>;
  verifyTwoFactor(
    input: { challengeId: string; code: string },
    context: AdminContext,
  ): Promise<AdminSession>;
  read<K extends Resource>(
    resource: K,
    params: Readonly<Record<string, string>>,
    signal?: AbortSignal,
  ): Promise<ResourceMap[K]>;
  command(command: AdminCommand, context: AdminContext): Promise<Operation>;
  logout(context: AdminContext): Promise<void>;
}
