import { prisma } from "./prisma";

export async function logAuditEvent(params: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}) {
  try {
    await prisma.auditEvent.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        detailsJson: params.details ? JSON.stringify(params.details) : null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit event:", error);
  }
}

/**
 * Transaction-safe strict audit logger: throws on failure so enclosing DB transactions roll back.
 */
export async function logAuditEventStrict(
  params: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: Record<string, unknown> | null;
    ipAddress?: string | null;
  },
  txPrisma?: typeof prisma
) {
  const db = txPrisma || prisma;
  return await db.auditEvent.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      detailsJson: params.details ? JSON.stringify(params.details) : null,
      ipAddress: params.ipAddress || null,
    },
  });
}

export {
  AuditWriteError,
  buildAuditRecord,
  runWithAtomicAudit,
} from "./financier/audit";

