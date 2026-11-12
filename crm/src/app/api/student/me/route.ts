import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateStudentBatchAttendance } from "@/lib/attendance";
import { calculateBatchSyllabusProgress } from "@/lib/progress";

export async function GET() {
  try {
    const session = await requireAuth(["STUDENT"]);

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        enrollments: {
          where: { status: "ACTIVE" },
          include: {
            batch: {
              include: {
                course: true,
                syllabusVersion: true,
                trainerAllocations: {
                  include: {
                    trainerProfile: {
                      include: {
                        user: { select: { name: true, email: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        feeAgreements: {
          where: { isApproved: true },
          take: 1,
        },
      },
    });

    if (!studentProfile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const primaryEnrollment = studentProfile.enrollments[0];
    const batch = primaryEnrollment?.batch;

    let attendanceSummary = null;
    let syllabusProgress = null;
    let nextClass = null;
    let recentSessions: any[] = [];

    if (batch) {
      const [att, syl, next, rec] = await Promise.all([
        calculateStudentBatchAttendance(studentProfile.id, batch.id),
        calculateBatchSyllabusProgress(batch.id),
        prisma.sessionOccurrence.findFirst({
          where: {
            batchId: batch.id,
            plannedDate: { gte: new Date() },
            status: "SCHEDULED",
          },
          orderBy: { plannedDate: "asc" },
        }),
        prisma.classSession.findMany({
          where: { batchId: batch.id },
          include: {
            attendanceEntries: {
              where: { studentProfileId: studentProfile.id },
            },
            subtopicCoverages: {
              include: { subtopic: { select: { title: true } } },
            },
          },
          orderBy: { sessionDate: "desc" },
          take: 5,
        }),
      ]);

      attendanceSummary = att;
      syllabusProgress = syl;
      nextClass = next;
      recentSessions = rec;
    }

    return NextResponse.json({
      student: {
        id: studentProfile.id,
        name: studentProfile.user.name,
        email: studentProfile.user.email,
        phone: studentProfile.user.phone,
        registrationNumber: studentProfile.registrationNumber,
        address: studentProfile.address,
        emergencyContact: studentProfile.emergencyContact,
      },
      enrollment: primaryEnrollment
        ? {
            batchId: batch!.id,
            batchCode: batch!.code,
            courseTitle: batch!.course.title,
            courseCode: batch!.course.code,
            scheduleType: batch!.scheduleType,
            classDays: batch!.classDays,
            timings: `${batch!.startTime} – ${batch!.endTime}`,
            timezone: batch!.timezone,
            location: batch!.location,
            trainerName:
              batch!.trainerAllocations[0]?.trainerProfile.user.name || "Assigned Faculty",
            effectiveStartDate: primaryEnrollment.effectiveStartDate,
          }
        : null,
      attendance: attendanceSummary,
      syllabus: syllabusProgress,
      nextClass,
      recentSessions: recentSessions.map((s: any) => ({
        id: s.id,
        sessionDate: s.sessionDate,
        actualTimes: `${s.actualStartTime} – ${s.actualEndTime}`,
        sessionType: s.sessionType,
        attendanceStatus: s.attendanceEntries[0]?.status || "NOT_RECORDED",
        subtopicsCovered: s.subtopicCoverages.map((c: any) => c.subtopic.title),
        notes: s.notes,
      })),
      feeAgreement: studentProfile.feeAgreements[0] || null,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("Student ME error:", error);
    return NextResponse.json({ error: "Failed to load student data" }, { status: 500 });
  }
}
