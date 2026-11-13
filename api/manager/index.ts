import {
  getManagerPool,
  getManagerSnapshot,
  updateLeadRecord,
  updateAdmissionRecord,
  updateAlertRecord,
  createAnnouncementRecord,
} from "../../backend/services/manager/pgStore.ts";

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

// In-memory fallback state for dev / preview mode when PostgreSQL is offline
const inMemoryStore = {
  stats: {
    newEnquiries: 14,
    pendingFollowUps: 8,
    activeStudents: 50,
    runningBatches: 3,
    attendanceAlertsCount: 3,
    pendingAdmissionsCount: 1,
    totalRevenue: "₹ 18,45,000",
  },
  leads: [
    {
      id: "lead-01",
      name: "Rahul Sharma",
      email: "rahul.s@example.com",
      phone: "+91 98765 43210",
      track: "Python Full Stack",
      date: "12 Nov 2026",
      status: "New Lead" as const,
      assignedCounsellor: "Ananya Deshmukh",
      notes: ["Interested in weekend cohort", "Background in MCA"],
      source: "Website Form",
      score: 55,
    },
    {
      id: "lead-02",
      name: "Priya Nair",
      email: "priya.nair@example.com",
      phone: "+91 98765 12345",
      track: "Full Stack Java",
      date: "11 Nov 2026",
      status: "Counselling Scheduled" as const,
      assignedCounsellor: "Rohan Sen",
      notes: ["Demo session scheduled for 14 Nov 4 PM"],
      source: "Google Search",
      score: 75,
    },
    {
      id: "lead-03",
      name: "Anand Verma",
      email: "anand.v@example.com",
      phone: "+91 91234 56789",
      track: "Cloud & DevOps",
      date: "10 Nov 2026",
      status: "Offer Extended" as const,
      assignedCounsellor: "Kavita Rao",
      notes: ["Early-bird scholarship applied (15%)", "Sent offer letter"],
      source: "LinkedIn Referral",
      score: 90,
    },
    {
      id: "lead-04",
      name: "Divya Krishnan",
      email: "divya.k@example.com",
      phone: "+91 98451 22334",
      track: "Data Science & AI",
      date: "09 Nov 2026",
      status: "Admitted" as const,
      assignedCounsellor: "Ananya Deshmukh",
      notes: ["Seat confirmed", "Orientation welcome kit dispatched"],
      source: "Direct Booking",
      score: 98,
    },
    {
      id: "lead-05",
      name: "Saurabh Mishra",
      email: "saurabh.m@example.com",
      phone: "+91 99887 76655",
      track: "Cyber Security",
      date: "08 Nov 2026",
      status: "Lost" as const,
      assignedCounsellor: "Rohan Sen",
      notes: ["Fee structure beyond current budget; followup in Q1"],
      source: "Instagram Campaign",
      score: 30,
    },
  ],
  admissions: [
    {
      id: "adm-01",
      studentName: "Divya Krishnan",
      email: "divya.k@example.com",
      phone: "+91 98451 22334",
      registrationNumber: "REG-2026-0891",
      course: "Data Science & AI",
      batch: "DS-2026-A1",
      feeStatus: "Full Payment Verified" as const,
      agreementSigned: true,
      enrolledDate: "09 Nov 2026",
      status: "APPROVED" as const,
    },
    {
      id: "adm-02",
      studentName: "Anand Verma",
      email: "anand.v@example.com",
      phone: "+91 91234 56789",
      registrationNumber: "REG-2026-0892",
      course: "Cloud & DevOps",
      batch: "CLOUD-2026-A1",
      feeStatus: "1st Installment Paid" as const,
      agreementSigned: true,
      enrolledDate: "10 Nov 2026",
      status: "PENDING_VERIFICATION" as const,
    },
    {
      id: "adm-03",
      studentName: "Priya Nair",
      email: "priya.nair@example.com",
      phone: "+91 98765 12345",
      registrationNumber: "REG-2026-0893",
      course: "Full Stack Java",
      batch: "JAVA-2026-C2",
      feeStatus: "Installment Due" as const,
      agreementSigned: false,
      enrolledDate: "11 Nov 2026",
      status: "DRAFT" as const,
    },
  ],
  cohorts: [
    {
      id: "coh-01",
      name: "Python Full Stack Mastery (PY-2026-B1)",
      code: "PY-2026-B1",
      courseTitle: "Python Full Stack",
      facultyName: "Dr. Vikram Malhotra",
      enrolledCount: 28,
      maxSeats: 35,
      startDate: "01 Oct 2026",
      endDate: "31 Mar 2027",
      status: "ACTIVE" as const,
      attendanceAverage: 91,
      progress: 68,
    },
    {
      id: "coh-02",
      name: "AWS & DevOps Engineering (CLOUD-2026-A1)",
      code: "CLOUD-2026-A1",
      courseTitle: "Cloud & DevOps",
      facultyName: "Sneha Kulkarni",
      enrolledCount: 22,
      maxSeats: 30,
      startDate: "15 Oct 2026",
      endDate: "15 Apr 2027",
      status: "ACTIVE" as const,
      attendanceAverage: 88,
      progress: 42,
    },
    {
      id: "coh-03",
      name: "Full Stack Java Enterprise (JAVA-2026-C2)",
      code: "JAVA-2026-C2",
      courseTitle: "Full Stack Java",
      facultyName: "Rajesh Nair",
      enrolledCount: 15,
      maxSeats: 30,
      startDate: "01 Dec 2026",
      endDate: "31 May 2027",
      status: "UPCOMING" as const,
      attendanceAverage: 0,
      progress: 0,
    },
  ],
  alerts: [
    {
      id: "alert-01",
      studentId: "stu-101",
      studentName: "Rohan Gupta",
      email: "rohan.g@example.com",
      phone: "+91 98111 22334",
      batchCode: "PY-2026-B1",
      batchName: "Python Full Stack",
      attendancePercentage: 62.5,
      missedSessions: 6,
      lastAttended: "02 Nov 2026",
      riskLevel: "CRITICAL" as const,
      warningSent: false,
    },
    {
      id: "alert-02",
      studentId: "stu-102",
      studentName: "Meera Iyer",
      email: "meera.i@example.com",
      phone: "+91 98222 33445",
      batchCode: "PY-2026-B1",
      batchName: "Python Full Stack",
      attendancePercentage: 68.0,
      missedSessions: 4,
      lastAttended: "05 Nov 2026",
      riskLevel: "HIGH" as const,
      warningSent: true,
    },
    {
      id: "alert-03",
      studentId: "stu-103",
      studentName: "Aditya Roy",
      email: "aditya.r@example.com",
      phone: "+91 98333 44556",
      batchCode: "CLOUD-2026-A1",
      batchName: "Cloud & DevOps",
      attendancePercentage: 70.8,
      missedSessions: 3,
      lastAttended: "08 Nov 2026",
      riskLevel: "MEDIUM" as const,
      warningSent: false,
    },
  ],
  payments: [
    {
      id: "pay-01",
      invoiceId: "INV-2026-4401",
      studentName: "Divya Krishnan",
      course: "Data Science & AI",
      amount: "₹ 45,000",
      dueDate: "05 Nov 2026",
      paidDate: "05 Nov 2026",
      status: "PAID" as const,
      method: "UPI / NetBanking",
    },
    {
      id: "pay-02",
      invoiceId: "INV-2026-4402",
      studentName: "Anand Verma",
      course: "Cloud & DevOps",
      amount: "₹ 25,000",
      dueDate: "20 Nov 2026",
      status: "PENDING" as const,
    },
    {
      id: "pay-03",
      invoiceId: "INV-2026-4403",
      studentName: "Rohan Gupta",
      course: "Python Full Stack",
      amount: "₹ 25,000",
      dueDate: "01 Nov 2026",
      status: "OVERDUE" as const,
    },
  ],
  counsellors: [
    {
      id: "coun-01",
      name: "Ananya Deshmukh",
      email: "ananya.d@aintrixacademy.edu",
      phone: "+91 99000 11223",
      activeLeadsCount: 18,
      convertedCount: 12,
      targetCount: 15,
      conversionRate: 80.0,
      status: "ACTIVE" as const,
    },
    {
      id: "coun-02",
      name: "Rohan Sen",
      email: "rohan.s@aintrixacademy.edu",
      phone: "+91 99000 22334",
      activeLeadsCount: 14,
      convertedCount: 9,
      targetCount: 12,
      conversionRate: 75.0,
      status: "ACTIVE" as const,
    },
    {
      id: "coun-03",
      name: "Kavita Rao",
      email: "kavita.r@aintrixacademy.edu",
      phone: "+91 99000 33445",
      activeLeadsCount: 16,
      convertedCount: 11,
      targetCount: 14,
      conversionRate: 78.6,
      status: "ACTIVE" as const,
    },
  ],
  announcements: [
    {
      id: "ann-01",
      title: "Mid-Term Evaluation Schedule Released",
      body: "Mid-term coding assessments for all active cohorts will commence on 25 Nov 2026. Hall tickets and slot allocations are visible in student portals.",
      author: "Operations Manager",
      audience: "All Active Batches",
      createdAt: "12 Nov 2026",
      priority: "URGENT" as const,
    },
    {
      id: "ann-02",
      title: "Guest Masterclass: Microservices & Event Architecture",
      body: "Join us this Saturday at 5 PM IST for an industry session with a Principal Engineer from AWS on scalable Kafka event streams.",
      author: "Academic Coordinator",
      audience: "Python & Cloud Batches",
      createdAt: "10 Nov 2026",
      priority: "NORMAL" as const,
    },
  ],
  reports: {
    monthlyAdmissions: [
      { month: "Jun 2026", leads: 45, admissions: 14 },
      { month: "Jul 2026", leads: 62, admissions: 22 },
      { month: "Aug 2026", leads: 78, admissions: 28 },
      { month: "Sep 2026", leads: 85, admissions: 31 },
      { month: "Oct 2026", leads: 92, admissions: 34 },
      { month: "Nov 2026", leads: 48, admissions: 18 },
    ],
    trackBreakdown: [
      { track: "Python Full Stack", share: 38, revenue: "₹ 7,60,000" },
      { track: "Cloud & DevOps", share: 30, revenue: "₹ 6,00,000" },
      { track: "Data Science & AI", share: 20, revenue: "₹ 4,00,000" },
      { track: "Full Stack Java", share: 12, revenue: "₹ 2,40,000" },
    ],
  },
};

