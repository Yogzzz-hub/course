import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import {
  ShieldCheck,
  Users,
  BookOpen,
  Layers,
  Calendar,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Settings,
  UserPlus,
  GraduationCap,
  Mail,
  Phone,
  Bell,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  let session;
  try {
    session = await requireAuth(["ADMIN"]);
  } catch {
    redirect("/login");
  }

  const [
    activeStudents,
    totalTrainers,
    activeCourses,
    runningBatches,
    pendingApprovalsCount,
    missingSessionsCount,
    recentAuditEvents,
    recentApplicants,
    newApplicantsCount,
  ] = await Promise.all([
    prisma.studentBatchEnrollment.count({ where: { status: "ACTIVE" } }),
    prisma.trainerProfile.count(),
    prisma.course.count({ where: { active: true } }),
    prisma.batch.count({ where: { status: "ACTIVE" } }),
    // Pending approvals: corrections + leaves + completion decisions
    prisma.correctionRequest.count({ where: { status: "PENDING" } }),
    prisma.sessionOccurrence.count({
      where: {
        status: "HELD",
        classSession: null,
      },
    }),
    prisma.auditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { user: { select: { name: true, role: true } } },
    }),
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { courseInterest: true },
    }),
    prisma.lead.count({ where: { status: "NEW" } }),
  ]);

  return (
    <AppShell
      user={{
        name: session.name || "Administrator",
        email: session.email,
        role: "ADMIN",
      }}
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#6D1A2B] via-[#4E0F1E] to-[#2A0F16] rounded-2xl p-5 sm:p-8 text-white shadow-elevated relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
            Institutional Administration
          </span>
          <h1 className="text-xl sm:text-3xl font-extrabold mt-1">
            Executive Admin Control Console
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-stone-200 leading-relaxed">
            Academy-wide authority over courses, versioned curricula, faculty allocations, multi-stage approval queues, and immutable security audit logs.
          </p>
        </div>

        <div className="mt-4 sm:mt-0 sm:absolute sm:right-6 sm:bottom-6 z-10 flex flex-wrap gap-2">
          <Link
            href="/admin/admissions"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition-colors shadow-sm active:scale-[0.98] border border-white/20"
          >
            <UserPlus className="w-4 h-4 shrink-0 text-[#C9A24B]" />
            <span>New Applicants ({newApplicantsCount})</span>
          </Link>
          <Link
            href="/admin/approvals"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-[#C9A24B] hover:bg-[#B28E3B] text-white font-bold text-xs transition-colors shadow-sm active:scale-[0.98]"
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Review Approval Queue ({pendingApprovalsCount})</span>
          </Link>
        </div>
      </div>

      {/* Metrics 2-col on Mobile, 5-col on Desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <MetricCard
          title="New Applicants"
          value={newApplicantsCount}
          subtitle="Pending Admissions"
          icon={<UserPlus className="w-5 h-5 text-[#6D1A2B]" />}
        />

        <MetricCard
          title="Active Students"
          value={activeStudents}
          subtitle="Currently Enrolled"
          icon={<Users className="w-5 h-5 text-[#6D1A2B]" />}
        />

        <MetricCard
          title="Faculty Instructors"
          value={totalTrainers}
          subtitle="Approved Practitioners"
          icon={<Users className="w-5 h-5 text-[#6D1A2B]" />}
        />

        <MetricCard
          title="Active Programs"
          value={activeCourses}
          subtitle="Curriculum Catalog"
          icon={<BookOpen className="w-5 h-5 text-[#6D1A2B]" />}
        />

        <MetricCard
          title="Running Batches"
          value={runningBatches}
          subtitle="Active Timetables"
          icon={<Layers className="w-5 h-5 text-[#6D1A2B]" />}
        />
      </div>

      {/* Grid: Approvals Queue & Security Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 items-start">
        {/* Left: Quick Actions & Operations */}
        <div className="lg:col-span-6 space-y-4 sm:space-y-6">
          <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-4 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#2A0F16] border-b border-stone-100 pb-3">
              Administrative Quick Navigation
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <Link
                href="/admin/users"
                className="p-3.5 min-h-[44px] rounded-xl bg-[#FFFBF5] border border-stone-200/60 hover:border-[#6D1A2B] transition-colors flex flex-col justify-center"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-[#6D1A2B] shrink-0" />
                  <span className="font-bold text-[#2A0F16]">User Management</span>
                </div>
                <span className="text-[11px] text-stone-500">Roles, accounts, deactivation</span>
              </Link>

              <Link
                href="/admin/courses"
                className="p-3.5 min-h-[44px] rounded-xl bg-[#FFFBF5] border border-stone-200/60 hover:border-[#6D1A2B] transition-colors flex flex-col justify-center"
              >
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-4 h-4 text-[#6D1A2B] shrink-0" />
                  <span className="font-bold text-[#2A0F16]">Course Catalog</span>
                </div>
                <span className="text-[11px] text-stone-500">Publish courses & set fees</span>
              </Link>

              <Link
                href="/admin/batches"
                className="p-3.5 min-h-[44px] rounded-xl bg-[#FFFBF5] border border-stone-200/60 hover:border-[#6D1A2B] transition-colors flex flex-col justify-center"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="w-4 h-4 text-[#6D1A2B] shrink-0" />
                  <span className="font-bold text-[#2A0F16]">Batches & Timetable</span>
                </div>
                <span className="text-[11px] text-stone-500">Allocate trainers & generate schedules</span>
              </Link>

              <Link
                href="/admin/approvals"
                className="p-3.5 min-h-[44px] rounded-xl bg-[#FFFBF5] border border-stone-200/60 hover:border-[#6D1A2B] transition-colors flex flex-col justify-center"
              >
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-[#6D1A2B] shrink-0" />
                  <span className="font-bold text-[#2A0F16]">Approvals Queue</span>
                </div>
                <span className="text-[11px] text-stone-500">Corrections, backdates, completions</span>
              </Link>
            </div>
          </div>

          {/* Recent Student Applicants & Enquiries */}
          <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#6D1A2B]" />
                  <span>Recent Student Applicants & Enquiries</span>
                </h2>
                <p className="text-xs text-stone-500">Live incoming applications & web counselling bookings</p>
              </div>
              <Link
                href="/admin/admissions"
                className="text-xs text-[#6D1A2B] font-semibold hover:underline flex items-center gap-1"
              >
                <span>Admissions Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentApplicants.length === 0 ? (
              <p className="text-xs text-stone-500 italic py-3 text-center">No recent applicants recorded.</p>
            ) : (
              <div className="space-y-3">
                {recentApplicants.map((applicant) => (
                  <div
                    key={applicant.id}
                    className="p-3.5 rounded-xl bg-[#FFFBF5] border border-stone-200/60 hover:border-[#6D1A2B]/40 transition-colors text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#2A0F16] text-sm">{applicant.fullName}</span>
                        <StatusBadge status={applicant.status} />
                        <span className="text-[10px] text-stone-400 font-mono">
                          {formatDate(applicant.createdAt)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-stone-600 text-[11px]">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-[#6D1A2B]" />
                          <span className="truncate max-w-[180px]">{applicant.email}</span>
                        </span>
                        {applicant.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-stone-400" />
                            <span>{applicant.phone}</span>
                          </span>
                        )}
                        {applicant.courseInterest && (
                          <span className="flex items-center gap-1 font-medium text-stone-700">
                            <GraduationCap className="w-3 h-3 text-[#C9A24B]" />
                            <span className="truncate max-w-[180px]">{applicant.courseInterest.title}</span>
                          </span>
                        )}
                      </div>
                      {applicant.message && (
                        <p className="text-[11px] text-stone-500 line-clamp-1 italic">
                          &ldquo;{applicant.message}&rdquo;
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 self-end sm:self-center">
                      <Link
                        href={`/admin/admissions`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6D1A2B] bg-white border border-[#6D1A2B]/20 hover:bg-[#6D1A2B] hover:text-white px-2.5 py-1.5 rounded-lg transition-colors shadow-2xs"
                      >
                        <span>Review</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Compliance Status */}
          <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm space-y-3">
            <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#6D1A2B]" />
              <span>Academic Integrity Status</span>
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FFFBF5] border border-stone-100">
                <span>Pending Session Corrections:</span>
                <span className="font-bold text-[#6D1A2B]">{pendingApprovalsCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#FFFBF5] border border-stone-100">
                <span>Unsubmitted Held Classes:</span>
                <span className={`font-bold ${missingSessionsCount > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                  {missingSessionsCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Immutable Security Audit Stream */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#2A0F16]/10 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#2A0F16]">System Audit Trail</h2>
              <p className="text-xs text-stone-500">Real-time log of security, auth, and state changes</p>
            </div>
            <Link
              href="/admin/audit-logs"
              className="text-xs text-[#6D1A2B] font-semibold hover:underline"
            >
              All Logs &rarr;
            </Link>
          </div>

          <div className="divide-y divide-stone-100 max-h-[500px] overflow-y-auto">
            {recentAuditEvents.map((evt) => (
              <div key={evt.id} className="p-4 space-y-1 hover:bg-stone-50/50 transition-colors text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-[#6D1A2B]">
                    {evt.action}
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {formatDate(evt.createdAt)}
                  </span>
                </div>

                <p className="text-stone-700">
                  Target Entity: <span className="font-semibold">{evt.entityType}</span> ({evt.entityId || "N/A"})
                </p>

                {evt.user && (
                  <span className="text-[11px] text-stone-500 block">
                    Triggered by: {evt.user.name} ({evt.user.role})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
