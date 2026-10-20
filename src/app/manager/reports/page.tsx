import React from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/ui/MetricCard";
import { ProgressIndicator } from "@/components/ui/ProgressIndicator";
import { formatDate } from "@/lib/utils";
import { TrendingUp, Users, CheckCircle2, Clock, Layers } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ManagerReportsPage() {
  let session;
  try {
    session = await requireAuth(["MANAGER", "ADMIN"]);
  } catch {
    redirect("/login");
  }

  const [
    totalLeads,
    admittedLeads,
    totalStudents,
    activeBatches,
    totalOccurrences,
    heldOccurrences,
    submittedSessions,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "ADMITTED" } }),
    prisma.studentProfile.count(),
    prisma.batch.findMany({
      where: { status: "ACTIVE" },
      include: {
        course: true,
        _count: { select: { enrollments: true } },
      },
    }),
    prisma.sessionOccurrence.count({ where: { status: { not: "CANCELLED" } } }),
    prisma.sessionOccurrence.count({ where: { status: "HELD" } }),
    prisma.classSession.count(),
  ]);

  const conversionRate =
    totalLeads > 0 ? Math.round((admittedLeads / totalLeads) * 1000) / 10 : 0;
  const missingSessions = Math.max(0, heldOccurrences - submittedSessions);

  return (
    <AppShell
      user={{
        name: "Operations Manager",
        email: "manager@apexacademy.edu",
        role: "MANAGER",
      }}
    >
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
          Operational Insights
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Academy Operational Reporting
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Live aggregations computed directly from current database records without mocked statistics.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          subtitle={`${admittedLeads} of ${totalLeads} Leads`}
          icon={<TrendingUp className="w-5 h-5 text-[#6D1A2B]" />}
        />

        <MetricCard
          title="Active Students"
          value={totalStudents}
          subtitle="Enrolled Across Cohorts"
          icon={<Users className="w-5 h-5 text-[#6D1A2B]" />}
        />

        <MetricCard
          title="Sessions Delivered"
          value={submittedSessions}
          subtitle={`${heldOccurrences} Held Occurrences`}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />

        <MetricCard
          title="Missing Sessions"
          value={missingSessions}
          subtitle="Compliance Discrepancy"
          icon={<Clock className="w-5 h-5 text-rose-600" />}
        />
      </div>

      {/* Cohort Capacity Utilization Table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#2A0F16]/10 flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-[#2A0F16]">
            Active Cohort Capacity & Utilization
          </h2>
          <span className="text-xs font-mono font-semibold text-stone-500">
            {activeBatches.length} Running Batches
          </span>
        </div>

        {/* Mobile Cards */}
        <div className="block md:hidden divide-y divide-stone-100">
          {activeBatches.map((b) => {
            const util =
              b.capacity > 0
                ? Math.round((b._count.enrollments / b.capacity) * 100)
                : 0;

            return (
              <div key={b.id} className="p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#6D1A2B]">{b.code}</span>
                  <span className="font-bold text-[#2A0F16]">{util}% Utilized</span>
                </div>
                <p className="font-medium text-stone-800">{b.course.title}</p>
                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#6D1A2B] h-full rounded-full"
                    style={{ width: `${util}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-stone-500 text-[11px] pt-1">
                  <span>{b.scheduleType} ({b.classDays})</span>
                  <span>{b._count.enrollments} / {b.capacity} Students</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FFFBF5] border-b border-[#2A0F16]/10 font-bold text-[#2A0F16]">
              <tr>
                <th className="py-3 px-4">Batch Code</th>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Schedule</th>
                <th className="py-3 px-4">Enrolled / Capacity</th>
                <th className="py-3 px-4">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {activeBatches.map((b) => {
                const util =
                  b.capacity > 0
                    ? Math.round((b._count.enrollments / b.capacity) * 100)
                    : 0;

                return (
                  <tr key={b.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#6D1A2B]">
                      {b.code}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#2A0F16]">
                      {b.course.title}
                    </td>
                    <td className="py-3.5 px-4 text-stone-600">
                      {b.scheduleType} ({b.classDays})
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {b._count.enrollments} / {b.capacity} Students
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-stone-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-[#6D1A2B] h-full rounded-full"
                            style={{ width: `${util}%` }}
                          />
                        </div>
                        <span className="font-bold text-[#2A0F16]">{util}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
