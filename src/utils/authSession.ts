export interface CrmSession {
  userId: string;
  name: string;
  email: string;
  role: "FINANCIER" | "ADMIN" | "MANAGER" | "TRAINER" | "STUDENT" | string;
  authenticated: boolean;
}

export function canonicalizeDemoUser(
  rawEmail: string,
  explicitRole?: string
): CrmSession {
  const email = rawEmail.trim().toLowerCase();
  const roleUpper = explicitRole?.trim().toUpperCase();

  if (email === "analyst.finance@aintrixacademy.edu" || email === "analyst.finance@apexacademy.edu") {
    return {
      userId: "usr-analyst",
      name: "Siddharth Rao",
      email: "analyst.finance@aintrixacademy.edu",
      role: "FINANCIER",
      authenticated: true,
    };
  }

  if (email.includes("financier") || roleUpper === "FINANCIER") {
    return {
      userId: "usr-financier",
      name: "Meera Nair",
      email: email || "financier@aintrixacademy.edu",
      role: "FINANCIER",
      authenticated: true,
    };
  }

  if (email.includes("trainer") || roleUpper === "TRAINER") {
    return {
      userId: "usr-trainer",
      name: "Arjun Krishnan",
      email: email || "trainer@aintrixacademy.edu",
      role: "TRAINER",
      authenticated: true,
    };
  }

  if (email.includes("manager") || roleUpper === "MANAGER") {
    return {
      userId: "usr-manager",
      name: "Vikram Menon",
      email: email || "manager@aintrixacademy.edu",
      role: "MANAGER",
      authenticated: true,
    };
  }

  if (email.includes("student") || roleUpper === "STUDENT") {
    return {
      userId: "std-001",
      name: "Enrolled Student",
      email: email || "student@aintrixacademy.edu",
      role: "STUDENT",
      authenticated: true,
    };
  }

  return {
    userId: "usr-admin",
    name: "Raghav Menon",
    email: email || "admin@aintrixacademy.edu",
    role: "ADMIN",
    authenticated: true,
  };
}

function readCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const pairs = document.cookie.split(";");
  for (const part of pairs) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    if (k === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

export function readCrmSession(): CrmSession | null {
  if (typeof window === "undefined") return null;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem("crm_session");
  } catch {
    raw = null;
  }
  if (!raw) {
    raw = readCookieValue("crm_session");
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CrmSession>;
    if (!parsed || parsed.authenticated !== true || !parsed.role) {
      return null;
    }
    return {
      userId: String(parsed.userId || "usr-financier"),
      name: String(parsed.name || parsed.role),
      email: String(parsed.email || ""),
      role: String(parsed.role).toUpperCase(),
      authenticated: true,
    };
  } catch {
    return null;
  }
}

export function writeCrmSession(session: CrmSession): void {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(session);
  try {
    window.localStorage.setItem("crm_session", serialized);
  } catch {
    // ignore storage quota failures
  }
  if (typeof document !== "undefined") {
    document.cookie = `crm_session=${encodeURIComponent(serialized)}; path=/; SameSite=Lax`;
  }
}

export function clearCrmSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("crm_session");
  } catch {
    // ignore
  }
  if (typeof document !== "undefined") {
    document.cookie = "crm_session=; path=/; Max-Age=0; SameSite=Lax";
  }
}

export function isFinancierAuthorized(session: CrmSession | null): boolean {
  if (!session || !session.authenticated) return false;
  const role = session.role.toUpperCase();
  return role === "FINANCIER" || role === "ADMIN";
}

export function getRedirectPathForSession(session: CrmSession | null): string {
  if (!session || !session.authenticated) return "/login";
  switch (session.role.toUpperCase()) {
    case "MANAGER":
      return "/manager";
    case "TRAINER":
      return "/trainer";
    case "STUDENT":
      return "/student-panel";
    case "FINANCIER":
      return "/financier";
    case "ADMIN":
      return "/admin-panel";
    default:
      return "/login";
  }
}