export async function handleManagerRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/manager/, "") || "/";
  const method = request.method.toUpperCase();

  try {
    const pool = getManagerPool();

    if (path === "/" && method === "GET") {
      try {
        return jsonRes(await getManagerSnapshot(pool));
      } catch (dbErr) {
        if (isDbConnectionError(dbErr)) {
          return jsonRes(inMemoryStore);
        }
        throw dbErr;
      }
    }

    const leadMatch = path.match(/^\/leads\/([^/]+)$/);
    if (leadMatch && method === "POST") {
      const body = await request.json();
      try {
        await updateLeadRecord(pool, leadMatch[1], body);
      } catch (dbErr) {
        if (!isDbConnectionError(dbErr)) throw dbErr;
        const targetLead = inMemoryStore.leads.find((l) => l.id === leadMatch[1]);
        if (targetLead && body.status) targetLead.status = body.status;
      }
      return jsonRes({ ok: true });
    }

    const admissionMatch = path.match(/^\/admissions\/([^/]+)$/);
    if (admissionMatch && method === "POST") {
      const body = await request.json();
      try {
        await updateAdmissionRecord(pool, admissionMatch[1], body.status);
      } catch (dbErr) {
        if (!isDbConnectionError(dbErr)) throw dbErr;
        const targetAdm = inMemoryStore.admissions.find((a) => a.id === admissionMatch[1]);
        if (targetAdm && body.status) targetAdm.status = body.status;
      }
      return jsonRes({ ok: true });
    }

    const alertMatch = path.match(/^\/alerts\/([^/]+)$/);
    if (alertMatch && method === "POST") {
      const body = await request.json();
      try {
        await updateAlertRecord(pool, alertMatch[1], body);
      } catch (dbErr) {
        if (!isDbConnectionError(dbErr)) throw dbErr;
        const targetAlert = inMemoryStore.alerts.find((a) => a.id === alertMatch[1]);
        if (targetAlert) {
          if (body.warningSent !== undefined) targetAlert.warningSent = body.warningSent;
        }
      }
      return jsonRes({ ok: true });
    }

    if (path === "/announcements" && method === "POST") {
      const body = await request.json();
      try {
        const created = await createAnnouncementRecord(pool, body);
        return jsonRes({ announcement: created });
      } catch (dbErr) {
        if (!isDbConnectionError(dbErr)) throw dbErr;
        const created = {
          id: `ann-${Date.now()}`,
          title: body.title,
          body: body.body,
          author: body.author || "Operations Manager",
          audience: body.audience || "All Active Batches",
          createdAt: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
          priority: (body.priority as "NORMAL" | "URGENT") || "NORMAL",
        };
        inMemoryStore.announcements.unshift(created);
        return jsonRes({ announcement: created });
      }
    }

    return jsonRes({ error: `Manager endpoint not found: ${method} ${path}` }, 404);
  } catch (err) {
    if (isDbConnectionError(err)) {
      if (path === "/" && method === "GET") {
        return jsonRes(inMemoryStore);
      }
      return jsonRes({ ok: true });
    }
    console.error("[Manager API] error:", err);
    return jsonRes({ error: err instanceof Error ? err.message : "Manager service unavailable" }, 500);
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

export async function dispatchNodeManagerRequest(req: NodeReqLike, res: NodeResLike): Promise<void> {
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
  const webReq = new Request(new URL(req.url || "/api/manager", "http://127.0.0.1"), {
    method,
    headers,
    body: bodyBuffer ? bodyBuffer.slice().buffer : undefined,
  });
  const webRes = await handleManagerRequest(webReq);
  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(await webRes.text());
}
