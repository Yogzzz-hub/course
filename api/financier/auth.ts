import { z } from "zod";
import type { ActorIdentity, FinanceRole } from "../../backend/services/financier/types.ts";

const crmSessionSchema = z.object({
  userId: z.string().min(1).optional(),
  id: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  email: z.string().email(),
  role: z.enum(["FINANCIER", "ADMIN", "MANAGER", "TRAINER", "STUDENT"]),
  authenticated: z.boolean().optional(),
});

export interface ParsedSessionResult {
  ok: true;
  actor: ActorIdentity;
}

export interface RejectedSessionResult {
  ok: false;
  status: 401 | 403;
  code: "UNAUTHORIZED" | "FORBIDDEN";
  message: string;
  redirectTo: string;
}

export function getRoleHomePath(role: FinanceRole | string): string {
  switch (role) {
    case "FINANCIER":
      return "/financier";
    case "ADMIN":
      return "/admin-panel";
    case "MANAGER":
      return "/manager";
    case "TRAINER":
      return "/trainer";
    case "STUDENT":
      return "/student-panel";
    default:
      return "/login";
  }
}

export function canAccessFinancierRole(role: string | undefined | null): boolean {
  return role === "FINANCIER" || role === "ADMIN";
}

function decodeRawSessionToken(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const candidates: string[] = [trimmed];
  try {
    candidates.push(decodeURIComponent(trimmed));
  } catch {}

  if (!trimmed.startsWith("{")) {
    try {
      const b64 = trimmed.replace(/^Bearer\s+/i, "").trim();
      const decoded = Buffer.from(b64, "base64").toString("utf8");
      candidates.push(decoded);
    } catch {}
  }

  for (const cand of candidates) {
    if (!cand.startsWith("{")) continue;
    try {
      const parsed = JSON.parse(cand);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {}
  }
  return null;
}

function parseCookies(cookieHeader: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = val;
  }
  return out;
}

function canonicalizeKnownActor(parsed: z.infer<typeof crmSessionSchema>): ActorIdentity {
  const email = parsed.email.toLowerCase().trim();
  if (email === "financier@apexacademy.edu") {
    return {
      id: "usr-financier",
      name: "Meera Nair",
      email,
      role: "FINANCIER",
    };
  }
  if (email === "analyst.finance@apexacademy.edu") {
    return {
      id: "usr-analyst",
      name: "Siddharth Rao",
      email,
      role: "FINANCIER",
    };
  }
  if (email === "admin@apexacademy.edu") {
    return {
      id: "usr-admin",
      name: "Raghav Menon",
      email,
      role: "ADMIN",
    };
  }
  return {
    id: parsed.userId || parsed.id || `usr-${email}`,
    name: parsed.name || parsed.role,
    email,
    role: parsed.role,
  };
}

export function authenticateFinancierRequest(headers: {
  get(name: string): string | null;
}): ParsedSessionResult | RejectedSessionResult {
  const xSession = headers.get("x-crm-session");
  const authHeader = headers.get("authorization");
  const cookies = parseCookies(headers.get("cookie"));
  const raw = xSession || cookies["crm_session"] || authHeader;

  const obj = decodeRawSessionToken(raw);
  if (!obj) {
    return {
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
      message: "Authentication required. Sign in with a Financier or Admin account.",
      redirectTo: "/login",
    };
  }

  const parsed = crmSessionSchema.safeParse(obj);
  if (!parsed.success || parsed.data.authenticated === false) {
    return {
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
      message: "Invalid or expired CRM session.",
      redirectTo: "/login",
    };
  }

  if (!canAccessFinancierRole(parsed.data.role)) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: `Role "${parsed.data.role}" is not permitted to access Financier portal endpoints.`,
      redirectTo: getRoleHomePath(parsed.data.role),
    };
  }

  return {
    ok: true,
    actor: canonicalizeKnownActor(parsed.data),
  };
}
