import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const ManageOccurrenceSchema = z.object({
  occurrenceId: z.string().min(1),
  action: z.enum(["CANCEL", "RESCHEDULE", "MAKEUP"]),
  reason: z.string().min(3, "Reason is required"),
  newDate: z.string().optional(),
  newStartTime: z.string().optional(),
  newEndTime: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);

    const batchId = searchParams.get("batchId");
    const trainerProfileId = searchParams.get("trainerProfileId");
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const whereClause: any = {};

    // Role-level data fencing:
    if (session.role === "STUDENT") {
      // Find batches student is enrolled in
      const enrollments = await prisma.studentBatchEnrollment.findMany({
        where: {
          studentProfile: { userId: session.userId },
          status: "ACTIVE",
        },
        select: { batchId: true },
      });
      whereClause.batchId = { in: enrollments.map((e) => e.batchId) };
    } else if (session.role === "TRAINER") {
      const tr = await prisma.trainerProfile.findUnique({
        where: { userId: session.userId },
      });
      if (tr) {
        whereClause.trainerProfileId = tr.id;
      }
    } else if (batchId) {
      whereClause.batchId = batchId;
    } else if (trainerProfileId) {
      whereClause.trainerProfileId = trainerProfileId;
    }

    if (startDateStr && endDateStr) {
      whereClause.plannedDate = {
        gte: new Date(startDateStr),
        lte: new Date(endDateStr),
      };
    }

    const occurrences = await prisma.sessionOccurrence.findMany({
      where: whereClause,
      include: {
        batch: {
          include: {
            course: { select: { title: true, code: true } },
          },
        },
        trainerProfile: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        classSession: {
          select: {
            id: true,
            sessionType: true,
            isLocked: true,
            notes: true,
            _count: { select: { attendanceEntries: true, subtopicCoverages: true } },
          },
        },
      },
      orderBy: { plannedDate: "asc" },
    });

    return NextResponse.json({ occurrences });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Calendar fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch calendar" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["ADMIN", "MANAGER", "TRAINER"]);
    const body = await req.json();
    const parsed = ManageOccurrenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const { occurrenceId, action, reason, newDate, newStartTime, newEndTime } = parsed.data;

    const occurrence = await prisma.sessionOccurrence.findUnique({
      where: { id: occurrenceId },
      include: { batch: true },
    });

    if (!occurrence) {
      return NextResponse.json({ error: "Session occurrence not found" }, { status: 404 });
    }

    if (action === "CANCEL") {
      const updated = await prisma.sessionOccurrence.update({
        where: { id: occurrenceId },
        data: {
          status: "CANCELLED",
          cancellationReason: reason.trim(),
        },
      });

      await logAuditEvent({
        userId: session.userId,
        action: "SESSION_CANCELLED",
        entityType: "SessionOccurrence",
        entityId: occurrenceId,
        details: { batch: occurrence.batch.code, reason },
      });

      return NextResponse.json({
        success: true,
        message: "Session marked cancelled. No student absences generated.",
        occurrence: updated,
      });
    }

    if (action === "RESCHEDULE") {
      if (!newDate) {
        return NextResponse.json({ error: "New date is required for rescheduling" }, { status: 400 });
      }

      const updated = await prisma.sessionOccurrence.update({
        where: { id: occurrenceId },
        data: {
          plannedDate: new Date(`${newDate}T00:00:00Z`),
          plannedStartTime: newStartTime || occurrence.plannedStartTime,
          plannedEndTime: newEndTime || occurrence.plannedEndTime,
          status: "POSTPONED",
          cancellationReason: `Rescheduled: ${reason}`,
        },
      });

      await logAuditEvent({
        userId: session.userId,
        action: "SESSION_RESCHEDULED",
        entityType: "SessionOccurrence",
        entityId: occurrenceId,
        details: { batch: occurrence.batch.code, newDate, reason },
      });

      return NextResponse.json({
        success: true,
        message: "Session successfully rescheduled.",
        occurrence: updated,
      });
    }

    return NextResponse.json({ error: "Action not supported" }, { status: 400 });
  } catch (error: any) {
    console.error("Calendar mutate error:", error);
    return NextResponse.json({ error: "Failed to update calendar occurrence" }, { status: 500 });
  }
}
