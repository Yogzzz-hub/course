import { z } from "zod";
import { AdminApiError } from "./api";
export interface PendingOperation {
  requestId: string;
  fingerprint: string | null;
}
const storedSchema = z
  .array(
    z.object({
      requestId: z.string().min(1).max(200),
      fingerprint: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .nullable(),
    }),
  )
  .max(50);
function browserStorage() {
  try {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}
export async function commandFingerprint(command: unknown) {
  const canonical = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(canonical)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, item]) => [key, canonical(item)]),
          )
        : value;
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(canonical(command))),
  );
  return [...new Uint8Array(bytes)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}
// Only opaque request IDs and hashes are stored, never reasons, prices, OTPs or customer data.
export class OperationRegistry {
  private entries: readonly PendingOperation[] = [];
  private completed = new Set<string>();
  private listeners = new Set<() => void>();
  private key: string;
  constructor(
    scope: string,
    private storage:
      Pick<Storage, "getItem" | "setItem"> | undefined = browserStorage(),
  ) {
    this.key = `ss-admin-operations:${scope}`;
    try {
      const parsed = storedSchema.safeParse(
        JSON.parse(storage?.getItem(this.key) || "[]"),
      );
      if (parsed.success) this.entries = parsed.data;
    } catch {
      /* Server session references recover pending operations when storage is unavailable. */
    }
  }
  snapshot = () => this.entries;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(next: readonly PendingOperation[]) {
    this.entries = next;
    try {
      this.storage?.setItem(this.key, JSON.stringify(next));
    } catch {
      /* Keep recovery in memory and on the server. */
    }
    this.listeners.forEach((listener) => listener());
  }
  merge(requestIds: readonly string[]) {
    const next = requestIds
      .filter(
        (id) =>
          !this.completed.has(id) &&
          !this.entries.some((item) => item.requestId === id),
      )
      .map((requestId) => ({ requestId, fingerprint: null }));
    if (next.length) this.update([...this.entries, ...next]);
  }
  claim(fingerprint: string) {
    const existing = this.entries.find(
      (item) => item.fingerprint === fingerprint,
    );
    if (existing) return existing.requestId;
    if (this.entries.length) throw new AdminApiError(409, "locked");
    const requestId = crypto.randomUUID();
    this.update([{ requestId, fingerprint }]);
    return requestId;
  }
  resolve(requestId: string) {
    this.completed.add(requestId);
    if (this.entries.some((item) => item.requestId === requestId))
      this.update(this.entries.filter((item) => item.requestId !== requestId));
  }
}
