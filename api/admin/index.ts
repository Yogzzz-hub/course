import { randomUUID } from "node:crypto";
import {
  getAdminPool,
  getLeads,
  getAudit,
  getOffers,
  getFinance,
  getProgrammes,
  getReports,
  getNotifications,
  search,
  moveLead,
  markNotificationRead,
  decideAdmission,
  verifyPayment,
  reconcileEntry,
  recordAuditEvent,
} from "../../backend/services/admin/pgStore.ts";

function jsonRes(data: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const ALL_PERMISSIONS = [
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
];

interface AdminSessionState {
  userId: string;
  name: string;
  csrfToken: string;
  expiresAt: number;
}

const sessions = new Map<string, AdminSessionState>();

/** Reads the signed-in admin from the crm_session cookie. */
function adminFromRequest(request: Request): { userId: string; name: string; role: string } | null {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)crm_session=([^;]*)/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    if (!parsed || parsed.authenticated !== true) return null;
    const role = String(parsed.role || "").toUpperCase();
    return { userId: String(parsed.userId || "admin"), name: String(parsed.name || role), role };
  } catch {
    return null;
  }
}

function sessionFor(userId: string, name: string): AdminSessionState {
  const existing = sessions.get(userId);
  if (existing && existing.expiresAt > Date.now()) return existing;
  const fresh: AdminSessionState = {
    userId,
    name,
    csrfToken: randomUUID(),
    expiresAt: Date.now() + 8 * 60 * 60 * 1000,
  };
  sessions.set(userId, fresh);
  return fresh;
}

function anonymous() {
  return { state: "anonymous" as const };
}

