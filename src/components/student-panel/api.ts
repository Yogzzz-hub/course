import { z } from "zod";
import {
  assignmentSchema,
  assignmentsSchema,
  checkoutInputSchema,
  dashboardSchema,
  learningPlanSchema,
  mentorshipSchema,
  orderSchema,
  paymentsSchema,
  sessionResponseSchema,
  sessionsSchema,
  slotsSchema,
  type PaymentGateway,
  type StudentApi,
  type MutationContext,
} from "./contracts";
import { submissionError } from "./utils";

export class StudentApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: "http" | "network" | "contract" | "preview" = "http",
  ) {
    super("The student service could not complete the request.");
    this.name = "StudentApiError";
  }
}
export function friendlyError(error: unknown) {
  if (error instanceof StudentApiError) {
    if (error.code === "preview")
      return "This is a read-only local demo. Payments, bookings and submissions are disabled.";
    if (error.status === 503)
      return "The student service is unavailable. It may not be connected in this local environment. Please retry or contact support.";
    if (error.status === 401)
      return "Your session has expired. Please sign in again.";
    if (error.status === 403)
      return "This action is not available for your account. Refresh your session or contact support.";
    if (error.status === 409)
      return "The details have changed or the slot is no longer available. Refresh and review before trying again.";
    if (error.status === 413)
      return "This attachment is too large. Choose a file under 10 MB.";
    if (error.status === 429)
      return "Too many requests. Please wait a moment and try again.";
    if (error.code === "contract")
      return "The service returned incomplete information. Please refresh or contact support.";
  }
  return "We could not complete this request. Check your connection and try again.";
}
export interface HttpStudentApiOptions {
  baseUrl?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}
export function createHttpStudentApi({
  baseUrl = "/api/student",
  fetcher = fetch,
  timeoutMs = 20000,
}: HttpStudentApiOptions = {}): StudentApi {
  const base = baseUrl.replace(/\/$/, "");
  const parsed = new URL(base, "https://student-api.invalid");
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    /[\\\s]/.test(base) ||
    base.startsWith("//") ||
    (!base.startsWith("/") && !base.startsWith("https://"))
  )
    throw new Error(
      "Student API must use a local path or HTTPS without credentials, query or fragment.",
    );
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
    throw new Error("A positive request timeout is required.");
  async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    options: {
      signal?: AbortSignal;
      body?: unknown;
      context?: MutationContext;
      method?: "POST";
    } = {},
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const abort = () => controller.abort();
    if (options.signal?.aborted) controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    try {
      const multipart = options.body instanceof FormData;
      const response = await fetcher(base + path, {
        method: options.method || "GET",
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(options.body && !multipart
            ? { "Content-Type": "application/json" }
            : {}),
          ...(options.context
            ? {
                "X-CSRF-Token": options.context.csrfToken,
                "Idempotency-Key": options.context.requestId,
              }
            : {}),
        },
        body: options.body
          ? multipart
            ? (options.body as FormData)
            : JSON.stringify(options.body)
          : undefined,
      });
      if (!response.ok) throw new StudentApiError(response.status);
      let body: unknown;
      try {
        body = response.status === 204 ? undefined : await response.json();
      } catch {
        throw new StudentApiError(502, "contract");
      }
      const result = schema.safeParse(body);
      if (!result.success) throw new StudentApiError(502, "contract");
      return result.data;
    } catch (error) {
      if (error instanceof StudentApiError || options.signal?.aborted)
        throw error;
      throw new StudentApiError(0, "network");
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
    }
  }
  const post = <T>(
    path: string,
    schema: z.ZodType<T>,
    body: unknown,
    context: MutationContext,
  ) => request(path, schema, { method: "POST", body, context });
  return {
    session: async (signal) =>
      (await request("/session", sessionResponseSchema, { signal })).session,
    learningPlan: (signal) =>
      request("/learning-plan", learningPlanSchema.nullable(), { signal }),
    dashboard: (signal) => request("/dashboard", dashboardSchema, { signal }),
    assignments: async (signal) =>
      (await request("/assignments", assignmentsSchema, { signal }))
        .assignments,
    mentorship: (signal) =>
      request("/mentorship", mentorshipSchema, { signal }),
    slots: async (timeZone, signal) =>
      (
        await request(
          `/mentorship/slots?timeZone=${encodeURIComponent(timeZone)}`,
          slotsSchema,
          { signal },
        )
      ).slots,
    payments: (signal) => request("/payments", paymentsSchema, { signal }),
    sessions: async (signal) =>
      (await request("/sessions", sessionsSchema, { signal })).sessions,
    order: (id, signal) =>
      request(`/orders/${encodeURIComponent(id)}`, orderSchema, { signal }),
    checkout: async (input, context) => {
      const order = await post(
        "/checkout",
        orderSchema,
        checkoutInputSchema.parse(input),
        context,
      );
      if (
        order.amountMinor !== input.expectedAmountMinor ||
        order.currency !== input.currency
      )
        throw new StudentApiError(502, "contract");
      return order;
    },
    payInstalment: (id, context) =>
      post(
        `/instalments/${encodeURIComponent(id)}/checkout`,
        orderSchema,
        {},
        context,
      ),
    submit: (input, context) => {
      if (submissionError(input.repositoryUrl, input.liveUrl, input.file))
        throw new StudentApiError(422);
      const form = new FormData();
      form.set("repositoryUrl", input.repositoryUrl);
      form.set("liveUrl", input.liveUrl);
      if (input.file) form.set("attachment", input.file);
      return post(
        `/assignments/${encodeURIComponent(input.assignmentId)}/submissions`,
        assignmentSchema,
        form,
        context,
      );
    },
    bookMentorship: (slotId, context) =>
      post("/mentorship/bookings", mentorshipSchema, { slotId }, context),
    completeOnboarding: (id, context) =>
      post(
        `/onboarding/${encodeURIComponent(id)}/complete`,
        dashboardSchema,
        {},
        context,
      ),
    logout: (context) => post("/logout", z.void(), {}, context),
  };
}
// A redirect URL comes from the server, but must still match an explicitly configured provider origin.
export function createHostedPaymentGateway(
  allowedOrigins: readonly string[],
  navigate = (url: string) => window.location.assign(url),
): PaymentGateway {
  const origins = new Set(
    allowedOrigins.map((origin) => {
      const url = new URL(origin);
      if (url.protocol !== "https:")
        throw new Error("Payment origins must use HTTPS.");
      return url.origin;
    }),
  );
  return {
    async open(order) {
      if (
        order.status !== "pending" ||
        !order.checkoutUrl ||
        Date.parse(order.expiresAt) <= Date.now()
      )
        throw new Error("This payment link is unavailable or expired.");
      const url = new URL(order.checkoutUrl);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        !origins.has(url.origin)
      )
        throw new Error("Payment provider is not configured.");
      navigate(url.href);
    },
  };
}
