import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import {
  Users,
  Clock,
  FileText,
  AlertCircle,
  Layers,
  ArrowRight,
  TrendingUp,
  UserCheck,
  Calendar,
  CheckCircle2,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ManagerOverviewPage() {
  let session;
  try {
    session = await requireAuth(["MANAGER", "ADMIN"]);
  } catch {
    redirect("/login");
  }

  const [
    newLeadsCount,
    pendingFollowUpsCount,
    activeStudentsCount,
    runningBatchesCount,
    recentLeads,
    missingSessionsCount,
    pendingAdmissions,
  ] = await Promise.all([
    prisma.lead.count({ where: { status: "NEW" } }),
    prisma.lead.count({
      where: {
        followUpDate: { lte: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        status: { notIn: ["ADMITTED", "LOST"] },
      },
    }),
    prisma.studentBatchEnrollment.count({ where: { status: "ACTIVE" } }),
    prisma.batch.count({ where: { status: "ACTIVE" } }),
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { courseInterest: true },
    }),
    // Missing submissions: held session occurrences without classSession
    prisma.sessionOccurrence.count({
      where: {
        status: "HELD",
        classSession: null,
      },
    }),
    prisma.admission.findMany({
      where: { status: "DRAFT" },
      take: 3,
      include: { course: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <AppShell
      user={{
        name: session.name || "Operations Manager",
        email: session.email,
        role: "MANAGER",
      }}
    >
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#6D1A2B] to-[#4E0F1E] rounded-2xl p-6 sm:p-8 text-white shadow-elevated relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-wider text-[#F6EBCF]">
            Student Operations & Admissions
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
            Manager Control Dashboard
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-stone-200 leading-relaxed">
            Oversee admission pipelines, enquiry follow-ups, cohort capacity, and classroom delivery compliance.
          </p>
        </div>

        <div className="mt-4 sm:mt-0 sm:absolute sm:right-6 sm:bottom-6 z-10 flex gap-2">
          <Link
            href="/manager/enquiries"
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 rounded-xl bg-[#C9A24B] hover:bg-[#B28E3B] text-white font-bold text-xs transition-colors shadow-sm"
          >
            <span>Open CRM Pipeline</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="New Enquiries"
          value={newLeadsCount}
          subtitle="Uncontacted Web Leads"
          icon={<Users className="w-5 h-5 text-[#6D1A2B]" />}
        />

        <MetricCard
          title="Follow-ups"
          value={pendingFollowUpsCount}
          subtitle="Due in 24 hours"
          icon={<Clock className="w-5 h-5 text-amber-600" />}
        />

        <MetricCard
          title="Active Students"
          value={activeStudentsCount}
          subtitle="Live Cohorts"
          icon={<UserCheck className="w-5 h-5 text-emerald-600" />}
        />

        <MetricCard
          title="Running Batches"
          value={runningBatchesCount}
          subtitle="Active Cohorts"
          icon={<Layers className="w-5 h-5 text-[#6D1A2B]" />}
        />
      </div>

      {/* Main Grid: CRM Pipeline & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left: Recent Leads */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#2A0F16]/10 p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#2A0F16]">Recent Admission Enquiries</h2>
              <p className="text-xs text-stone-500">Live incoming web leads and applicant requests</p>
            </div>
            <Link
              href="/manager/enquiries"
              className="text-xs text-[#6D1A2B] font-semibold hover:underline flex items-center gap-1"
            >
              <span>Manage CRM</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-stone-100">
            {recentLeads.map((lead) => (
              <div
                key={lead.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#2A0F16]">{lead.fullName}</span>
                    <StatusBadge status={lead.status} size="sm" />
                  </div>
                  <p className="text-stone-500 mt-0.5">
                    {lead.email} • {lead.phone}
                  </p>
                  <p className="text-stone-700 mt-1">
                    Interest: <span className="font-semibold">{lead.courseInterest?.title || "General"}</span> ({lead.schedulePreference})
                  </p>
                </div>

                <Link
                  href={`/manager/enquiries?id=${lead.id}`}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-3.5 py-2.5 sm:py-1.5 rounded-lg border border-stone-200 text-stone-700 hover:border-[#6D1A2B] hover:text-[#6D1A2B] transition-colors flex items-center justify-center font-medium"
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Operational Alerts & Admissions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Missing attendance alerts */}
          <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm space-y-3">
            <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Compliance & Attendance Alerts</span>
            </h2>

            {missingSessionsCount > 0 ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
                <span className="font-bold block">
                  {missingSessionsCount} Missing Class Session Submissions
                </span>
                <p>
                  Scheduled held occurrences detected with no faculty attendance submission.
                </p>
                <Link
                  href="/manager/attendance-alerts"
                  className="inline-block font-bold text-rose-800 underline"
                >
                  Review Attendance Alerts &rarr;
                </Link>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All held sessions have submitted attendance records. Zero compliance exceptions.</span>
              </div>
            )}
          </div>

          {/* Pending Draft Admissions */}
          <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#2A0F16]">Admission Drafts</h2>
              <Link
                href="/manager/admissions"
                className="text-xs text-[#6D1A2B] font-semibold hover:underline"
              >
                All Admissions
              </Link>
            </div>

            {pendingAdmissions.length === 0 ? (
              <p className="text-xs text-stone-500 italic p-4 bg-stone-50 rounded-xl">
                No draft admissions waiting for review.
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                {pendingAdmissions.map((adm) => (
                  <div
                    key={adm.id}
                    className="p-3 rounded-xl bg-[#FFFBF5] border border-stone-200/60 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono font-bold text-[#6D1A2B] block">
                        {adm.registrationNumber}
                      </span>
                      <span className="text-stone-700">{adm.course.title}</span>
                    </div>
                    <StatusBadge status={adm.status} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
