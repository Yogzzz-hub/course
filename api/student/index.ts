import { randomUUID } from "node:crypto";
import {
  getStudentPool,
  resolveStudent,
  getSession,
  getDashboard,
  getAssignments,
  getMentorship,
  getPayments,
  getSessions,
  submitAssignment,
  type StudentIdentity,
} from "../../backend/services/student/pgStore.ts";

function jsonRes(data: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/** CSRF tokens issued by /session, checked on every mutation. */
const csrfTokens = new Map<string, string>();

function issueCsrfToken(userId: string): string {
  const token = randomUUID();
  csrfTokens.set(userId, token);
  return token;
}

function csrfValid(userId: string, request: Request): boolean {
  const sent = request.headers.get("x-csrf-token");
  const expected = csrfTokens.get(userId);
  return !!sent && !!expected && sent === expected;
}

/** Reads the signed-in email from the crm_session cookie. */
function emailFromRequest(request: Request): string | null {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)crm_session=([^;]*)/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    return typeof parsed?.email === "string" ? parsed.email : null;
  } catch {
    return null;
  }
}

export async function handleStudentRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/student/, "") || "/";
  const method = request.method.toUpperCase();

  try {
    const pool = getStudentPool();
    const student: StudentIdentity | null = await resolveStudent(pool, emailFromRequest(request));

    if (!student) {
      // No student records exist yet; the panel treats a null session as signed out.
      if (path === "/session" && method === "GET") return jsonRes({ session: null });
      return jsonRes({ error: "No student record found." }, 404);
    }

    if (path === "/session" && method === "GET") {
      const token = issueCsrfToken(student.userId);
      return jsonRes({ session: await getSession(pool, student, token) });
    }
    if (path === "/dashboard" && method === "GET") return jsonRes(await getDashboard(pool, student));
    if (path === "/assignments" && method === "GET") return jsonRes(await getAssignments(pool, student));
    if (path === "/mentorship" && method === "GET") return jsonRes(await getMentorship(pool, student));
    if (path === "/payments" && method === "GET") return jsonRes(await getPayments(pool, student));
    if (path === "/sessions" && method === "GET") return jsonRes(await getSessions(pool, student));

    // No mentor-slot model exists in the schema, so no slots are offered.
    if (path.startsWith("/mentorship/slots") && method === "GET") return jsonRes({ slots: [] });

    // The fee plan / package catalogue has no table in the schema yet.
    if (path === "/learning-plan" && method === "GET") return jsonRes(null);

    if (method === "POST" && !csrfValid(student.userId, request)) {
      return jsonRes({ error: "Invalid CSRF token. Reload the page and try again." }, 403);
    }

    const submitMatch = path.match(/^\/assignments\/([^/]+)\/submissions$/);
    if (submitMatch && method === "POST") {
      const form = await request.formData();
      const file = form.get("attachment");
      if (file && typeof file !== "string") {
        return jsonRes(
          { error: "File uploads need storage to be configured. Submit a repository or live URL instead." },
          501
        );
      }
      await submitAssignment(
        pool,
        student,
        submitMatch[1],
        String(form.get("repositoryUrl") || ""),
        String(form.get("liveUrl") || "")
      );
      const { assignments } = await getAssignments(pool, student);
      const updated = assignments.find((a) => a.id === submitMatch[1]);
      if (!updated) return jsonRes({ error: "Assignment not found." }, 404);
      return jsonRes(updated);
    }

    if (path.match(/^\/onboarding\/[^/]+\/complete$/) && method === "POST") {
      // Each onboarding item mirrors a record that already exists, so this just
      // re-reads current state rather than setting a flag.
      return jsonRes(await getDashboard(pool, student));
    }

    if (path === "/logout" && method === "POST") {
      csrfTokens.delete(student.userId);
      return new Response(null, { status: 204 });
    }

    // Checkout needs a payment provider. Returning a stand-in URL would send a
    // student to a page that cannot take money, so this reports unavailable.
    if (path === "/checkout" || path.match(/^\/instalments\/[^/]+\/checkout$/)) {
      return jsonRes({ error: "Online payment is not configured in this environment." }, 501);
    }
    if (path === "/mentorship/bookings" && method === "POST") {
      return jsonRes({ error: "Mentorship booking is not available." }, 501);
    }

    return jsonRes({ error: `Student endpoint not found: ${method} ${path}` }, 404);
  } catch (err) {
    console.error("[Student API] error:", err);
    return jsonRes({ error: err instanceof Error ? err.message : "Student service unavailable" }, 500);
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

export async function dispatchNodeStudentRequest(req: NodeReqLike, res: NodeResLike): Promise<void> {
  const method = (req.method || "GET").toUpperCase();
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers || {})) {
    if (Array.isArray(v)) headers.set(k, v.join(", "));
    else if (typeof v === "string") headers.set(k, v);
  }
  let bodyBuffer: Uint8Array | undefined;
  if (method !== "GET" && method !== "HEAD" && typeof req.on === "function") {
    const chunks = await new Promise<Buffer[]>((resolve) => {
      const acc: Buffer[] = [];
      req.on!("data", (chunk) => {
        if (chunk) acc.push(Buffer.from(chunk as Buffer));
      });
      req.on!("end", () => resolve(acc));
      req.on!("error", () => resolve(acc));
    });
    if (chunks.length) bodyBuffer = new Uint8Array(Buffer.concat(chunks));
  }
  const webReq = new Request(new URL(req.url || "/api/student", "http://127.0.0.1"), {
    method,
    headers,
    body: bodyBuffer ? bodyBuffer.slice().buffer : undefined,
  });
  const webRes = await handleStudentRequest(webReq);
  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(await webRes.text());
}
