import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const SessionEntrySchema = z.object({
  batchId: z.string().min(1, "Batch is required"),
  occurrenceId: z.string().optional().nullable(),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  actualStartTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid start time (HH:MM)"),
  actualEndTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid end time (HH:MM)"),
  sessionType: z.enum([
    "TEACHING",
    "REVISION",
    "ASSESSMENT",
    "PROJECT_REVIEW",
    "DOUBT_CLEARING",
    "MAKEUP",
    "OTHER",
  ]),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
  attendance: z
    .array(
      z.object({
        studentProfileId: z.string().min(1),
        status: z.enum(["PRESENT", "ABSENT", "LEAVE"]),
        notes: z.string().optional(),
      })
    )
    .min(1, "At least one student must be marked"),
  subtopicIds: z.array(z.string()).default([]),
});

// GET: Preload data for session entry form
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(["TRAINER", "ADMIN"]);
    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get("batchId");
    const dateStr = searchParams.get("date"); // YYYY-MM-DD

    if (!batchId) {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 });
    }

    // 1. Authorize: Trainer must be allocated to batch (or Admin)
    let trainerProfileId = session.profileId;
    if (session.role === "TRAINER") {
      if (!trainerProfileId) {
        const tr = await prisma.trainerProfile.findUnique({ where: { userId: session.userId } });
        trainerProfileId = tr?.id;
      }
      const isAllocated = await prisma.trainerBatchAllocation.findUnique({
        where: {
          batchId_trainerProfileId: {
            batchId,
            trainerProfileId: trainerProfileId!,
          },
        },
      });
      if (!isAllocated) {
        return NextResponse.json(
          { error: "Access denied. You are not allocated to this batch." },
          { status: 403 }
        );
      }
    }

    // 2. Fetch batch, syllabus modules, subtopics, and active enrollments
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        course: true,
        syllabusVersion: {
          include: {
            modules: {
              orderBy: { orderIndex: "asc" },
              include: {
                subtopics: {
                  orderBy: { orderIndex: "asc" },
                },
              },
            },
          },
        },
        enrollments: {
          where: { status: "ACTIVE" },
          include: {
            studentProfile: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Check existing coverage for this batch
    const existingCoverages = await prisma.subtopicCoverage.findMany({
      where: {
        classSession: { batchId },
      },
      select: { subtopicId: true },
    });
    const coveredSet = new Set(existingCoverages.map((c) => c.subtopicId));

    // Check if session for date is already submitted
    let existingSession = null;
    if (dateStr) {
      const targetDate = new Date(`${dateStr}T00:00:00Z`);
      const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
      existingSession = await prisma.classSession.findFirst({
        where: {
          batchId,
          sessionDate: {
            gte: targetDate,
            lt: nextDay,
          },
        },
        include: {
          attendanceEntries: true,
          subtopicCoverages: true,
        },
      });
    }

    // Check if backdated authorization is required and exists
    let backdateAuthorized = true;
    if (dateStr) {
      const targetDate = new Date(`${dateStr}T00:00:00`);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      if (targetDate < yesterday) {
        // Earlier than yesterday requires backdate authorization
        const authRecord = await prisma.backdateAuthorization.findFirst({
          where: {
            trainerProfileId: trainerProfileId || "",
            batchId,
            allowedDate: targetDate,
            isUsed: false,
            expiresAt: { gte: new Date() },
          },
        });
        backdateAuthorized = !!authRecord;
      }
    }

    return NextResponse.json({
      batch: {
        id: batch.id,
        code: batch.code,
        courseTitle: batch.course.title,
        startTime: batch.startTime,
        endTime: batch.endTime,
      },
      students: batch.enrollments.map((enr) => ({
        studentProfileId: enr.studentProfile.id,
        registrationNumber: enr.studentProfile.registrationNumber,
        name: enr.studentProfile.user.name,
        email: enr.studentProfile.user.email,
      })),
      modules: batch.syllabusVersion.modules.map((m) => ({
        id: m.id,
        title: m.title,
        subtopics: m.subtopics.map((st) => ({
          id: st.id,
          title: st.title,
          isRequired: st.isRequired,
          estimatedMinutes: st.estimatedMinutes,
          alreadyCovered: coveredSet.has(st.id),
        })),
      })),
      existingSession: existingSession
        ? {
            id: existingSession.id,
            sessionDate: existingSession.sessionDate,
            actualStartTime: existingSession.actualStartTime,
            actualEndTime: existingSession.actualEndTime,
            isLocked: existingSession.isLocked,
          }
        : null,
      backdateAuthorized,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("Session entry GET error:", error);
    return NextResponse.json({ error: "Failed to load session entry form data" }, { status: 500 });
  }
}

// POST: Combined Atomic Submission
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["TRAINER", "ADMIN"]);
    const body = await req.json();
    const parsed = SessionEntrySchema.safeParse(body);

    if (!parsed.success) {
      const err = parsed.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: err }, { status: 400 });
    }

    const {
      batchId,
      occurrenceId,
      sessionDate,
      actualStartTime,
      actualEndTime,
      sessionType,
      notes,
      idempotencyKey,
      attendance,
      subtopicIds,
    } = parsed.data;

    // 1. Authorize: Trainer allocated to batch
    let trainerProfileId = session.profileId;
    if (session.role === "TRAINER") {
      if (!trainerProfileId) {
        const tr = await prisma.trainerProfile.findUnique({ where: { userId: session.userId } });
        trainerProfileId = tr?.id;
      }
      const isAllocated = await prisma.trainerBatchAllocation.findUnique({
        where: {
          batchId_trainerProfileId: {
            batchId,
            trainerProfileId: trainerProfileId!,
          },
        },
      });
      if (!isAllocated) {
        return NextResponse.json(
          { error: "Access denied. You are not allocated to this batch." },
          { status: 403 }
        );
      }
    } else {
      // Admin submitting on behalf - pick batch's primary trainer
      const primaryAlloc = await prisma.trainerBatchAllocation.findFirst({
        where: { batchId, isPrimary: true },
      });
      trainerProfileId = primaryAlloc?.trainerProfileId;
      if (!trainerProfileId) {
        return NextResponse.json({ error: "Batch has no assigned trainer" }, { status: 400 });
      }
    }

    // 2. Date rules
    const targetDate = new Date(`${sessionDate}T00:00:00Z`);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Block future dates
    if (targetDate > today) {
      return NextResponse.json(
        { error: "Class sessions cannot be submitted for future dates." },
        { status: 400 }
      );
    }

    // Check backdated access if older than yesterday
    let backdateAuthId: string | null = null;
    if (targetDate < yesterday) {
      const authRecord = await prisma.backdateAuthorization.findFirst({
        where: {
          trainerProfileId: trainerProfileId!,
          batchId,
          allowedDate: targetDate,
          isUsed: false,
          expiresAt: { gte: new Date() },
        },
      });

      if (!authRecord && session.role !== "ADMIN") {
        return NextResponse.json(
          {
            error:
              "Unauthorized backdated submission. Sessions older than yesterday require an approved Backdated Attendance Authorization.",
          },
          { status: 403 }
        );
      }
      if (authRecord) {
        backdateAuthId = authRecord.id;
      }
    }

    // 3. Time validation: End must be after Start
    const [startH, startM] = actualStartTime.split(":").map(Number);
    const [endH, endM] = actualEndTime.split(":").map(Number);
    if (endH < startH || (endH === startH && endM <= startM)) {
      return NextResponse.json(
        { error: "Actual end time must be strictly after actual start time." },
        { status: 400 }
      );
    }

    // 4. Teaching session requires at least one subtopic selected
    if (sessionType === "TEACHING" && subtopicIds.length === 0) {
      return NextResponse.json(
        { error: "Teaching sessions require at least one syllabus subtopic to be selected." },
        { status: 400 }
      );
    }

    // 5. Check duplicate submission
    const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
    const existing = await prisma.classSession.findFirst({
      where: {
        batchId,
        sessionDate: {
          gte: targetDate,
          lt: nextDay,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error:
            "A class session has already been submitted and locked for this batch on this date. Use the Correction Request workflow if adjustments are required.",
        },
        { status: 409 }
      );
    }

    // 6. Validate subtopics belong to this batch's syllabus
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        syllabusVersion: {
          include: {
            modules: {
              include: { subtopics: true },
            },
          },
        },
        enrollments: {
          where: { status: "ACTIVE" },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const validSubtopicIds = new Set(
      batch.syllabusVersion.modules.flatMap((m) => m.subtopics.map((st) => st.id))
    );

    for (const sid of subtopicIds) {
      if (!validSubtopicIds.has(sid)) {
        return NextResponse.json(
          { error: `Invalid subtopic ID (${sid}) does not belong to the batch syllabus.` },
          { status: 400 }
        );
      }
    }

    // 7. Validate all active enrolled students are accounted for
    const activeStudentIds = new Set(batch.enrollments.map((e) => e.studentProfileId));
    for (const att of attendance) {
      if (!activeStudentIds.has(att.studentProfileId)) {
        return NextResponse.json(
          {
            error: `Student ID ${att.studentProfileId} is not an actively enrolled student for this batch.`,
          },
          { status: 400 }
        );
      }
    }

    const generatedKey =
      idempotencyKey || `BATCH-${batchId}-${sessionDate}-${Date.now()}`;

    // 8. ATOMIC DATABASE TRANSACTION
    const result = await prisma.$transaction(async (tx) => {
      // Create locked session
      const classSession = await tx.classSession.create({
        data: {
          batchId,
          occurrenceId: occurrenceId || null,
          trainerProfileId: trainerProfileId!,
          sessionDate: targetDate,
          actualStartTime,
          actualEndTime,
          sessionType,
          notes: notes?.trim() || null,
          isLocked: true,
          idempotencyKey: generatedKey,
          submittedAt: new Date(),
        },
      });

      // Update occurrence to HELD if specified
      if (occurrenceId) {
        await tx.sessionOccurrence.update({
          where: { id: occurrenceId },
          data: { status: "HELD" },
        });
      }

      // Create attendance entries
      await tx.attendanceEntry.createMany({
        data: attendance.map((att) => ({
          classSessionId: classSession.id,
          studentProfileId: att.studentProfileId,
          status: att.status,
          notes: att.notes?.trim() || null,
        })),
      });

      // Create subtopic coverages (deduplicated)
      if (subtopicIds.length > 0) {
        const uniqueSubtopicIds = Array.from(new Set(subtopicIds));
        await tx.subtopicCoverage.createMany({
          data: uniqueSubtopicIds.map((sid) => ({
            classSessionId: classSession.id,
            subtopicId: sid,
          })),
        });
      }

      // Mark backdate authorization used if applicable
      if (backdateAuthId) {
        await tx.backdateAuthorization.update({
          where: { id: backdateAuthId },
          data: { isUsed: true },
        });
      }

      // Create Audit Log within transaction
      await tx.auditEvent.create({
        data: {
          userId: session.userId,
          action: "CLASS_SESSION_SUBMITTED",
          entityType: "ClassSession",
          entityId: classSession.id,
          detailsJson: JSON.stringify({
            batchCode: batch.code,
            date: sessionDate,
            sessionType,
            presentCount: attendance.filter((a) => a.status === "PRESENT").length,
            absentCount: attendance.filter((a) => a.status === "ABSENT").length,
            leaveCount: attendance.filter((a) => a.status === "LEAVE").length,
            subtopicsCovered: subtopicIds.length,
          }),
        },
      });

      return classSession;
    });

    return NextResponse.json({
      success: true,
      sessionId: result.id,
      isLocked: true,
      message: "Class session, attendance roster, and syllabus coverage successfully saved and locked.",
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Duplicate submission prevented: This session has already been saved." },
        { status: 409 }
      );
    }
    console.error("Session entry POST error:", error);
    return NextResponse.json(
      { error: "Failed to atomically commit class session transaction." },
      { status: 500 }
    );
  }
}
