import { z } from "zod";
import {
  adminCommandSchema,
  adminSessionSchema,
  operationSchema,
  resourceSchemas,
  type AdminApi,
  type AdminContext,
  type Resource,
  type ResourceMap,
} from "./contracts";
export class AdminApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: "http" | "network" | "contract" | "locked" = "http",
  ) {
    super("The admin service could not complete this request.");
    this.name = "AdminApiError";
  }
}
export function adminError(error: unknown) {
  if (error instanceof AdminApiError) {
    if (error.status === 503)
      return "The admin service is unavailable. It may not be connected in this local environment. Please retry or contact support.";
    if (error.code === "locked")
      return "Resolve the outstanding financial action before starting another one.";
    if (error.status === 401) return "Your session has expired. Sign in again.";
    if (error.status === 403)
      return "Your permissions or two-factor verification have changed. Refresh your session.";
    if (error.status === 409)
      return "This record changed. Refresh and review its latest version before continuing.";
    if (error.status === 429)
      return "Too many attempts. Wait a moment before trying again.";
    if (error.status === 400 || error.status === 422)
      return "Check the entered details or verification code and try again.";
    if (error.code === "contract")
      return "The service returned incomplete information. No result has been assumed.";
  }
  return "The result could not be confirmed. Check your connection and retry safely.";
}
export function createHttpAdminApi({
  baseUrl = "/api/admin",
  fetcher = fetch,
  timeoutMs = 20000,
}: {
  baseUrl?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
} = {}): AdminApi {
  const schemas: { [K in Resource]: z.ZodType<ResourceMap[K]> } =
    resourceSchemas;
  const base = baseUrl.replace(/\/$/, "");
  const url = new URL(base, "https://admin-api.invalid");
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    /[\\\s]/.test(base) ||
    base.startsWith("//") ||
    (!base.startsWith("/") && !base.startsWith("https://")) ||
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0
  )
    throw new Error(
      "Configure a local or HTTPS admin API and a positive timeout.",
    );
  async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    options: {
      signal?: AbortSignal;
      body?: unknown;
      context?: AdminContext;
    } = {},
  ): Promise<T> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (options.signal?.aborted) controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, timeoutMs);
    try {
      const response = await fetcher(base + path, {
        method: options.body === undefined ? "GET" : "POST",
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(options.body === undefined
            ? {}
            : { "Content-Type": "application/json" }),
          ...(options.context
            ? {
                "X-CSRF-Token": options.context.csrfToken,
                "Idempotency-Key": options.context.requestId,
                "X-Admin-Session": options.context.sessionKey,
              }
            : {}),
        },
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
      });
      if (!response.ok) throw new AdminApiError(response.status);
      let data: unknown;
      try {
        data = response.status === 204 ? undefined : await response.json();
      } catch {
        throw new AdminApiError(502, "contract");
      }
      const result = schema.safeParse(data);
      if (!result.success) throw new AdminApiError(502, "contract");
      return result.data;
    } catch (error) {
      if (error instanceof AdminApiError || options.signal?.aborted)
        throw error;
      throw new AdminApiError(0, "network");
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
    }
  }
  return {
    session: (signal) => request("/session", adminSessionSchema, { signal }),
    verifyTwoFactor: (input, context) =>
      request("/two-factor/verify", adminSessionSchema, {
        body: z
          .object({
            challengeId: z.string().min(1),
            code: z.string().regex(/^\d{6}$/),
          })
          .parse(input),
        context,
      }),
    read: <K extends Resource>(
      resource: K,
      params: Readonly<Record<string, string>>,
      signal?: AbortSignal,
    ) => {
      const paths: Partial<Record<Resource, string>> = {
        timeline: `/leads/${encodeURIComponent(params.id || "")}/timeline`,
        export: `/exports/${encodeURIComponent(params.id || "")}`,
      };
      const query = new URLSearchParams(
        Object.entries(params).filter(
          ([key]) =>
            !(key === "id" && ["timeline", "export"].includes(resource)),
        ),
      );
      return request(
        `${paths[resource] || "/" + resource}${query.size ? "?" + query : ""}`,
        schemas[resource],
        { signal },
      );
    },
    command: async (input, context) => {
      const command = adminCommandSchema.parse(input);
      const receipt = await request("/commands", operationSchema, {
        body: command,
        context,
      });
      if (
        receipt.requestId !== context.requestId ||
        receipt.status === "not_found"
      )
        throw new AdminApiError(502, "contract");
      return receipt;
    },
    logout: (context) => request("/logout", z.void(), { body: {}, context }),
  };
}
