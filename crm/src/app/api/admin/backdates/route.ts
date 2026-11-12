import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const BackdateSchema = z.object({
  trainerProfileId: z.string().min(1, "Trainer is required"),
  batchId: z.string().min(1, "Batch is required"),
  allowedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date (YYYY-MM-DD)"),
  reason: z.string().min(5, "Reason is required (min 5 chars)"),
  validHours: z.number().min(1).max(72).default(24),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["ADMIN", "MANAGER"]);
    const body = await req.json();
    const parsed = BackdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const { trainerProfileId, batchId, allowedDate, reason, validHours } = parsed.data;

    // If manager, verify delegation setting
    if (session.role === "MANAGER") {
      const settings = await prisma.academySettings.findUnique({ where: { id: "default" } });
      if (!settings?.allowManagerApprovals) {
        return NextResponse.json(
          { error: "Backdate authorization delegation is not granted to managers." },
          { status: 403 }
        );
      }
    }

    const targetDate = new Date(`${allowedDate}T00:00:00Z`);
    const expiresAt = new Date(Date.now() + validHours * 60 * 60 * 1000);

    const record = await prisma.backdateAuthorization.create({
      data: {
        trainerProfileId,
        batchId,
        allowedDate: targetDate,
        authorizedById: session.userId,
        reason: reason.trim(),
        expiresAt,
      },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "BACKDATE_AUTHORIZED",
      entityType: "BackdateAuthorization",
      entityId: record.id,
      details: { trainerProfileId, batchId, allowedDate, reason, expiresAt },
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
    });

    return NextResponse.json({
      success: true,
      id: record.id,
      message: `Backdated attendance entry authorized for date ${allowedDate} until ${expiresAt.toLocaleTimeString()}.`,
    });
  } catch (error: any) {
    console.error("Backdate authorization error:", error);
    return NextResponse.json({ error: "Failed to authorize backdate access" }, { status: 500 });
  }
}
