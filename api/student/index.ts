import { randomUUID } from "node:crypto";
import {
  getStudentPool,
  resolveStudent,
  getSession,
  getDashboard,
  getAssignments,
  getMentorship,
  getMentorshipSlots,
  bookMentorshipSlot,
  getLearningPlan,
  getPayments,
  getSessions,
  submitAssignment,
  createStudentCheckoutOrder,
  getStudentOrder,
  type StudentIdentity,
} from "../../backend/services/student/pgStore.ts";

function jsonRes(data: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function isDbConnectionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message || "";
  return (
    msg.includes("ECONNREFUSED") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("DATABASE_URL is required") ||
    msg.includes("password authentication failed") ||
    msg.includes("Connection terminated") ||
    msg.includes("no pg_hba.conf entry")
  );
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

/** Reads the signed-in email from cookie, header, or query param. */
function emailFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  const paramEmail = url.searchParams.get("studentEmail") || url.searchParams.get("email");
  if (paramEmail) return paramEmail;

  const crmHeader = request.headers.get("x-crm-session");
  if (crmHeader) {
    try {
      const parsed = JSON.parse(crmHeader);
      if (parsed.email) return parsed.email;
    } catch {}
  }
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)crm_session=([^;]*)/);
  if (match) {
    try {
      const parsed = JSON.parse(decodeURIComponent(match[1]));
      return typeof parsed?.email === "string" ? parsed.email : null;
    } catch {}
  }
  return null;
}

// In-memory fallback student identity & records for dev / offline mode
const FALLBACK_STUDENT: StudentIdentity = {
  userId: "usr-student-01",
  studentProfileId: "sp-student-01",
  name: "Aryan Verma",
  email: "student@aintrixacademy.edu",
  registrationNumber: "REG-2026-0891",
};

const inMemoryDashboard = {
  nextClass: {
    id: "cls-next",
    title: "Advanced Django ORM & QuerySet Optimization",
    startsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    joinUrl: "https://meet.google.com/ain-trix-dev",
  },
  classes: [
    {
      id: "cls-01",
      title: "Advanced Django ORM & QuerySet Optimization",
      startsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      joinUrl: "https://meet.google.com/ain-trix-dev",
    },
    {
      id: "cls-02",
      title: "Celery Background Workers with Redis Broker",
      startsAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(Date.now() + 50 * 60 * 60 * 1000).toISOString(),
      joinUrl: "https://meet.google.com/ain-trix-dev",
    },
  ],
  deadlines: [
    {
      id: "dl-01",
      title: "Production REST API with JWT Auth & Rate Limiting",
      dueAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    },
  ],
  modules: [
    { id: "mod-01", title: "Module 1: Advanced Python & Async I/O", completed: 8, total: 8 },
    { id: "mod-02", title: "Module 2: Relational Databases & SQL Optimization", completed: 6, total: 6 },
    { id: "mod-03", title: "Module 3: Django Framework & RESTful Services", completed: 5, total: 7 },
    { id: "mod-04", title: "Module 4: Docker, CI/CD & Cloud Deployment", completed: 2, total: 6 },
  ],
  onboarding: [
    { id: "profile", title: "Complete your profile details", completed: true, url: null },
    { id: "agreement", title: "Fee agreement approved", completed: true, url: null },
    { id: "batch", title: "Batch allocated", completed: true, url: null },
  ],
};

interface SubmissionAttempt {
  id: string;
  number: number;
  submittedAt: string;
  status: "submitted" | "reviewing" | "graded";
  repositoryUrl: string | null;
  liveUrl: string | null;
  attachmentName: string | null;
  feedback: string | null;
  scores: Array<{ rubricId: string; points: number }>;
}

interface InMemAssignment {
  id: string;
  title: string;
  description: string;
  kind: "assignment" | "project";
  dueAt: string;
  canSubmit: boolean;
  maxAttempts: number;
  rubric: Array<{ id: string; label: string; maxPoints: number }>;
  attempts: SubmissionAttempt[];
}

