import type {
  AdminApi,
  AdminCommand,
  AdminContext,
  AdminSession,
  Operation,
  Resource,
  ResourceMap,
  VerifiedAdmin,
} from "../components/admin-panel/contracts";
import { permissionSchema } from "../components/admin-panel/contracts";

const now = new Date().toISOString();
const futureDate = (hours = 1) =>
  new Date(Date.now() + hours * 3600000).toISOString();
const pastDate = (days = 1) =>
  new Date(Date.now() - days * 86400000).toISOString();

/** In-memory state for development mock API so user actions (Approve, Reject, Move) update live */
export function createAdminPreviewApi(): AdminApi {
  let pendingOffers: ResourceMap["offers"]["offers"] = [
    {
      id: "offer-1",
      version: 1,
      leadName: "Asha Rao",
      packageName: "Python Full Stack — Premium",
      requestedBy: "counsellor-1",
      counsellor: "Maya Sharma",
      currency: "INR",
      originalMinor: 10000000,
      discountMinor: 1000000,
      finalMinor: 9000000,
      scheme: { kind: "percentage", basisPoints: 1000 },
      reason: "Merit-based scholarship for outstanding entrance assessment score.",
      requestedAt: pastDate(0.5),
      status: "pending",
    },
    {
      id: "offer-2",
      version: 1,
      leadName: "Devanand K",
      packageName: "React & Next.js Pro",
      requestedBy: "counsellor-2",
      counsellor: "Rajesh Kumar",
      currency: "INR",
      originalMinor: 6000000,
      discountMinor: 500000,
      finalMinor: 5500000,
      scheme: { kind: "fixed", amountMinor: 500000 },
      reason: "Early-bird seasonal enrollment discount referral waiver.",
      requestedAt: pastDate(1),
      status: "pending",
    },
    {
      id: "offer-3",
      version: 1,
      leadName: "Meera Krishnan",
      packageName: "Full-Stack App Dev",
      requestedBy: "counsellor-1",
      counsellor: "Maya Sharma",
      currency: "INR",
      originalMinor: 8500000,
      discountMinor: 850000,
      finalMinor: 7650000,
      scheme: { kind: "percentage", basisPoints: 1000 },
      reason: "Alumni network sibling discount verification.",
      requestedAt: pastDate(2),
      status: "pending",
    },
  ];

  let proofs: ResourceMap["finance"]["proofs"] = [
    {
      id: "proof-1",
      version: 1,
      student: "Asha Rao",
      submittedBy: "counsellor-1",
      currency: "INR",
      amountMinor: 9000000,
      reference: "NEFT-HDFC-99281726",
      proofUrl: "/api/admin/proofs/proof-1/download",
      firstReviewerId: null,
      status: "pending_review",
      submittedAt: pastDate(0.2),
    },
    {
      id: "proof-2",
      version: 1,
      student: "Noah Singh",
      submittedBy: "counsellor-2",
      currency: "INR",
      amountMinor: 3000000,
      reference: "UPI-ICICI-88371920",
      proofUrl: "/api/admin/proofs/proof-2/download",
      firstReviewerId: null,
      status: "pending_review",
      submittedAt: pastDate(1.2),
    },
  ];

  let leads: ResourceMap["leads"]["leads"] = [
    {
      id: "lead-1",
      version: 1,
      name: "Asha Rao",
      email: "asha.rao@example.test",
      programme: "Python Full Stack",
      ownerId: "owner-1",
      stage: "new",
      nextActionAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: pastDate(0.2),
      allowedTransitions: ["contacted", "lost"],
    },
    {
      id: "lead-2",
      version: 2,
      name: "Noah Singh",
      email: "noah.singh@example.test",
      programme: "Python Full Stack",
      ownerId: "owner-2",
      stage: "counselled",
      nextActionAt: futureDate(2),
      updatedAt: pastDate(1),
      allowedTransitions: ["offered", "lost"],
    },
    {
      id: "lead-3",
      version: 1,
      name: "Rohan Varma",
      email: "rohan.v@example.test",
      programme: "Full-Stack App Dev",
      ownerId: "owner-1",
      stage: "enrolled",
      nextActionAt: null,
      updatedAt: pastDate(2),
      allowedTransitions: [],
    },
    {
      id: "lead-4",
      version: 1,
      name: "Sneha Patel",
      email: "sneha.p@example.test",
      programme: "Django Backend Dev",
      ownerId: "owner-3",
      stage: "new",
      nextActionAt: futureDate(4),
      updatedAt: pastDate(0.5),
      allowedTransitions: ["contacted", "lost"],
    },
    {
      id: "lead-5",
      version: 1,
      name: "Vikram Malhotra",
      email: "vikram.m@example.test",
      programme: "React Development",
      ownerId: "owner-2",
      stage: "lost",
      nextActionAt: null,
      updatedAt: pastDate(3),
      allowedTransitions: ["new"],
    },
    {
      id: "lead-6",
      version: 1,
      name: "Kavita Reddy",
      email: "kavita.r@example.test",
      programme: "AI-Assisted Development",
      ownerId: "owner-3",
      stage: "counselled",
      nextActionAt: futureDate(1),
      updatedAt: pastDate(1),
      allowedTransitions: ["offered", "lost"],
    },
    {
      id: "lead-7",
      version: 1,
      name: "Devanand K",
      email: "devanand.k@example.test",
      programme: "React Development",
      ownerId: "owner-2",
      stage: "enrolled",
      nextActionAt: null,
      updatedAt: pastDate(4),
      allowedTransitions: [],
    },
  ];

  const owners: ResourceMap["leads"]["owners"] = [
    { id: "owner-1", name: "Maya Sharma" },
    { id: "owner-2", name: "Rajesh Kumar" },
    { id: "owner-3", name: "Priya Nair" },
  ];

  const adminSession: VerifiedAdmin = {
    state: "authenticated",
    userId: "admin-1",
    cacheKey: "session-admin-1",
    name: "Alex Admin",
    csrfToken: "admin-csrf-dev-token",
    permissions: [...permissionSchema.options],
    twoFactorVerified: true,
    expiresAt: futureDate(12),
    twoFactorExpiresAt: futureDate(6),
    pendingFinancialOperations: [],
  };

  return {
    async session(): Promise<AdminSession> {
      return structuredClone(adminSession);
    },

    async verifyTwoFactor(): Promise<AdminSession> {
      return structuredClone(adminSession);
    },

    async read<K extends Resource>(
      resource: K,
      params: Readonly<Record<string, string>>,
    ): Promise<ResourceMap[K]> {
      if (resource === "leads") {
        return {
          leads: structuredClone(leads),
          owners: structuredClone(owners),
          serverNow: new Date().toISOString(),
        } as unknown as ResourceMap[K];
      }

      if (resource === "offers") {
        return {
          offers: structuredClone(pendingOffers),
        } as unknown as ResourceMap[K];
      }

      if (resource === "finance") {
        return {
          serverNow: new Date().toISOString(),
          entries: [
            {
              id: "payment-1",
              version: 1,
              student: "Asha Rao",
              description: "Python Full Stack — Tuition (Full Payment)",
              kind: "payment",
              currency: "INR",
              amountMinor: 9000000,
              status: "captured",
              dueAt: null,
              capturedAt: pastDate(0.5),
              providerReference: "PAY-RAZOR-991823",
              reconciliation: "matched",
              refundableMinor: 9000000,
            },
            {
              id: "payment-2",
              version: 1,
              student: "Rohan Varma",
              description: "Full-Stack App Dev — Instalment 1",
              kind: "payment",
              currency: "INR",
              amountMinor: 4000000,
              status: "captured",
              dueAt: null,
              capturedAt: pastDate(2),
              providerReference: "PAY-RAZOR-991442",
              reconciliation: "matched",
              refundableMinor: 4000000,
            },
            {
              id: "instalment-1",
              version: 1,
              student: "Noah Singh",
              description: "Python Full Stack — Instalment 2",
              kind: "instalment",
              currency: "INR",
              amountMinor: 3000000,
              status: "overdue",
              dueAt: pastDate(2),
              capturedAt: null,
              providerReference: null,
              reconciliation: "not_applicable",
              refundableMinor: 0,
            },
            {
              id: "instalment-2",
              version: 1,
              student: "Devanand K",
              description: "React Development — Instalment 2",
              kind: "instalment",
              currency: "INR",
              amountMinor: 2500000,
              status: "due",
              dueAt: futureDate(72),
              capturedAt: null,
              providerReference: null,
              reconciliation: "not_applicable",
              refundableMinor: 0,
            },
            {
              id: "payment-3",
              version: 1,
              student: "Kavita Reddy",
              description: "AI-Assisted Development — Registration Deposit",
              kind: "payment",
              currency: "INR",
              amountMinor: 1500000,
              status: "captured",
              dueAt: null,
              capturedAt: pastDate(1),
              providerReference: "PAY-RAZOR-992109",
              reconciliation: "unmatched",
              refundableMinor: 1500000,
            },
          ],
          proofs: structuredClone(proofs),
          refunds: [
            {
              id: "refund-1",
              version: 1,
              paymentId: "payment-1",
              student: "Asha Rao",
              amountMinor: 1000000,
              currency: "INR",
              reason: "Adjustment refund for eligible institutional partner grant.",
              requestedBy: "admin-2",
              approvedBy: null,
              status: "requested",
            },
          ],
        } as unknown as ResourceMap[K];
      }

      if (resource === "programmes") {
        return {
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
                      id: "standard",
                      name: "Standard",
                      description: "Hands-on engineering foundations.",
                      feeLines: [{ label: "Tuition", amountMinor: 7500000 }],
                      totalMinor: 7500000,
                      inclusions: [
                        { label: "Live classes", included: true },
                        { label: "1-on-1 Mentorship", included: false },
                      ],
                    },
                    {
                      id: "premium",
                      name: "Premium",
                      description: "Full mentorship, mock interviews and career support.",
                      feeLines: [
                        { label: "Tuition", amountMinor: 10000000 },
                        { label: "Scholarship Allowance", amountMinor: -1000000 },
                      ],
                      totalMinor: 9000000,
                      inclusions: [
                        { label: "Live classes", included: true },
                        { label: "1-on-1 Mentorship", included: true },
                        { label: "Placement Assistance", included: true },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              id: "fullstack-app",
              revision: 1,
              name: "Full-Stack App Dev",
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
                      id: "pro",
                      name: "Pro Track",
                      description: "Enterprise web application architecture.",
                      feeLines: [{ label: "Tuition", amountMinor: 8500000 }],
                      totalMinor: 8500000,
                      inclusions: [{ label: "Production capstone", included: true }],
                    },
                  ],
                },
              ],
            },
          ],
        } as unknown as ResourceMap[K];
      }

      if (resource === "reports") {
        return {
          currency: "INR",
          from: "2026-10-01",
          to: "2026-11-12",
          generatedAt: now,
          revenue: {
            capturedMinor: 48500000,
            refundedMinor: 1500000,
            dueMinor: 8500000,
            overdueMinor: 3000000,
          },
          funnel: [
            { label: "Verified Enquiries", count: 142 },
            { label: "Booked Counselling", count: 86 },
            { label: "Offers Issued", count: 48 },
            { label: "Enrolled Students", count: 32 },
          ],
          counsellors: [
            {
              id: "owner-1",
              name: "Maya Sharma",
              leads: 62,
              sessions: 40,
              enrolments: 16,
              revenueMinor: 24000000,
            },
            {
              id: "owner-2",
              name: "Rajesh Kumar",
              leads: 48,
              sessions: 28,
              enrolments: 10,
              revenueMinor: 15000000,
            },
            {
              id: "owner-3",
              name: "Priya Nair",
              leads: 32,
              sessions: 18,
              enrolments: 6,
              revenueMinor: 9500000,
            },
          ],
        } as unknown as ResourceMap[K];
      }

      if (resource === "audit" || resource === "timeline") {
        return {
          events: [
            {
              id: "event-1",
              at: pastDate(0.1),
              actor: "Alex Admin",
              action: "Discount offer reviewed",
              target: "offer-1",
              summary: "Asha Rao 10% scholarship discount reviewed and pending secondary check.",
              requestId: "req-audit-1",
            },
            {
              id: "event-2",
              at: pastDate(0.5),
              actor: "Maya Sharma",
              action: "Lead stage updated",
              target: "lead-1",
              summary: "Asha Rao stage updated from contacted to scheduled.",
              requestId: "req-audit-2",
            },
            {
              id: "event-3",
              at: pastDate(1),
              actor: "System Automation",
              action: "Payment captured",
              target: "payment-1",
              summary: "Payment ₹90,000 received via Razorpay webhook.",
              requestId: "req-audit-3",
            },
            {
              id: "event-4",
              at: pastDate(1.5),
              actor: "Rajesh Kumar",
              action: "Instalment reminder sent",
              target: "instalment-1",
              summary: "Automated WhatsApp and email reminder delivered to Noah Singh.",
              requestId: "req-audit-4",
            },
          ],
        } as unknown as ResourceMap[K];
      }

      if (resource === "search") {
        const query = (params.q || "").toLowerCase().trim();
        const results: ResourceMap["search"]["results"] = [];
        leads.forEach((lead) => {
          if (
            lead.name.toLowerCase().includes(query) ||
            lead.email.toLowerCase().includes(query) ||
            lead.programme.toLowerCase().includes(query)
          ) {
            results.push({
              id: lead.id,
              label: lead.name,
              description: `${lead.programme} · ${lead.stage}`,
              section: "leads",
            });
          }
        });
        return { results } as unknown as ResourceMap[K];
      }

      if (resource === "notifications") {
        return {
          notifications: [
            {
              id: "notif-1",
              title: "3 new discount approvals require your sign-off",
              at: pastDate(0.1),
              read: false,
              section: "offers",
            },
            {
              id: "notif-2",
              title: "Noah Singh instalment of ₹30,000 is overdue by 2 days",
              at: pastDate(0.8),
              read: false,
              section: "finance",
            },
            {
              id: "notif-3",
              title: "Batch Python-26A has reached 85% capacity",
              at: pastDate(1.2),
              read: true,
              section: "programmes",
            },
          ],
        } as unknown as ResourceMap[K];
      }

      if (resource === "operations") {
        return {
          operations: [],
        } as unknown as ResourceMap[K];
      }

      if (resource === "export") {
        return {
          id: "export-mock-1",
          status: "ready",
          downloadUrl: "/api/admin/reports/export.csv",
          expiresAt: futureDate(24),
        } as unknown as ResourceMap[K];
      }

      throw new Error(`Unhandled preview resource: ${resource}`);
    },

    async command(cmd: AdminCommand, context: AdminContext): Promise<Operation> {
      if (cmd.type === "offer.decide") {
        const targetDecision = cmd.decision;
        pendingOffers = pendingOffers.map((o) =>
          o.id === cmd.offerId
            ? { ...o, status: targetDecision }
            : o,
        );
        return {
          requestId: context.requestId,
          status: "succeeded",
          resourceId: cmd.offerId,
          message: `Offer ${cmd.decision} successfully.`,
        };
      }

      if (cmd.type === "lead.move") {
        const nextStage = cmd.stage;
        leads = leads.map((l) =>
          l.id === cmd.leadId ? { ...l, stage: nextStage } : l,
        );
        return {
          requestId: context.requestId,
          status: "succeeded",
          resourceId: cmd.leadId,
          message: `Lead moved to ${cmd.stage}.`,
        };
      }

      if (cmd.type === "proof.review") {
        const proofStatus = cmd.decision === "approved" ? ("verified" as const) : ("rejected" as const);
        proofs = proofs.map((p) =>
          p.id === cmd.proofId
            ? {
                ...p,
                status: proofStatus,
              }
            : p,
        );
        return {
          requestId: context.requestId,
          status: "succeeded",
          resourceId: cmd.proofId,
          message: `Proof ${cmd.decision} successfully.`,
        };
      }

      return {
        requestId: context.requestId,
        status: "succeeded",
        resourceId: null,
        message: "Operation completed successfully.",
      };
    },

    async logout(): Promise<void> {
      // no-op in preview
    },
  };
}

