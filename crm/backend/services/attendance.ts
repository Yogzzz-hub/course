import { prisma } from "./prisma";

export interface AttendanceSummary {
  totalScheduled: number;
  totalHeld: number;
  presentCount: number;
  absentCount: number;
  leaveCount: number;
  notSubmittedCount: number;
  notApplicableCount: number;
  heldToDatePercentage: number | null; // null if 0 held sessions
  scheduledPercentage: number | null;  // null if 0 scheduled sessions
  policyLabel: string;
}

// In-Memory High Performance Caches
let cachedSettings: { policy: string; expires: number } | null = null;
const attendanceCache = new Map<string, { data: AttendanceSummary; expires: number }>();

export function invalidateAttendanceCache(studentProfileId?: string) {
  if (studentProfileId) {
    for (const key of attendanceCache.keys()) {
      if (key.startsWith(studentProfileId)) attendanceCache.delete(key);
    }
  } else {
    attendanceCache.clear();
  }
}

export async function calculateStudentBatchAttendance(
  studentProfileId: string,
  batchId: string,
  skipCache: boolean = false
): Promise<AttendanceSummary> {
  const now = Date.now();
  const cacheKey = `${studentProfileId}:${batchId}`;
  if (!skipCache) {
    const cached = attendanceCache.get(cacheKey);
    if (cached && cached.expires > now) {
      return cached.data;
    }
  }

  // 1. Get student enrollment to know effective start date
  const enrollment = await prisma.studentBatchEnrollment.findUnique({
    where: {
      batchId_studentProfileId: {
        batchId,
        studentProfileId,
      },
    },
  });

  const effectiveStart = enrollment?.effectiveStartDate || new Date(0);
  const effectiveEnd = enrollment?.effectiveEndDate || new Date("2100-01-01");

  // 2. Get Academy Settings
  let policy = "HELD_TO_DATE";
  if (cachedSettings && cachedSettings.expires > now) {
    policy = cachedSettings.policy;
  } else {
    const settings = await prisma.academySettings.findUnique({
      where: { id: "default" },
    });
    policy = settings?.attendanceDenominatorPolicy || "HELD_TO_DATE";
    cachedSettings = { policy, expires: now + 60000 };
  }

  // 3. Get all session occurrences for this batch that fall within student's active window
  const occurrences = await prisma.sessionOccurrence.findMany({
    where: {
      batchId,
      plannedDate: {
        gte: effectiveStart,
        lte: effectiveEnd,
      },
    },
    include: {
      classSession: {
        include: {
          attendanceEntries: {
            where: { studentProfileId },
          },
        },
      },
    },
    orderBy: { plannedDate: "asc" },
  });

  let totalScheduled = 0;
  let totalHeld = 0;
  let presentCount = 0;
  let absentCount = 0;
  let leaveCount = 0;
  let notSubmittedCount = 0;
  let notApplicableCount = 0;

  for (const occ of occurrences) {
    if (occ.status === "CANCELLED") {
      // Rule: Canceled classes never produce absences or count against student
      continue;
    }

    totalScheduled++;

    if (occ.status === "HELD") {
      totalHeld++;
      const session = occ.classSession;
      if (!session) {
        // Occurrence marked held but no session submitted yet
        notSubmittedCount++;
      } else {
        const entry = session.attendanceEntries[0];
        if (!entry) {
          notSubmittedCount++;
        } else {
          switch (entry.status) {
            case "PRESENT":
              presentCount++;
              break;
            case "ABSENT":
              absentCount++;
              break;
            case "LEAVE":
              leaveCount++;
              break;
            case "NOT_APPLICABLE":
              notApplicableCount++;
              break;
            case "NOT_SUBMITTED":
              notSubmittedCount++;
              break;
          }
        }
      }
    }
  }

  // Denominator logic:
  // Held to date denominator excludes NOT_APPLICABLE
  const eligibleHeldDenominator = totalHeld - notApplicableCount;
  const heldToDatePercentage =
    eligibleHeldDenominator > 0
      ? Math.round((presentCount / eligibleHeldDenominator) * 1000) / 10
      : null;

  const scheduledPercentage =
    totalScheduled > 0
      ? Math.round((presentCount / totalScheduled) * 1000) / 10
      : null;

  const result: AttendanceSummary = {
    totalScheduled,
    totalHeld,
    presentCount,
    absentCount,
    leaveCount,
    notSubmittedCount,
    notApplicableCount,
    heldToDatePercentage,
    scheduledPercentage,
    policyLabel:
      policy === "HELD_TO_DATE"
        ? "Held-to-Date Policy (Present / Eligible Held Sessions)"
        : "Total Scheduled Policy (Present / Total Scheduled Sessions)",
  };

  attendanceCache.set(cacheKey, { data: result, expires: now + 15000 });
  return result;
}