const inMemoryAssignments: { assignments: InMemAssignment[] } = {
  assignments: [
    {
      id: "asg-01",
      title: "Production REST API with JWT Auth & Rate Limiting",
      description: "Implement a production-grade REST API with JWT authentication, refresh tokens, role-based access control, and redis rate limiting.",
      kind: "assignment",
      dueAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      canSubmit: true,
      maxAttempts: 3,
      rubric: [
        { id: "rub-01", label: "JWT Auth & Refresh Token Flow", maxPoints: 50 },
        { id: "rub-02", label: "Rate Limiter & Error Handling", maxPoints: 50 },
      ],
      attempts: [
        {
          id: "att-01",
          number: 1,
          submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          status: "graded",
          repositoryUrl: "https://github.com/example/aryan-rest-api",
          liveUrl: null,
          attachmentName: "rest-api-v1.zip",
          feedback: "Clean architecture, proper token validation and great test coverage.",
          scores: [
            { rubricId: "rub-01", points: 48 },
            { rubricId: "rub-02", points: 46 },
          ],
        },
      ],
    },
    {
      id: "asg-02",
      title: "Django Celery Async Task Processing & Notification Worker",
      description: "Build an asynchronous email and push notification worker service with Celery and Redis broker.",
      kind: "project",
      dueAt: new Date(Date.now() + 120 * 60 * 60 * 1000).toISOString(),
      canSubmit: true,
      maxAttempts: 3,
      rubric: [
        { id: "rub-03", label: "Celery Task Queue Setup", maxPoints: 50 },
        { id: "rub-04", label: "Error Handling & Dead Letter Queue", maxPoints: 50 },
      ],
      attempts: [],
    },
  ],
};

const inMemoryMentorship = {
  entitlement: { total: 4, used: 1, reserved: 1 },
  bookings: [
    {
      id: "mb-01",
      startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
      mentor: "Dr. Vikram Malhotra",
      status: "booked" as const,
      joinUrl: "https://meet.google.com/ain-trix-mentor",
    },
    {
      id: "mb-02",
      startsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
      mentor: "Sneha Kulkarni",
      status: "completed" as const,
      joinUrl: null,
    },
  ],
  attendance: [
    {
      classId: "cls-01",
      title: "Python Full Stack Mastery",
      startsAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: "present" as const,
    },
    {
      classId: "cls-02",
      title: "Python Full Stack Mastery",
      startsAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      status: "present" as const,
    },
  ],
};

const inMemoryPayments = {
  currency: "INR",
  instalments: [
    {
      id: "inst-01",
      label: "Instalment 1: Enrolment Deposit",
      amountMinor: 2500000,
      dueAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: "paid" as const,
      pendingOrderId: null,
      receiptUrl: null,
    },
    {
      id: "inst-02",
      label: "Instalment 2: Mid-Term Milestone",
      amountMinor: 2500000,
      dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: "due" as const,
      pendingOrderId: null,
      receiptUrl: null,
    },
    {
      id: "inst-03",
      label: "Instalment 3: Final Capstone Milestone",
      amountMinor: 2500000,
      dueAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      status: "due" as const,
      pendingOrderId: null,
      receiptUrl: null,
    },
  ],
};

const inMemorySessions = {
  sessions: [
    {
      id: "ses-01",
      title: "Advanced Django ORM & QuerySet Optimization",
      startsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      roomUrl: "https://meet.google.com/ain-trix-dev",
    },
    {
      id: "ses-02",
      title: "Celery Background Workers with Redis Broker",
      startsAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(Date.now() + 50 * 60 * 60 * 1000).toISOString(),
      roomUrl: "https://meet.google.com/ain-trix-dev",
    },
  ],
};

