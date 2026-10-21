import React from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateStudentBatchAttendance } from "@/lib/attendance";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Info, Calendar, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentAttendancePage() {
  let session;
  try {
    session = await requireAuth(["STUDENT"]);
  } catch {
    redirect("/login");
  }

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.userId },
    include: {
      user: true,
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          batch: {
            include: { course: true },
          },
        },
      },
    },
  });

  if (!studentProfile) redirect("/login");

  const enrollment = studentProfile.enrollments[0];
  const batch = enrollment?.batch;

  let summary = null;
  let history: any[] = [];

  if (batch) {
    summary = await calculateStudentBatchAttendance(studentProfile.id, batch.id);

    // Get all session occurrences for this batch
    const occurrences = await prisma.sessionOccurrence.findMany({
      where: {
        batchId: batch.id,
        plannedDate: { gte: enrollment.effectiveStartDate },
      },
      include: {
        classSession: {
          include: {
            attendanceEntries: {
              where: { studentProfileId: studentProfile.id },
            },
            subtopicCoverages: {
              include: { subtopic: true },
            },
          },
        },
      },
      orderBy: { plannedDate: "desc" },
    });

    history = occurrences.map((occ: any) => {
      const session = occ.classSession;
      let status = "NOT_SUBMITTED";
      let topics = "—";
      let notes = null;

      if (occ.status === "CANCELLED") {
        status = "CANCELLED";
        notes = occ.cancellationReason || "Class cancelled by academy.";
      } else if (session) {
        const entry = session.attendanceEntries[0];
        status = entry?.status || "NOT_RECORDED";
        topics = session.subtopicCoverages.map((c: any) => c.subtopic.title).join(", ") || session.notes || "Delivered";
        notes = entry?.notes || session.notes;
      }

      return {
        id: occ.id,
        plannedDate: occ.plannedDate,
        startTime: session?.actualStartTime || occ.plannedStartTime,
        endTime: session?.actualEndTime || occ.plannedEndTime,
        occurrenceStatus: occ.status,
        attendanceStatus: status,
        topics,
        notes,
      };
    });
  }

  return (
    <AppShell
      user={{
        name: studentProfile.user.name,
        email: studentProfile.user.email,
        role: "STUDENT",
        registrationNumber: studentProfile.registrationNumber,
      }}
    >
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
          Academic Records
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Verified Attendance Record
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Enrolled in Batch: <span className="font-bold text-[#6D1A2B]">{batch?.code}</span> ({batch?.course.title})
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Held to Date %"
          value={summary?.heldToDatePercentage !== null ? `${summary?.heldToDatePercentage}%` : "Not Available"}
          subtitle="Official Eligibility Metric"
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <MetricCard
          title="Classes Present"
          value={summary?.presentCount || 0}
          subtitle="Verified Sessions"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
        <MetricCard
          title="Recorded Absences"
          value={summary?.absentCount || 0}
          subtitle="Missed Held Classes"
          icon={<AlertCircle className="w-5 h-5 text-rose-600" />}
        />
        <MetricCard
          title="Approved Leave"
          value={summary?.leaveCount || 0}
          subtitle="Authorized Requests"
          icon={<Calendar className="w-5 h-5 text-amber-600" />}
        />
      </div>

      {/* Policy Explanation Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#F6EBCF]/60 border border-[#C9A24B]/40 text-xs text-[#2A0F16] flex items-start gap-3">
        <Info className="w-5 h-5 text-[#6D1A2B] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-[#6D1A2B] block">
            Official Calculation Formula ({summary?.policyLabel})
          </span>
          <p className="leading-relaxed">
            Attendance percentage = (Present Eligible Held Sessions ÷ Total Eligible Held Sessions to Date) × 100.
            Canceled academy classes and sessions occurring before your effective enrollment date ({formatDate(enrollment?.effectiveStartDate)}) are strictly excluded from the denominator.
          </p>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#2A0F16]/10">
          <h2 className="text-base font-bold text-[#2A0F16]">Complete Class Attendance Log</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Atomic log of held sessions, topics covered, and your recorded attendance status.
          </p>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 italic">
            No class sessions have been scheduled or held for this batch yet.
          </div>
        ) : (
          <>
            {/* Mobile Card List View (< sm screens) */}
            <div className="block sm:hidden divide-y divide-stone-100">
              {history.map((item) => (
                <div key={item.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#2A0F16]">
                      {formatDate(item.plannedDate)}
                    </span>
                    <StatusBadge status={item.attendanceStatus} size="sm" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 font-mono">
                    <Clock className="w-3.5 h-3.5 text-[#C9A24B]" />
                    <span>{item.startTime} – {item.endTime}</span>
                  </div>
                  <p className="text-xs text-stone-700 leading-snug">
                    <span className="font-semibold text-stone-900">Topic:</span> {item.topics}
                  </p>
                  {item.notes && (
                    <p className="text-[11px] text-stone-500 italic bg-[#FFFBF5] p-2.5 rounded-lg border border-[#2A0F16]/5">
                      {item.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= sm screens) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFFBF5] border-b border-[#2A0F16]/10 font-bold text-[#2A0F16]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Timings</th>
                    <th className="py-3 px-4">Topics Covered</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#2A0F16] whitespace-nowrap">
                        {formatDate(item.plannedDate)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-stone-600 whitespace-nowrap">
                        {item.startTime} – {item.endTime}
                      </td>
                      <td className="py-3.5 px-4 text-stone-700 max-w-xs truncate">
                        {item.topics}
                      </td>
                      <td className="py-3.5 px-4 text-stone-500 max-w-xs truncate">
                        {item.notes || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <StatusBadge status={item.attendanceStatus} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
