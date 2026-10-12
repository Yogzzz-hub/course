import {
  permissionSchema,
  type VerifiedAdmin,
  type ResourceMap,
} from "../src/components/admin-panel/contracts";
export const futureAdmin = (hours = 1) =>
  new Date(Date.now() + hours * 3600000).toISOString();
const now = new Date().toISOString();
export const adminSession: VerifiedAdmin = {
  state: "authenticated",
  userId: "admin-1",
  cacheKey: "session-admin-1",
  name: "Alex Admin",
  csrfToken: "admin-csrf",
  permissions: [...permissionSchema.options],
  twoFactorVerified: true,
  expiresAt: futureAdmin(8),
  twoFactorExpiresAt: futureAdmin(2),
  pendingFinancialOperations: [],
};
export const adminLeads: ResourceMap["leads"] = {
  serverNow: now,
  owners: [
    { id: "owner-1", name: "Maya" },
    { id: "owner-2", name: "Raj" },
  ],
  leads: [
    {
      id: "lead-1",
      version: 1,
      name: "Asha Rao",
      email: "asha@example.test",
      programme: "Python Full Stack",
      ownerId: "owner-1",
      stage: "new",
      nextActionAt: new Date(Date.now() - 600000).toISOString(),
      updatedAt: now,
      allowedTransitions: ["contacted", "lost"],
    },
    {
      id: "lead-2",
      version: 2,
      name: "Noah Singh",
      email: "noah@example.test",
      programme: "Python Full Stack",
      ownerId: "owner-2",
      stage: "scheduled",
      nextActionAt: futureAdmin(),
      updatedAt: now,
      allowedTransitions: ["counselled", "lost"],
    },
  ],
};
export const adminAudit: ResourceMap["audit"] = {
  events: [
    {
      id: "event-1",
      at: now,
      actor: "Maya",
      action: "Lead created",
      target: "lead-1",
      summary: "Enquiry verified and assigned to Maya.",
      requestId: "audit-request-1",
    },
  ],
};
export const adminOffers: ResourceMap["offers"] = {
  offers: [
    {
      id: "offer-1",
      version: 1,
      leadName: "Asha Rao",
      packageName: "Premium",
      requestedBy: "counsellor-1",
      counsellor: "Maya",
      currency: "INR",
      originalMinor: 1000000,
      discountMinor: 100000,
      finalMinor: 900000,
      scheme: { kind: "percentage", basisPoints: 1000 },
      reason: "Approved alumni scholarship eligibility.",
      requestedAt: now,
      status: "pending",
    },
  ],
};
export const adminFinance: ResourceMap["finance"] = {
  serverNow: now,
  entries: [
    {
      id: "payment-1",
      version: 1,
      student: "Asha Rao",
      description: "Premium programme payment",
      kind: "payment",
      currency: "INR",
      amountMinor: 900000,
      status: "captured",
      dueAt: null,
      capturedAt: now,
      providerReference: "pay-provider-1",
      reconciliation: "unmatched",
      refundableMinor: 900000,
    },
    {
      id: "instalment-1",
      version: 1,
      student: "Noah Singh",
      description: "Second instalment",
      kind: "instalment",
      currency: "INR",
      amountMinor: 300000,
      status: "overdue",
      dueAt: new Date(Date.now() - 86400000).toISOString(),
      capturedAt: null,
      providerReference: null,
      reconciliation: "not_applicable",
      refundableMinor: 0,
    },
  ],
  proofs: [
    {
      id: "proof-1",
      version: 1,
      student: "Asha Rao",
      submittedBy: "counsellor-1",
      currency: "INR",
      amountMinor: 900000,
      reference: "BANK-TRANSFER-1",
      proofUrl: "/api/admin/proofs/proof-1/download",
      firstReviewerId: null,
      status: "pending_review",
      submittedAt: now,
    },
  ],
  refunds: [
    {
      id: "refund-1",
      version: 1,
      paymentId: "payment-1",
      student: "Asha Rao",
      amountMinor: 100000,
      currency: "INR",
      reason: "Eligible partial refund after course withdrawal.",
      requestedBy: "admin-2",
      approvedBy: null,
      status: "requested",
    },
  ],
};
export const adminProgrammes: ResourceMap["programmes"] = {
  programmes: [
    {
      id: "python",
      revision: 1,
      name: "Python Full Stack",
      currency: "INR",
      publishedVersionId: "version-1",
      buildStatus: "live",
      versions: [
        {
          id: "version-1",
          number: 1,
          status: "published",
          createdAt: now,
          packages: [
            {
              id: "premium",
              name: "Premium",
              description: "Live tuition with mentorship.",
              feeLines: [
                { label: "Tuition", amountMinor: 1000000 },
                { label: "Scholarship", amountMinor: -100000 },
              ],
              totalMinor: 900000,
              inclusions: [
                { label: "Mentorship", included: true },
                { label: "Portfolio review", included: false },
              ],
            },
          ],
        },
        {
          id: "version-2",
          number: 2,
          status: "draft",
          createdAt: now,
          packages: [
            {
              id: "premium",
              name: "Premium",
              description: "Updated live tuition with mentorship.",
              feeLines: [{ label: "Tuition", amountMinor: 1200000 }],
              totalMinor: 1200000,
              inclusions: [{ label: "Mentorship", included: true }],
            },
          ],
        },
      ],
    },
  ],
};
export const adminReports: ResourceMap["reports"] = {
  currency: "INR",
  from: "2026-10-01",
  to: "2026-10-12",
  generatedAt: now,
  revenue: {
    capturedMinor: 900000,
    refundedMinor: 100000,
    dueMinor: 300000,
    overdueMinor: 300000,
  },
  funnel: [
    { label: "Verified enquiries", count: 100 },
    { label: "Booked counselling", count: 50 },
    { label: "Offers accepted", count: 30 },
    { label: "Enrolled", count: 20 },
  ],
  counsellors: [
    {
      id: "owner-1",
      name: "Maya",
      leads: 60,
      sessions: 30,
      enrolments: 12,
      revenueMinor: 600000,
    },
    {
      id: "owner-2",
      name: "Raj",
      leads: 40,
      sessions: 20,
      enrolments: 8,
      revenueMinor: 300000,
    },
  ],
};
