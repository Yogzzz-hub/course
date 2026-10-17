import {
  classSessionSchema,
  completionRequestSchema,
  trainerWorkspaceSchema,
  type ClassSession,
  type ClassSessionInput,
  type CompletionRequest,
  type TrainerWorkspace,
} from "./contracts";
import type { SessionErrors } from "./rules";

/** What the trainer workspace needs from a backend. The demo store implements the same interface. */
export interface TrainerApi {
  workspace(signal?: AbortSignal): Promise<TrainerWorkspace>;
  /** Saves attendance and topics together as one locked record. */
  submitClassSession(input: ClassSessionInput, idempotencyKey: string): Promise<ClassSession>;
  /** Sends one student's completed course to admin for approval. */
  requestCompletion(input: { batchId: string; studentId: string }): Promise<CompletionRequest>;
}

export class AcademyApiError extends Error {
  constructor(public status: number, message: string, public fieldErrors: SessionErrors = {}) {
    super(message);
    this.name = "AcademyApiError";
  }
}

/** HTTP adapter for a future academy API; every response is validated before the UI sees it. */
export function createHttpTrainerApi({ baseUrl }: { baseUrl: string }): TrainerApi {
  const root = baseUrl.replace(/\/$/, "");
  async function call<T>(path: string, parse: (value: unknown) => T, init?: RequestInit): Promise<T> {
    const response = await fetch(`${root}${path}`, { credentials: "include", ...init, headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = body && typeof body === "object" ? body as { message?: unknown; fieldErrors?: unknown } : {};
      throw new AcademyApiError(response.status, typeof detail.message === "string" ? detail.message : "The academy service could not complete this request.", (detail.fieldErrors && typeof detail.fieldErrors === "object" ? detail.fieldErrors : {}) as SessionErrors);
    }
    return parse(body);
  }
  return {
    workspace: signal => call("/trainer/workspace", value => trainerWorkspaceSchema.parse(value), { signal }),
    submitClassSession: (input, idempotencyKey) => call("/trainer/class-sessions", value => classSessionSchema.parse(value), { method: "POST", body: JSON.stringify(input), headers: { "Idempotency-Key": idempotencyKey } }),
    requestCompletion: input => call("/trainer/completion-requests", value => completionRequestSchema.parse(value), { method: "POST", body: JSON.stringify(input) }),
  };
}