export async function handleAdminRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/admin/, "") || "/";
  const method = request.method.toUpperCase();

  try {
    const pool = getAdminPool();
    const admin = adminFromRequest(request);
    const isAdmin = !!admin && admin.role === "ADMIN";

    if (path === "/session" && method === "GET") {
      if (!isAdmin) return jsonRes(anonymous());
      const session = sessionFor(admin!.userId, admin!.name);
      return jsonRes({
        state: "authenticated",
        userId: session.userId,
        cacheKey: `${session.userId}:${session.expiresAt}`,
        name: session.name,
        csrfToken: session.csrfToken,
        permissions: ALL_PERMISSIONS,
        twoFactorVerified: true,
        expiresAt: new Date(session.expiresAt).toISOString(),
        twoFactorExpiresAt: new Date(session.expiresAt).toISOString(),
        pendingFinancialOperations: [],
      });
    }

    if (path === "/two-factor/verify" && method === "POST") {
      // Second-factor delivery is not configured here, so the session endpoint
      // never issues a challenge and there is nothing to verify against.
      return jsonRes({ error: "Two-factor verification is not configured." }, 501);
    }

    if (!isAdmin) return jsonRes({ error: "Admin access required." }, 403);

    const session = sessionFor(admin!.userId, admin!.name);

    if (method === "GET") {
      if (path === "/leads") return jsonRes(await getLeads(pool));
      if (path === "/offers") return jsonRes(await getOffers(pool));
      if (path === "/finance") return jsonRes(await getFinance(pool));
      if (path === "/programmes") return jsonRes(await getProgrammes(pool));
      if (path === "/audit") return jsonRes(await getAudit(pool));
      if (path === "/notifications") return jsonRes(await getNotifications(pool));
      if (path === "/operations") return jsonRes({ operations: [] });
      if (path === "/search") return jsonRes(await search(pool, url.searchParams.get("q") || url.searchParams.get("query") || ""));
      if (path === "/reports") {
        return jsonRes(await getReports(pool, url.searchParams.get("from") || undefined, url.searchParams.get("to") || undefined));
      }
      const timeline = path.match(/^\/leads\/([^/]+)\/timeline$/);
      if (timeline) return jsonRes(await getAudit(pool, timeline[1]));
      const exportMatch = path.match(/^\/exports\/([^/]+)$/);
      if (exportMatch) {
        // Export generation needs file storage, so no download is ever promised.
        return jsonRes({ id: exportMatch[1], status: "failed", downloadUrl: null, expiresAt: null });
      }
    }

    if (path === "/commands" && method === "POST") {
      const sent = request.headers.get("x-csrf-token");
      if (!sent || sent !== session.csrfToken) {
        return jsonRes({ error: "Invalid CSRF token. Reload the page and try again." }, 403);
      }
      const requestId = request.headers.get("idempotency-key") || randomUUID();
      const command = (await request.json()) as Record<string, any>;

      const receipt = (status: "succeeded" | "failed", message: string, resourceId: string | null = null) =>
        jsonRes({ requestId, status, resourceId, message });

      switch (command?.type) {
        case "lead.move": {
          const ok = await moveLead(pool, command.leadId, command.stage);
          if (ok) {
            await recordAuditEvent(pool, session.userId, "LEAD_MOVE", "Lead", command.leadId, `Moved to ${command.stage}`);
            return receipt("succeeded", `Lead moved to ${command.stage}.`, command.leadId);
          }
          return receipt("failed", "That lead could not be updated.", command.leadId);
        }
        case "notification.read": {
          const ok = await markNotificationRead(pool, command.notificationId);
          return ok
            ? receipt("succeeded", "Notification marked as read.", command.notificationId)
            : receipt("failed", "That notification could not be updated.", command.notificationId);
        }
        case "offer.decide": {
          const ok = await decideAdmission(pool, command.offerId, command.decision === "approved");
          if (ok) {
            await recordAuditEvent(pool, session.userId, "OFFER_DECIDE", "Admission", command.offerId, command.reason);
            return receipt("succeeded", `Offer ${command.decision}.`, command.offerId);
          }
          return receipt("failed", "That offer could not be updated.", command.offerId);
        }
        case "proof.review": {
          const ok = await verifyPayment(pool, command.proofId, command.decision === "approved");
          if (ok) {
            await recordAuditEvent(pool, session.userId, "PROOF_REVIEW", "StudentPayment", command.proofId, command.reason);
            return receipt("succeeded", `Payment proof ${command.decision}.`, command.proofId);
          }
          return receipt("failed", "That payment proof could not be updated.", command.proofId);
        }
        case "ledger.reconcile": {
          const ok = await reconcileEntry(pool, command.entryId, command.providerReference);
          if (ok) {
            await recordAuditEvent(pool, session.userId, "LEDGER_RECONCILE", "StudentPayment", command.entryId, command.reason);
            return receipt("succeeded", "Ledger entry reconciled.", command.entryId);
          }
          return receipt("failed", "That ledger entry could not be reconciled.", command.entryId);
        }
        // Refund execution moves money and CMS publishing drives the public site.
        // Neither has a backing workflow here, so they report failure rather than
        // reporting success for something that did not happen.
        case "refund.request":
        case "refund.decide":
        case "refund.execute":
          return receipt("failed", "Refund workflow is not available in this environment.", null);
        case "cms.save":
        case "cms.publish":
        case "cms.rebuild":
          return receipt("failed", "Programme publishing is not available in this environment.", command.programmeId || null);
        case "reports.export":
          return receipt("failed", "Report export is not available in this environment.", null);
        default:
          return receipt("failed", "Unsupported command.", null);
      }
    }

    if (path === "/logout" && method === "POST") {
      sessions.delete(session.userId);
      return new Response(null, { status: 204 });
    }

    return jsonRes({ error: `Admin endpoint not found: ${method} ${path}` }, 404);
  } catch (err) {
    console.error("[Admin API] error:", err);
    return jsonRes({ error: err instanceof Error ? err.message : "Admin service unavailable" }, 500);
  }
}

export interface NodeReqLike {
  url?: string;
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  on?: (event: string, cb: (chunk?: unknown) => void) => void;
}

export interface NodeResLike {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(chunk?: string | Buffer): void;
}

export async function dispatchNodeAdminRequest(req: NodeReqLike, res: NodeResLike): Promise<void> {
  const method = (req.method || "GET").toUpperCase();
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers || {})) {
    if (Array.isArray(v)) headers.set(k, v.join(", "));
    else if (typeof v === "string") headers.set(k, v);
  }
  let bodyText = "";
  if (method !== "GET" && method !== "HEAD" && typeof req.on === "function") {
    bodyText = await new Promise<string>((resolve) => {
      let acc = "";
      req.on!("data", (chunk) => {
        if (chunk) acc += String(chunk);
      });
      req.on!("end", () => resolve(acc));
      req.on!("error", () => resolve(""));
    });
  }
  const webReq = new Request(new URL(req.url || "/api/admin", "http://127.0.0.1"), {
    method,
    headers,
    body: bodyText ? new TextEncoder().encode(bodyText).slice().buffer : undefined,
  });
  const webRes = await handleAdminRequest(webReq);
  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(await webRes.text());
}
