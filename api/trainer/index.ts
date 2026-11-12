import {
  getTrainerPool,
  getTrainerSnapshot,
  saveAttendanceRecords,
  gradeSubmissionRecord,
  acceptDoubtRecord,
  createTrainerAnnouncementRecord,
} from "../../backend/services/trainer/pgStore.ts";

function jsonRes(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

async function primaryTrainerProfileId(pool: ReturnType<typeof getTrainerPool>): Promise<string | null> {
  const { rows } = await pool.query('SELECT id FROM "TrainerProfile" ORDER BY "createdAt" ASC LIMIT 1');
  return rows.length ? rows[0].id : null;
}

export async function handleTrainerRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/trainer/, "") || "/";
  const method = request.method.toUpperCase();

  try {
    const pool = getTrainerPool();

    if (path === "/" && method === "GET") {
      return jsonRes(await getTrainerSnapshot(pool));
    }

    const trainerId = await primaryTrainerProfileId(pool);
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
