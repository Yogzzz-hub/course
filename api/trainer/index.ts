import {
  getTrainerPool,
  getTrainerSnapshot,
  resolveTrainerProfileId,
  saveAttendanceRecords,
  gradeSubmissionRecord,
  acceptDoubtRecord,
  createTrainerAnnouncementRecord,
} from "../../backend/services/trainer/pgStore.ts";

function jsonRes(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
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

// In-memory fallback state for dev / offline mode when PostgreSQL is offline
const inMemoryTrainerStore = {
  stats: {
    todayClasses: 1,
    totalStudents: 50,
    pendingReviews: 2,
    openDoubts: 2,
    nextClassTime: "Today, 10:00 AM",
    nextClassTitle: "Advanced Django ORM Optimization",
    nextClassBatch: "PY-2026-B1",
    nextClassStudents: 28,
  },
  batches: [
    {
      id: "batch-py",
      name: "Python Full Stack Mastery",
      code: "PY-2026-B1",
      track: "Python Full Stack",
      studentsCount: 28,
      progress: 68,
      nextSession: "Today, 10:00 AM",
      module: "Module 4: Django REST Framework & PostgreSQL",
      schedule: "Mon, Wed, Fri • 10:00 AM - 12:00 PM IST",
      students: [
        { id: "stu-01", name: "Aryan Verma", email: "aryan.v@example.com", attendanceRate: 94, lastPresent: true },
        { id: "stu-02", name: "Sneha Rao", email: "sneha.r@example.com", attendanceRate: 96, lastPresent: true },
        { id: "stu-03", name: "Karthik Nair", email: "karthik.n@example.com", attendanceRate: 88, lastPresent: true },
        { id: "stu-04", name: "Ananya Joshi", email: "ananya.j@example.com", attendanceRate: 68, lastPresent: false },
        { id: "stu-05", name: "Rohan Mehta", email: "rohan.m@example.com", attendanceRate: 92, lastPresent: true },
        { id: "stu-06", name: "Pooja Kulkarni", email: "pooja.k@example.com", attendanceRate: 98, lastPresent: true },
      ],
    },
    {
      id: "batch-cloud",
      name: "AWS & DevOps Engineering",
      code: "CLOUD-2026-A1",
      track: "Cloud & DevOps",
      studentsCount: 22,
      progress: 42,
      nextSession: "Tomorrow, 2:00 PM",
      module: "Module 3: Kubernetes Orchestration & Helm",
      schedule: "Tue, Thu, Sat • 2:00 PM - 4:00 PM IST",
      students: [
        { id: "stu-07", name: "Vikram Sengupta", email: "vikram.s@example.com", attendanceRate: 91, lastPresent: true },
        { id: "stu-08", name: "Tanvi Saxena", email: "tanvi.s@example.com", attendanceRate: 85, lastPresent: true },
        { id: "stu-09", name: "Aditya Roy", email: "aditya.r@example.com", attendanceRate: 70, lastPresent: false },
      ],
    },
  ],
  schedule: [
    {
      id: "sch-01",
      batchCode: "PY-2026-B1",
      batchName: "Python Full Stack Mastery",
      topic: "Advanced Django ORM & QuerySet Optimization",
      date: "Today",
      time: "10:00 AM - 12:00 PM",
      duration: "2 hours",
      room: "Lab 3 / Zoom Room Alpha",
      attendees: 28,
      status: "SCHEDULED" as const,
      joinUrl: "https://zoom.us/j/sample-aintrix-class",
    },
    {
      id: "sch-02",
      batchCode: "CLOUD-2026-A1",
      batchName: "AWS & DevOps Engineering",
      topic: "Kubernetes StatefulSets, Persistent Volumes & Helm Charts",
      date: "Tomorrow",
      time: "02:00 PM - 04:00 PM",
      duration: "2 hours",
      room: "Lab 1 / Zoom Room Beta",
      attendees: 22,
      status: "UPCOMING" as const,
      joinUrl: "https://zoom.us/j/sample-aintrix-cloud",
    },
  ],
  rosterMap: {} as Record<string, any[]>,
  assignments: [
    {
      id: "asg-01",
      studentName: "Aryan Verma",
      studentEmail: "aryan.v@example.com",
      batchCode: "PY-2026-B1",
      assignmentTitle: "E-Commerce Microservice Schema & Migrations",
      submittedAt: "Today, 09:30 AM",
      status: "PENDING" as const,
      fileUrl: "https://github.com/example/aryan-ecom-backend",
      maxScore: 100,
    },
    {
      id: "asg-02",
      studentName: "Sneha Rao",
      studentEmail: "sneha.r@example.com",
      batchCode: "PY-2026-B1",
      assignmentTitle: "Django REST Framework ViewSets & JWT",
      submittedAt: "Today, 08:45 AM",
      status: "PENDING" as const,
      fileUrl: "https://github.com/example/sneha-rest-api",
      maxScore: 100,
    },
    {
      id: "asg-03",
      studentName: "Karthik Nair",
      studentEmail: "karthik.n@example.com",
      batchCode: "PY-2026-B1",
      assignmentTitle: "Django Celery Async Task Processing",
      submittedAt: "Yesterday, 04:15 PM",
      status: "GRADED" as const,
      fileUrl: "https://github.com/example/karthik-celery",
      score: 94,
      maxScore: 100,
      feedback: "Clean architecture, proper worker concurrency and robust exponential backoff handling.",
    },
  ],
  doubts: [
    {
      id: "dbt-01",
      studentName: "Pooja Kulkarni",
      batchCode: "PY-2026-B1",
      topic: "ORM select_related vs prefetch_related N+1 queries",
      urgency: "HIGH" as const,
      requestedAt: "Today, 10:15 AM",
      status: "WAITING" as const,
    },
    {
      id: "dbt-02",
      studentName: "Aryan Verma",
      batchCode: "PY-2026-B1",
      topic: "Race conditions in useEffect cleanup with AbortController",
      urgency: "MEDIUM" as const,
      requestedAt: "Today, 08:30 AM",
      status: "WAITING" as const,
    },
    {
      id: "dbt-03",
      studentName: "Ananya Joshi",
      batchCode: "PY-2026-B1",
      topic: "Dynamic Programming memoization vs tabulation",
      urgency: "HIGH" as const,
      requestedAt: "Yesterday, 03:00 PM",
      status: "SCHEDULED" as const,
      meetingTime: "Today, 4:30 PM",
    },
  ],
  announcements: [
    {
      id: "tann-01",
      title: "Docker Compose Practice Repositories Uploaded",
      body: "Please clone the multi-container compose repo before today's session.",
      batchCode: "PY-2026-B1",
      createdAt: "12 Nov 2026",
    },
    {
      id: "tann-02",
      title: "TanStack Query v5 Code Sandbox Links",
      body: "Sandbox examples for query cancellation and retry strategies are now in student LMS units.",
      batchCode: "CLOUD-2026-A1",
      createdAt: "10 Nov 2026",
    },
  ],
};

function resolveTrainerIdentity(request: Request): { email?: string; id?: string } | null {
  const url = new URL(request.url);
  const paramEmail = url.searchParams.get("trainerEmail") || url.searchParams.get("email");
  if (paramEmail) return { email: paramEmail };

  const crmHeader = request.headers.get("x-crm-session");
  if (crmHeader) {
    try {
      const parsed = JSON.parse(crmHeader);
      if (parsed.email) return { email: parsed.email, id: parsed.userId };
    } catch {}
  }
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)crm_session=([^;]*)/);
  if (match) {
    try {
      const parsed = JSON.parse(decodeURIComponent(match[1]));
      if (parsed.email) return { email: parsed.email, id: parsed.userId };
    } catch {}
  }
  return null;
}

