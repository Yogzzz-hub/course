import type { AuditLogRecord, FinanceRole } from "./types.ts";

export class AuditWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuditWriteError";
  }
}

export interface AtomicAuditInput {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: FinanceRole | "SYSTEM";
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  reason?: string | null;
  requestId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export function buildAuditRecord(input: AtomicAuditInput): AuditLogRecord {
  if (!input.actorId || !input.action || !input.entityType || !input.entityId) {
    throw new AuditWriteError(
      "Incomplete audit event: actorId, action, entityType and entityId are mandatory."
    );
  }
  return {
    id: input.id,
    actorId: input.actorId,
    actorName: input.actorName,
    actorRole: input.actorRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    timestamp: input.timestamp,
    reason: input.reason ?? null,
    requestId: input.requestId,
    before: input.before ? structuredClone(input.before) : null,
    after: input.after ? structuredClone(input.after) : null,
  };
}

/**
 * Executes a financial state mutation alongside an audit record write in an all-or-nothing transaction.
 * If the work throws or audit record fails validation/write, the snapshot is restored and nothing persists.
 */
export function runWithAtomicAudit<S extends { auditLogs: AuditLogRecord[] }, R>(
  state: S,
  work: (draft: S) => { result: R; audit: AtomicAuditInput | AtomicAuditInput[] },
  onPersistAudit?: (record: AuditLogRecord) => void
): R {
  const backup = structuredClone(state);
  try {
    const draft = structuredClone(state);
    const { result, audit } = work(draft);
    const items = Array.isArray(audit) ? audit : [audit];
    if (items.length === 0) {
      throw new AuditWriteError("Every financial mutation must emit at least one audit event.");
    }

    for (const item of items) {
      const record = buildAuditRecord(item);
      if (onPersistAudit) {
        onPersistAudit(record);
      }
      draft.auditLogs.unshift(record);
    }

    // Commit draft properties atomically onto live state reference
    for (const key of Object.keys(state) as Array<keyof S>) {
      state[key] = draft[key];
    }
    return result;
  } catch (error) {
    // Full rollback to pre-transaction snapshot
    for (const key of Object.keys(backup) as Array<keyof S>) {
      state[key] = backup[key];
    }
    throw error;
  }
}