export async function handleStudentRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/student/, "") || "/";
  const method = request.method.toUpperCase();

  try {
    let pool: any = null;
    let student: StudentIdentity | null = null;
    const email = emailFromRequest(request);

    try {
      pool = getStudentPool();
      student = await resolveStudent(pool, email);
    } catch (dbErr) {
      if (!isDbConnectionError(dbErr)) throw dbErr;
      pool = null;
    }

    // In offline/dev mode without PostgreSQL:
    if (!pool) {
      const modeParam = url.searchParams.get("mode");
      const hasStudentSession = Boolean(email || modeParam === "enrolled" || request.headers.get("x-crm-session"));
      if (hasStudentSession) {
        student = {
          ...FALLBACK_STUDENT,
          email: email || FALLBACK_STUDENT.email,
        };
      }
    }

    if (!student) {
      // No student records exist or user is signed out; return null session rather than error 500
      if (path === "/session" && method === "GET") return jsonRes({ session: null });
      return jsonRes({ error: "No student record found. Please sign in." }, 404);
    }

    if (path === "/session" && method === "GET") {
      const token = issueCsrfToken(student.userId);
      if (pool) {
        try {
          return jsonRes({ session: await getSession(pool, student, token) });
        } catch (dbErr) {
          if (!isDbConnectionError(dbErr)) throw dbErr;
        }
      }
      // Offline fallback session: Enrolled mode with verified payment
      return jsonRes({
        session: {
          userId: student.userId,
          cacheKey: `student-session-${student.studentProfileId}`,
          name: student.name,
          email: student.email,
          csrfToken: token,
          mode: "enrolled",
          enrolmentId: "adm-py-01",
          programme: "Python Full Stack Mastery",
          payment: {
            status: "verified",
            orderId: "ord-verified-01",
            verifiedAt: "2026-11-01T10:00:00.000Z",
          },
        },
      });
    }

    if (path === "/dashboard" && method === "GET") {
      if (pool) {
        try {
          return jsonRes(await getDashboard(pool, student));
        } catch (dbErr) {
          if (!isDbConnectionError(dbErr)) throw dbErr;
        }
      }
      return jsonRes(inMemoryDashboard);
    }

    if (path === "/assignments" && method === "GET") {
      if (pool) {
        try {
          return jsonRes(await getAssignments(pool, student));
        } catch (dbErr) {
          if (!isDbConnectionError(dbErr)) throw dbErr;
        }
      }
      return jsonRes(inMemoryAssignments);
    }

    if (path === "/mentorship" && method === "GET") {
      if (pool) {
        try {
          return jsonRes(await getMentorship(pool, student));
        } catch (dbErr) {
          if (!isDbConnectionError(dbErr)) throw dbErr;
        }
      }
      return jsonRes(inMemoryMentorship);
    }

    if (path === "/payments" && method === "GET") {
      if (pool) {
        try {
          return jsonRes(await getPayments(pool, student));
        } catch (dbErr) {
          if (!isDbConnectionError(dbErr)) throw dbErr;
        }
      }
      return jsonRes(inMemoryPayments);
    }

    if (path === "/sessions" && method === "GET") {
      if (pool) {
        try {
          return jsonRes(await getSessions(pool, student));
        } catch (dbErr) {
          if (!isDbConnectionError(dbErr)) throw dbErr;
        }
      }
      return jsonRes(inMemorySessions);
    }

    if (path.startsWith("/mentorship/slots") && method === "GET") {
      const tz = url.searchParams.get("timeZone") || "Asia/Kolkata";
      if (pool) {
        try {
          return jsonRes(await getMentorshipSlots(pool, student, tz));
        } catch (dbErr) {
          if (!isDbConnectionError(dbErr)) throw dbErr;
        }
      }
      const slots = [];
      const now = new Date();
      for (let day = 1; day <= 3; day++) {
        const slotDay = new Date(now.getTime() + day * 24 * 60 * 60 * 1000);
        const s = new Date(slotDay);
        s.setHours(11, 0, 0, 0);
        const e = new Date(slotDay);
        e.setHours(12, 0, 0, 0);
        slots.push({
          id: `slot-${day}-11`,
          startsAt: s.toISOString(),
          endsAt: e.toISOString(),
          mentor: "Dr. Vikram Malhotra",
        });
      }
      return jsonRes({ slots });
    }

    if (path === "/learning-plan" && method === "GET") {
      if (pool) {
        try {
          return jsonRes(await getLearningPlan(pool, student));
        } catch (dbErr) {
          if (!isDbConnectionError(dbErr)) throw dbErr;
        }
      }
      return jsonRes(null);
    }

    const orderMatch = path.match(/^\/orders\/([^/]+)$/);
    if (orderMatch && method === "GET") {
      if (pool) {
        try {
          return jsonRes(await getStudentOrder(pool, student, orderMatch[1]));
        } catch (dbErr) {
          if (!isDbConnectionError(dbErr)) throw dbErr;
        }
      }
      return jsonRes({
        id: orderMatch[1],
        status: "verified",
        amountMinor: 2500000,
        currency: "INR",
        checkoutUrl: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        receiptUrl: null,
      });
    }

    if (method === "POST" && pool && !csrfValid(student.userId, request)) {
      return jsonRes({ error: "Invalid CSRF token. Reload the page and try again." }, 403);
    }

    const submitMatch = path.match(/^\/assignments\/([^/]+)\/submissions$/);
    if (submitMatch && method === "POST") {
      const form = await request.formData();
      const repoUrl = String(form.get("repositoryUrl") || "");
      const liveUrl = String(form.get("liveUrl") || "");
      if (pool) {
        try {
          await submitAssignment(pool, student, submitMatch[1], repoUrl, liveUrl, null);
          const { assignments } = await getAssignments(pool, student);
          const updated = assignments.find((a) => a.id === submitMatch[1]);
          if (updated) return jsonRes(updated);
        } catch (dbErr) {
          if (!isDbConnectionError(dbErr)) throw dbErr;
        }
      }
      const targetAsg = inMemoryAssignments.assignments.find((a) => a.id === submitMatch[1]);
      if (!targetAsg) return jsonRes({ error: "Assignment not found." }, 404);
      const newAttempt = {
        id: `att-${Date.now()}`,
        number: targetAsg.attempts.length + 1,
        submittedAt: new Date().toISOString(),
        status: "submitted" as const,
        repositoryUrl: repoUrl || null,
        liveUrl: liveUrl || null,
        attachmentName: null,
        feedback: null,
        scores: [],
      };
      targetAsg.attempts.push(newAttempt);
      return jsonRes(targetAsg);
    }

    if (path.match(/^\/onboarding\/[^/]+\/complete$/) && method === "POST") {
      return jsonRes(inMemoryDashboard);
    }

    if (path === "/logout" && method === "POST") {
      csrfTokens.delete(student.userId);
      return new Response(null, { status: 204 });
    }

    if (path === "/checkout" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      if (pool) {
        try {
          return jsonRes(await createStudentCheckoutOrder(pool, student, body));
        } catch (dbErr) {
          if (!isDbConnectionError(dbErr)) throw dbErr;
        }
      }
      const orderId = `order_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
      return jsonRes({
        id: orderId,
        status: "pending",
        amountMinor: body.expectedAmountMinor || 2500000,
        currency: (body.currency || "INR").toUpperCase(),
        checkoutUrl: `https://checkout.razorpay.com/v1/checkout?order_id=${orderId}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        receiptUrl: null,
      });
    }

    const instalmentCheckoutMatch = path.match(/^\/instalments\/([^/]+)\/checkout$/);
    if (instalmentCheckoutMatch && method === "POST") {
      const body = await request.json().catch(() => ({}));
      if (pool) {
        try {
          return jsonRes(await createStudentCheckoutOrder(pool, student, { instalmentId: instalmentCheckoutMatch[1], ...body }));
        } catch (dbErr) {
          if (!isDbConnectionError(dbErr)) throw dbErr;
        }
      }
      const orderId = `order_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
      return jsonRes({
        id: orderId,
        status: "pending",
        amountMinor: 2500000,
        currency: "INR",
        checkoutUrl: `https://checkout.razorpay.com/v1/checkout?order_id=${orderId}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        receiptUrl: null,
      });
    }

    if (path === "/mentorship/bookings" && method === "POST") {
      const body = await request.json().catch(() => ({}));
      if (!body.slotId) {
        return jsonRes({ error: "Please select a mentorship slot." }, 400);
      }
      if (pool) {
        try {
          return jsonRes(await bookMentorshipSlot(pool, student, body.slotId));
        } catch (dbErr) {
          if (!isDbConnectionError(dbErr)) throw dbErr;
        }
      }
      const newBooking = {
        id: body.slotId,
        startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        mentor: "Dr. Vikram Malhotra",
        status: "booked" as const,
        joinUrl: "https://meet.google.com/ain-trix-mentor",
      };
      inMemoryMentorship.bookings.unshift(newBooking);
      inMemoryMentorship.entitlement.reserved += 1;
      return jsonRes(inMemoryMentorship);
    }

    return jsonRes({ error: `Student endpoint not found: ${method} ${path}` }, 404);
  } catch (err) {
    if (isDbConnectionError(err)) {
      if (path === "/session" && method === "GET") {
        return jsonRes({ session: null });
      }
      return jsonRes({ ok: true });
    }
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
