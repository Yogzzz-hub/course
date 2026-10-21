import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const CorrectionSchema = z.object({
  classSessionId: z.string().min(1, "Class session ID is required"),
  targetField: z.string().min(1, "Target field is required"),
  oldValue: z.string().min(1, "Existing value is required"),
  proposedValue: z.string().min(1, "Proposed value is required"),
  reason: z.string().min(5, "A descriptive reason is required (min 5 characters)"),
});

// GET: List corrections for trainer or admin
export async function GET() {
  try {
    const session = await requireAuth(["TRAINER", "ADMIN", "MANAGER"]);

    const whereClause: any = {};
    if (session.role === "TRAINER") {
      whereClause.requestedById = session.userId;
    }

    const corrections = await prisma.correctionRequest.findMany({
      where: whereClause,
      include: {
        classSession: {
          include: {
            batch: { select: { code: true } },
          },
        },
        requestedBy: { select: { name: true, email: true } },
        reviewedBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ corrections });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to load corrections" }, { status: 500 });
  }
}

// POST: Submit new correction request
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["TRAINER", "ADMIN"]);
    const body = await req.json();
    const parsed = CorrectionSchema.safeParse(body);

    if (!parsed.success) {
      const err = parsed.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: err }, { status: 400 });
    }

    const { classSessionId, targetField, oldValue, proposedValue, reason } = parsed.data;

    // Verify session exists and belongs to trainer (if trainer)
    const classSession = await prisma.classSession.findUnique({
      where: { id: classSessionId },
      include: {
        batch: {
          include: {
            trainerAllocations: true,
          },
        },
      },
    });

    if (!classSession) {
      return NextResponse.json({ error: "Class session not found." }, { status: 404 });
    }

    if (session.role === "TRAINER") {
      const isAllocated = classSession.batch.trainerAllocations.some(
        (a) => a.trainerProfileId === session.profileId
      );
      if (!isAllocated) {
        return NextResponse.json(
          { error: "You can only request corrections for sessions from your assigned batches." },
          { status: 403 }
        );
      }
    }

    const correction = await prisma.correctionRequest.create({
      data: {
        classSessionId,
        requestedById: session.userId,
        targetField,
        oldValue,
        proposedValue,
        reason: reason.trim(),
        status: "PENDING",
      },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "CORRECTION_REQUESTED",
      entityType: "CorrectionRequest",
      entityId: correction.id,
      details: {
        batch: classSession.batch.code,
        targetField,
        proposedValue,
        reason,
      },
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
    });

    return NextResponse.json({
      success: true,
      correctionId: correction.id,
      message: "Correction request registered. It will be reviewed by an authorized Manager or Admin.",
    });
  } catch (error: any) {
    console.error("Correction submit error:", error);
    return NextResponse.json({ error: "Failed to submit correction request" }, { status: 500 });
  }
}
