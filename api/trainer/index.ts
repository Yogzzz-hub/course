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
    const trainerId = await resolveTrainerProfileId(pool, identity);

    if (path === "/" && method === "GET") {
      return jsonRes(await getTrainerSnapshot(pool, trainerId));
    }

    if (!trainerId) return jsonRes({ error: "No trainer profile exists yet." }, 404);

    if (path === "/attendance" && method === "POST") {
      const body = await request.json();
      await saveAttendanceRecords(pool, trainerId, body.batchCode, body.records);
      return jsonRes({ ok: true });
    }

    const gradeMatch = path.match(/^\/assignments\/([^/]+)\/grade$/);
    if (gradeMatch && method === "POST") {
      const body = await request.json();
      await gradeSubmissionRecord(pool, gradeMatch[1], body.score, body.feedback, trainerId);
      return jsonRes({ ok: true });
    }

    const doubtMatch = path.match(/^\/doubts\/([^/]+)\/accept$/);
    if (doubtMatch && method === "POST") {
      await acceptDoubtRecord(pool, doubtMatch[1]);
      return jsonRes({ ok: true });
    }

    if (path === "/announcements" && method === "POST") {
      const body = await request.json();
      const created = await createTrainerAnnouncementRecord(pool, body);
      return jsonRes({ announcement: created });
    }

    return jsonRes({ error: `Trainer endpoint not found: ${method} ${path}` }, 404);
  } catch (err) {
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