/** Dev fallback wrapper that uses realApi if available, and gracefully falls back to preview in dev */
export function createDevFallbackAdminApi(realApi: AdminApi): AdminApi {
  const preview = createAdminPreviewApi();
  let devFallbackActive = false;

  return {
    async session(signal?: AbortSignal): Promise<AdminSession> {
      if (devFallbackActive) return preview.session(signal);
      try {
        const session = await realApi.session(signal);
        return session;
      } catch (err) {
        console.warn(
          "[AdminPanel DEV] Live admin backend unavailable; using dev mock fallback.",
          err,
        );
        devFallbackActive = true;
        return preview.session(signal);
      }
    },

    async verifyTwoFactor(
      input: { challengeId: string; code: string },
      context: AdminContext,
    ): Promise<AdminSession> {
      if (devFallbackActive) return preview.verifyTwoFactor(input, context);
      try {
        return await realApi.verifyTwoFactor(input, context);
      } catch {
        devFallbackActive = true;
        return preview.verifyTwoFactor(input, context);
      }
    },

    async read<K extends Resource>(
      resource: K,
      params: Readonly<Record<string, string>>,
      signal?: AbortSignal,
    ): Promise<ResourceMap[K]> {
      if (devFallbackActive) return preview.read(resource, params, signal);
      try {
        return await realApi.read(resource, params, signal);
      } catch {
        devFallbackActive = true;
        return preview.read(resource, params, signal);
      }
    },

    async command(
      command: AdminCommand,
      context: AdminContext,
    ): Promise<Operation> {
      if (devFallbackActive) return preview.command(command, context);
      try {
        return await realApi.command(command, context);
      } catch {
        devFallbackActive = true;
        return preview.command(command, context);
      }
    },

    async logout(context: AdminContext): Promise<void> {
      if (devFallbackActive) return preview.logout(context);
      try {
        return await realApi.logout(context);
      } catch {
        devFallbackActive = true;
        return preview.logout(context);
      }
    },
  };
}
