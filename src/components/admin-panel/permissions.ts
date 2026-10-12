import type {
  AdminCommand,
  AdminSession,
  AdminSection,
  OfflineProof,
  Permission,
  Resource,
} from "./contracts";
export const sectionPermissions: Record<AdminSection, Permission> = {
  leads: "leads.read",
  offers: "offers.read",
  finance: "ledger.read",
  programmes: "cms.read",
  reports: "reports.read",
  audit: "audit.read",
};
export const resourcePermissions: Record<Resource, readonly Permission[]> = {
  leads: ["leads.read"],
  offers: ["offers.read"],
  finance: ["ledger.read"],
  programmes: ["cms.read"],
  reports: ["reports.read"],
  audit: ["audit.read"],
  timeline: ["leads.read", "audit.read"],
  search: ["search.read"],
  notifications: ["notifications.read"],
  operations: ["operations.read"],
  export: ["reports.read", "reports.export"],
};
export function hasPermission(
  session: AdminSession | undefined,
  permission: Permission,
  now = Date.now(),
) {
  return (
    session?.state === "authenticated" &&
    session.twoFactorVerified &&
    Date.parse(session.expiresAt) > now &&
    Date.parse(session.twoFactorExpiresAt) > now &&
    session.permissions.includes(permission)
  );
}
export function commandPermissions(
  command: AdminCommand,
): readonly Permission[] {
  switch (command.type) {
    case "lead.move":
      return ["leads.read", "leads.write"];
    case "offer.decide":
      return ["offers.read", "offers.decide", "operations.read"];
    case "proof.review":
      return [
        "ledger.read",
        command.phase === "first" ? "proofs.review" : "proofs.approve",
        "operations.read",
      ];
    case "refund.request":
      return ["ledger.read", "refunds.request", "operations.read"];
    case "refund.decide":
      return ["ledger.read", "refunds.decide", "operations.read"];
    case "refund.execute":
      return ["ledger.read", "refunds.execute", "operations.read"];
    case "ledger.reconcile":
      return ["ledger.read", "ledger.reconcile", "operations.read"];
    case "cms.save":
      return ["cms.read", "cms.write"];
    case "cms.publish":
      return ["cms.read", "cms.publish", "cms.rebuild"];
    case "cms.rebuild":
      return ["cms.read", "cms.rebuild"];
    case "notification.read":
      return ["notifications.read", "notifications.write"];
    case "reports.export":
      return ["reports.read", "reports.export"];
  }
}
export function isFinancial(command: AdminCommand) {
  return [
    "offer.decide",
    "proof.review",
    "refund.request",
    "refund.decide",
    "refund.execute",
    "ledger.reconcile",
  ].includes(command.type);
}
export function canReviewProof(
  proof: OfflineProof,
  userId: string,
  phase: "first" | "second",
) {
  return (
    userId !== proof.submittedBy &&
    (phase === "first"
      ? proof.status === "pending_review"
      : proof.status === "pending_secondary" &&
        !!proof.firstReviewerId &&
        userId !== proof.firstReviewerId)
  );
}
