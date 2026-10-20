import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const CreateBatchSchema = z.object({
  code: z.string().min(2).toUpperCase(),
  courseId: z.string().min(1, "Course is required"),
  syllabusVersionId: z.string().min(1, "Syllabus version is required"),
  trainerProfileId: z.string().min(1, "Trainer is required"),
  capacity: z.number().min(1).max(100).default(20),
  trainingMode: z.string().default("Hybrid"),
  scheduleType: z.enum(["WEEKDAYS", "WEEKENDS", "FLEXIBLE"]).default("WEEKDAYS"),
  classDays: z.string().default("Mon,Wed,Fri"),
  startTime: z.string().default("10:00"),
  endTime: z.string().default("12:00"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expectedEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["ADMIN", "MANAGER", "TRAINER", "FINANCIER"]);
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    const whereClause: any = {};
    if (courseId) whereClause.courseId = courseId;

    const batches = await prisma.batch.findMany({
      where: whereClause,
      include: {
        course: { select: { id: true, title: true, code: true } },
        syllabusVersion: { select: { id: true, title: true, versionNumber: true } },
        trainerAllocations: {
          include: {
            trainerProfile: {
              include: { user: { select: { name: true, email: true } } },
            },
          },
        },
        enrollments: {
          where: { status: "ACTIVE" },
          include: {
            studentProfile: {
              include: { user: { select: { name: true, email: true } } },
            },
          },
        },
        _count: {
          select: {
            classSessions: true,
            occurrences: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ batches });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch batches" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["ADMIN", "MANAGER"]);
    const body = await req.json();
    const parsed = CreateBatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const {
      code,
      courseId,
      syllabusVersionId,
      trainerProfileId,
      capacity,
      trainingMode,
      scheduleType,
      classDays,
      startTime,
      endTime,
      startDate,
      expectedEndDate,
      location,
    } = parsed.data;

    // Check unique batch code
    const existingCode = await prisma.batch.findUnique({ where: { code } });
    if (existingCode) {
      return NextResponse.json({ error: `Batch code ${code} is already in use.` }, { status: 409 });
    }

    const sDate = new Date(`${startDate}T00:00:00Z`);
    const eDate = new Date(`${expectedEndDate}T23:59:59Z`);

    if (eDate <= sDate) {
      return NextResponse.json(
        { error: "Expected end date must be after start date." },
        { status: 400 }
      );
    }

    // Create batch and generate scheduled timetable occurrences
    const newBatch = await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.create({
        data: {
          code,
          courseId,
          syllabusVersionId,
          capacity,
          trainingMode,
          scheduleType,
          classDays,
          startTime,
          endTime,
          startDate: sDate,
          expectedEndDate: eDate,
          location: location || "Main Campus Room & Live Bridge",
          status: "UPCOMING",
          trainerAllocations: {
            create: {
              trainerProfileId,
              isPrimary: true,
              allocatedBy: session.userId,
            },
          },
        },
      });

      // Map day names to Day of week numbers: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
      const dayMap: Record<string, number> = {
        sun: 0,
        mon: 1,
        tue: 2,
        wed: 3,
        thu: 4,
        fri: 5,
        sat: 6,
      };

      const targetDays = classDays
        .toLowerCase()
        .split(",")
        .map((d) => dayMap[d.trim().slice(0, 3)])
        .filter((d) => d !== undefined);

      // Generate timetable occurrences for the first 8 weeks (or until expectedEndDate)
      const occurrencesToCreate = [];
      const cursor = new Date(sDate);
      const maxOccurrences = 30; // sensible limit for initial timetable

      while (cursor <= eDate && occurrencesToCreate.length < maxOccurrences) {
        if (targetDays.includes(cursor.getUTCDay())) {
          occurrencesToCreate.push({
            batchId: batch.id,
            trainerProfileId,
            plannedDate: new Date(cursor),
            plannedStartTime: startTime,
            plannedEndTime: endTime,
            status: "SCHEDULED" as const,
            location: batch.location,
          });
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }

      if (occurrencesToCreate.length > 0) {
        await tx.sessionOccurrence.createMany({
          data: occurrencesToCreate,
        });
      }

      return batch;
    });

    await logAuditEvent({
      userId: session.userId,
      action: "BATCH_CREATED",
      entityType: "Batch",
      entityId: newBatch.id,
      details: { code: newBatch.code, capacity: newBatch.capacity, scheduleType },
    });

    return NextResponse.json({
      success: true,
      batch: newBatch,
      message: `Batch ${newBatch.code} created and timetable occurrences generated.`,
    });
  } catch (error: any) {
    console.error("Batch creation error:", error);
    return NextResponse.json({ error: "Failed to create batch" }, { status: 500 });
  }
}
