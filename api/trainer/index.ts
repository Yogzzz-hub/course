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
    totalStudents: 6,
    pendingReviews: 3,
    openDoubts: 2,
    nextClassTime: "Today, 10:00 AM",
    nextClassTitle: "Python Full-Stack Engineering session",
    nextClassBatch: "BATCH-PY-2026-A",
    nextClassStudents: 3,
  },
  batches: [
    {
      id: "batch-py-a",
      name: "Python Full-Stack Engineering (BATCH-PY-2026-A)",
      code: "BATCH-PY-2026-A",
      track: "Python Full-Stack Engineering",
      studentsCount: 3,
      progress: 75,
      nextSession: "Today, 10:00 AM",
      module: "Module 2: Django REST Framework & PostgreSQL",
      schedule: "Mon, Wed, Fri • 10:00 AM - 11:30 AM IST",
      students: [
        { id: "stu-1", name: "Karthik Subramanian", email: "karthik.subramanian@apexacademy.edu", attendanceRate: 100, lastPresent: true },
        { id: "stu-3", name: "Aravind Kumar", email: "aravind.kumar@apexacademy.edu", attendanceRate: 80, lastPresent: false },
        { id: "sp-01", name: "Aravind Baskar", email: "student@apexacademy.edu", attendanceRate: 100, lastPresent: true },
      ],
    },
    {
      id: "batch-react-b",
      name: "React Frontend Engineering (BATCH-REACT-2026-B)",
      code: "BATCH-REACT-2026-B",
      track: "React Frontend Engineering",
      studentsCount: 1,
      progress: 60,
      nextSession: "Tomorrow, 2:00 PM",
      module: "Module 1: React 19 Server Components & Actions",
      schedule: "Tue, Thu, Sat • 2:00 PM - 3:30 PM IST",
      students: [
        { id: "stu-2", name: "Sneha Patel", email: "sneha.patel@apexacademy.edu", attendanceRate: 100, lastPresent: true },
      ],
    },
    {
      id: "batch-dsa-c",
      name: "DSA & System Design Mastery (BATCH-DSA-2026-C)",
      code: "BATCH-DSA-2026-C",
      track: "DSA & System Design Mastery",
      studentsCount: 2,
      progress: 50,
      nextSession: "In 2 days, 10:00 AM",
      module: "Module 2: Graph Theory & Shortest Path",
      schedule: "Mon, Wed, Fri • 10:00 AM - 11:30 AM IST",
      students: [
        { id: "stu-4", name: "Neha Verma", email: "neha.verma@apexacademy.edu", attendanceRate: 100, lastPresent: true },
        { id: "stu-5", name: "Rohan Iyer", email: "rohan.iyer@apexacademy.edu", attendanceRate: 85, lastPresent: true },
      ],
    },
  ],
  schedule: [
    {
      id: "sch-01",
      batchCode: "BATCH-PY-2026-A",
      batchName: "Python Full-Stack Engineering",
      topic: "Django REST API & Token Middleware",
      date: "Today",
      time: "10:00 AM - 11:30 AM",
      duration: "1.5 hours",
      room: "Online Live Classroom",
      attendees: 3,
      status: "SCHEDULED" as const,
      joinUrl: "https://zoom.us/j/aintrix-py-a",
    },
    {
      id: "sch-02",
      batchCode: "BATCH-REACT-2026-B",
      batchName: "React Frontend Engineering",
      topic: "React 19 Server Components & Concurrency",
      date: "Tomorrow",
      time: "02:00 PM - 03:30 PM",
      duration: "1.5 hours",
      room: "Online Live Classroom",
      attendees: 1,
      status: "SCHEDULED" as const,
      joinUrl: "https://zoom.us/j/aintrix-react-b",
    },
  ],
  rosterMap: {} as Record<string, any[]>,
  assignments: [
    {
      id: "asg-01",
      studentName: "Karthik Subramanian",
      studentEmail: "karthik.subramanian@apexacademy.edu",
      batchCode: "BATCH-PY-2026-A",
      assignmentTitle: "Django REST API & Token Middleware",
      submittedAt: "Today, 09:30 AM",
      status: "PENDING" as const,
      fileUrl: "https://github.com/karthik-sub/django-auth-api",
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