export async function handleTrainerRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/trainer/, "") || "/";
  const method = request.method.toUpperCase();

  try {
    const pool = getTrainerPool();
    const identity = resolveTrainerIdentity(request);
    let trainerId: string | null = null;
    try {
      trainerId = await resolveTrainerProfileId(pool, identity);
    } catch (dbErr) {
      if (isDbConnectionError(dbErr)) {
        trainerId = null;
      } else {
        throw dbErr;
      }
    }

    if (path === "/" && method === "GET") {
      try {
        if (!trainerId) return jsonRes(inMemoryTrainerStore);
        return jsonRes(await getTrainerSnapshot(pool, trainerId));
      } catch (dbErr) {
        if (isDbConnectionError(dbErr)) {
          return jsonRes(inMemoryTrainerStore);
        }
        throw dbErr;
      }
    }

    if (path === "/attendance" && method === "POST") {
      const body = await request.json();
      try {
        if (trainerId) await saveAttendanceRecords(pool, trainerId, body.batchCode, body.records);
      } catch (dbErr) {
        if (!isDbConnectionError(dbErr)) throw dbErr;
      }
      if (body.batchCode && Array.isArray(body.records)) {
        inMemoryTrainerStore.rosterMap[body.batchCode as keyof typeof inMemoryTrainerStore.rosterMap] = body.records;
      }
      return jsonRes({ ok: true });
    }

    const gradeMatch = path.match(/^\/assignments\/([^/]+)\/grade$/);
    if (gradeMatch && method === "POST") {
      const body = await request.json();
      try {
        if (trainerId) await gradeSubmissionRecord(pool, gradeMatch[1], body.score, body.feedback, trainerId);
      } catch (dbErr) {
        if (!isDbConnectionError(dbErr)) throw dbErr;
      }
      const targetAsg = inMemoryTrainerStore.assignments.find((a) => a.id === gradeMatch[1]);
      if (targetAsg) {
        targetAsg.status = "GRADED";
        targetAsg.score = body.score;
        targetAsg.feedback = body.feedback;
        inMemoryTrainerStore.stats.pendingReviews = inMemoryTrainerStore.assignments.filter((a) => (a.status as string) === "PENDING" || (a.status as string) === "PENDING_REVIEW").length;
      }
      return jsonRes({ ok: true });
    }

    const doubtMatch = path.match(/^\/doubts\/([^/]+)\/accept$/);
    if (doubtMatch && method === "POST") {
      try {
        await acceptDoubtRecord(pool, doubtMatch[1]);
      } catch (dbErr) {
        if (!isDbConnectionError(dbErr)) throw dbErr;
      }
      const targetDbt = inMemoryTrainerStore.doubts.find((d) => d.id === doubtMatch[1]);
      if (targetDbt) {
        targetDbt.status = "SCHEDULED";
        targetDbt.meetingTime = "Today, 5:00 PM";
        inMemoryTrainerStore.stats.openDoubts = inMemoryTrainerStore.doubts.filter((d) => d.status === "WAITING").length;
      }
      return jsonRes({ ok: true });
    }

    if (path === "/announcements" && method === "POST") {
      const body = await request.json();
      try {
        const created = await createTrainerAnnouncementRecord(pool, body);
        return jsonRes({ announcement: created });
      } catch (dbErr) {
        if (!isDbConnectionError(dbErr)) throw dbErr;
        const created = {
          id: `tann-${Date.now()}`,
          title: body.title,
          body: body.body,
          batchCode: body.batchCode || "All Batches",
          createdAt: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        };
        inMemoryTrainerStore.announcements.unshift(created);
        return jsonRes({ announcement: created });
      }
    }

    return jsonRes({ error: `Trainer endpoint not found: ${method} ${path}` }, 404);
  } catch (err) {
    if (isDbConnectionError(err)) {
      if (path === "/" && method === "GET") {
        return jsonRes(inMemoryTrainerStore);
      }
      return jsonRes({ ok: true });
    }
    console.error("[Trainer API] error:", err);
    return jsonRes({ error: err instanceof Error ? err.message : "Trainer service unavailable" }, 500);
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

export async function dispatchNodeTrainerRequest(req: NodeReqLike, res: NodeResLike): Promise<void> {
  const method = (req.method || "GET").toUpperCase();
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers || {})) {
    if (Array.isArray(v)) headers.set(k, v.join(", "));
    else if (typeof v === "string") headers.set(k, v);
  }
  let bodyBuffer: Uint8Array | undefined;
  if (method !== "GET" && method !== "HEAD" && typeof req.on === "function") {
    const rawText = await new Promise<string>((resolve) => {
      let acc = "";
      req.on!("data", (chunk) => {
        if (chunk) acc += String(chunk);
      });
      req.on!("end", () => resolve(acc));
      req.on!("error", () => resolve(""));
    });
    if (rawText) bodyBuffer = new TextEncoder().encode(rawText);
  }
  const webReq = new Request(new URL(req.url || "/api/trainer", "http://127.0.0.1"), {
    method,
    headers,
    body: bodyBuffer ? bodyBuffer.slice().buffer : undefined,
  });
  const webRes = await handleTrainerRequest(webReq);
  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(await webRes.text());
}
