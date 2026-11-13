import {
  getManagerPool,
  getManagerSnapshot,
  updateLeadRecord,
  updateAdmissionRecord,
  updateAlertRecord,
  createAnnouncementRecord,
  getManagerScheduledClasses,
  createManagerScheduledClass,
  deleteManagerScheduledClass,
  createLeadRecord,
} from "../../backend/services/manager/pgStore.ts";

function jsonRes(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

export async function handleManagerRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/manager/, "") || "/";
  const method = request.method.toUpperCase();

  try {
    const pool = getManagerPool();

    if (path === "/" && method === "GET") {
      return jsonRes(await getManagerSnapshot(pool));
    }

    if (path === "/schedule" && method === "GET") {
      return jsonRes({ classes: await getManagerScheduledClasses(pool) });
    }

    if (path === "/schedule" && method === "POST") {
      const body = await request.json();
      const created = await createManagerScheduledClass(pool, body);
      return jsonRes({ item: created });
    }

    const deleteScheduleMatch = path.match(/^\/schedule\/([^/]+)$/);
    if (deleteScheduleMatch && (method === "DELETE" || method === "POST")) {
      await deleteManagerScheduledClass(pool, deleteScheduleMatch[1]);
      return jsonRes({ ok: true });
    }

    if (path === "/leads" && method === "POST") {
      const body = await request.json();
      const created = await createLeadRecord(pool, body);
      return jsonRes({ lead: created });
    }

    const leadMatch = path.match(/^\/leads\/([^/]+)$/);
    if (leadMatch && method === "POST") {
      const body = await request.json();
      await updateLeadRecord(pool, leadMatch[1], body);
      return jsonRes({ ok: true });
    }

    const admissionMatch = path.match(/^\/admissions\/([^/]+)$/);
    if (admissionMatch && method === "POST") {
      const body = await request.json();
      await updateAdmissionRecord(pool, admissionMatch[1], body.status);
      return jsonRes({ ok: true });
    }

    const alertMatch = path.match(/^\/alerts\/([^/]+)$/);
    if (alertMatch && method === "POST") {
      const body = await request.json();
      await updateAlertRecord(pool, alertMatch[1], body);
      return jsonRes({ ok: true });
    }

    if (path === "/announcements" && method === "POST") {
      const body = await request.json();
      const created = await createAnnouncementRecord(pool, body);
      return jsonRes({ announcement: created });
    }

    return jsonRes({ error: `Manager endpoint not found: ${method} ${path}` }, 404);
  } catch (err) {
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
