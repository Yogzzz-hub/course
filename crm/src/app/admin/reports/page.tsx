import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  Layers,
  BookOpen,
  DollarSign,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  Award,
  FileCheck,
  FileText,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  let session;
  try {
    session = await requireAuth(["ADMIN"]);
  } catch {
    redirect("/login");
  }

  // Aggregate genuine operational statistics directly from database
  const [
    totalLeads,
    admittedLeads,
    totalAdmissions,
    totalStudents,
    activeBatches,
    totalOccurrences,
    heldOccurrences,
    cancelledOccurrences,
    submittedSessions,
    totalRequiredSubtopics,
    totalCoverages,
    attendanceEntries,
    correctionsCount,
    pendingCorrections,
    approvedCorrections,
    admissionsFinancials,
    backdatesCount,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "ADMITTED" } }),
    prisma.admission.count(),
    prisma.studentProfile.count(),
    prisma.batch.findMany({
      where: { status: "ACTIVE" },
      include: {
        course: true,
        _count: {
          select: {
            enrollments: true,
            occurrences: true,
            classSessions: true,
          },
        },
        trainerAllocations: {
          include: { trainerProfile: { include: { user: true } } },
        },
      },
    }),
    prisma.sessionOccurrence.count(),
    prisma.sessionOccurrence.count({ where: { status: "HELD" } }),
    prisma.sessionOccurrence.count({ where: { status: "CANCELLED" } }),
    prisma.classSession.count(),
    prisma.syllabusSubtopic.count({ where: { isRequired: true } }),
    prisma.subtopicCoverage.count(),
    prisma.attendanceEntry.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.correctionRequest.count(),
    prisma.correctionRequest.count({ where: { status: "PENDING" } }),
    prisma.correctionRequest.count({ where: { status: "APPROVED" } }),
    prisma.admission.aggregate({
      _sum: {
        agreedFee: true,
        discountAmount: true,
      },
      _avg: {
        agreedFee: true,
      },
    }),
    prisma.backdateAuthorization.count(),
  ]);

  // Lead Conversion Rate
  const conversionRate =
    totalLeads > 0 ? Math.round((admittedLeads / totalLeads) * 1000) / 10 : 0;

  // Session Delivery Compliance
  const missingSessions = Math.max(0, heldOccurrences - submittedSessions);
  const sessionComplianceRate =
    heldOccurrences > 0
      ? Math.round((submittedSessions / heldOccurrences) * 1000) / 10
      : 100;

  // Attendance Calculations
  const presentCount =
    attendanceEntries.find((e) => e.status === "PRESENT")?._count.status || 0;
  const absentCount =
    attendanceEntries.find((e) => e.status === "ABSENT")?._count.status || 0;
  const leaveCount =
    attendanceEntries.find((e) => e.status === "LEAVE")?._count.status || 0;
  const totalAttendanceRecorded = presentCount + absentCount + leaveCount;
  const academyAttendanceRate =
    totalAttendanceRecorded > 0
      ? Math.round(((presentCount + leaveCount) / totalAttendanceRecorded) * 1000) / 10
      : 100;

  // Financial aggregates
  const grossTuition = admissionsFinancials._sum.agreedFee || 0;
  const totalDiscounts = admissionsFinancials._sum.discountAmount || 0;
  const netCommittedRevenue = Math.max(0, grossTuition - totalDiscounts);
  const avgTuition = admissionsFinancials._avg.agreedFee || 0;

  return (
    <AppShell
      user={{
        name: "Executive Administrator",
        email: "admin@apexacademy.edu",
        role: "ADMIN",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
            Strategic Intelligence
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
            Executive Operations Report
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Real-time academy-wide KPIs computed directly from live relational database records without mock approximations.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Link
            href="/admin/audit-logs"
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-[#2A0F16] hover:bg-stone-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <FileText className="w-4 h-4 text-stone-500" />
            <span>View Full Audit Logs</span>
          </Link>
          <Link
            href="/admin/approvals"
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#6D1A2B] text-white text-xs font-semibold hover:bg-[#4E0F1E] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Review Pending Approvals ({pendingCorrections})</span>
          </Link>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <MetricCard
          title="Lead Conversion Rate"
          value={`${conversionRate}%`}
          subtitle={`${admittedLeads} Admitted / ${totalLeads} Inquiries`}
          icon={<TrendingUp className="w-5 h-5 text-[#6D1A2B]" />}
        />

        <MetricCard
          title="Delivery Compliance"
          value={`${sessionComplianceRate}%`}
          subtitle={`${submittedSessions} of ${heldOccurrences} Held`}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />

        <MetricCard
          title="Attendance Index"
          value={`${academyAttendanceRate}%`}
          subtitle={`${presentCount} of ${totalAttendanceRecorded} Marks`}
          icon={<Award className="w-5 h-5 text-[#C9A24B]" />}
        />

        <MetricCard
          title="Net Committed Tuition"
          value={formatCurrency(netCommittedRevenue)}
          subtitle={`${totalAdmissions} Active Agreements`}
          icon={<DollarSign className="w-5 h-5 text-emerald-700" />}
        />
      </div>

      {/* Secondary Intelligence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Attendance Breakdown */}
        <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-4 sm:p-5 shadow-sm">
          <h2 className="text-sm font-bold text-[#2A0F16] flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Attendance Mark Distribution
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Present Marks</span>
              <span className="font-mono font-bold text-emerald-700">{presentCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Approved Leaves</span>
              <span className="font-mono font-bold text-amber-700">{leaveCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Unexcused Absences</span>
              <span className="font-mono font-bold text-rose-700">{absentCount}</span>
            </div>
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between font-semibold">
              <span className="text-[#2A0F16]">Total Attendance Entries</span>
              <span className="font-mono text-[#2A0F16]">{totalAttendanceRecorded}</span>
            </div>
          </div>
        </div>

        {/* Delivery Integrity */}
        <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-4 sm:p-5 shadow-sm">
          <h2 className="text-sm font-bold text-[#2A0F16] flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-[#6D1A2B]" />
            Session Delivery Integrity
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Total Timetable Occurrences</span>
              <span className="font-mono font-bold text-stone-800">{totalOccurrences}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Held Occurrences</span>
              <span className="font-mono font-bold text-emerald-700">{heldOccurrences}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Cancelled Occurrences</span>
              <span className="font-mono font-bold text-stone-500">{cancelledOccurrences}</span>
            </div>
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between font-semibold">
              <span className="text-[#2A0F16]">Pending Submission Filings</span>
              <span className={`font-mono ${missingSessions > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                {missingSessions}
              </span>
            </div>
          </div>
        </div>

        {/* Quality & Governance */}
        <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-4 sm:p-5 shadow-sm">
          <h2 className="text-sm font-bold text-[#2A0F16] flex items-center gap-2 mb-3">
            <FileCheck className="w-4 h-4 text-[#C9A24B]" />
            Governance & Quality Control
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Correction Requests Filed</span>
              <span className="font-mono font-bold text-stone-800">{correctionsCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Pending Review</span>
              <span className="font-mono font-bold text-amber-700">{pendingCorrections}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-600">Approved Corrections</span>
              <span className="font-mono font-bold text-emerald-700">{approvedCorrections}</span>
            </div>
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between font-semibold">
              <span className="text-[#2A0F16]">Backdate Authorizations</span>
              <span className="font-mono text-[#2A0F16]">{backdatesCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cohort Utilization & Delivery Health Table */}
      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#2A0F16]/10 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#2A0F16]">
              Active Cohort Capacity & Delivery Performance
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Tracking enrollment densities, scheduled classes, and assigned trainers across all active cohorts.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-stone-500 shrink-0">
            {activeBatches.length} Cohorts
          </span>
        </div>

        {activeBatches.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 italic">
            No active batches currently in session.
          </div>
        ) : (
          <>
            {/* Mobile Card List (< md) */}
            <div className="block md:hidden divide-y divide-stone-100">
              {activeBatches.map((b) => {
                const util =
                  b.capacity > 0
                    ? Math.round((b._count.enrollments / b.capacity) * 100)
                    : 0;
                const trainerName =
                  b.trainerAllocations[0]?.trainerProfile?.user?.name || "Unassigned";

                return (
                  <div key={b.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[#F6EBCF] text-[#4E0F1E]">
                          {b.code}
                        </span>
                        <h3 className="font-bold text-sm text-[#2A0F16] mt-1">{b.course.title}</h3>
                        <p className="text-[11px] text-stone-500">
                          {b.scheduleType} ({b.classDays})
                        </p>
                      </div>
                      <StatusBadge status={b.status} size="sm" />
                    </div>

                    <div className="flex items-center justify-between text-xs text-stone-600">
                      <span>Faculty: <strong className="text-[#2A0F16]">{trainerName}</strong></span>
                      <span className="font-mono text-[11px]">
                        {b._count.classSessions} / {b._count.occurrences} Sessions
                      </span>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-stone-500">Capacity Utilization</span>
                        <span className="font-bold text-[#2A0F16] font-mono">
                          {util}% ({b._count.enrollments}/{b.capacity})
                        </span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#6D1A2B] h-full rounded-full transition-all"
                          style={{ width: `${Math.min(util, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFFBF5] border-b border-[#2A0F16]/10 font-bold text-[#2A0F16]">
                  <tr>
                    <th className="py-3 px-4">Batch Code</th>
                    <th className="py-3 px-4">Course Program</th>
                    <th className="py-3 px-4">Assigned Trainer</th>
                    <th className="py-3 px-4">Capacity Utilization</th>
                    <th className="py-3 px-4">Classes Held / Total</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {activeBatches.map((b) => {
                    const util =
                      b.capacity > 0
                        ? Math.round((b._count.enrollments / b.capacity) * 100)
                        : 0;
                    const trainerName =
                      b.trainerAllocations[0]?.trainerProfile?.user?.name || "Unassigned";

                    return (
                      <tr key={b.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#6D1A2B]">
                          {b.code}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#2A0F16]">
                          {b.course.title}
                          <div className="text-[11px] text-stone-500 font-normal">
                            {b.scheduleType} ({b.classDays})
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-stone-700">
                          {trainerName}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-stone-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-[#6D1A2B] h-full rounded-full"
                                style={{ width: `${Math.min(util, 100)}%` }}
                              />
                            </div>
                            <span className="font-bold text-[#2A0F16]">{util}%</span>
                            <span className="text-[11px] text-stone-400 font-mono">
                              ({b._count.enrollments}/{b.capacity})
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-stone-700">
                          {b._count.classSessions} Sessions Logged / {b._count.occurrences} Planned
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <StatusBadge status={b.status} size="sm" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
