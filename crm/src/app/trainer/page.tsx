import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateBatchSyllabusProgress } from "@/lib/progress";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/ui/MetricCard";
import { ProgressIndicator } from "@/components/ui/ProgressIndicator";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import {
  Layers,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  PlusCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TrainerOverviewPage() {
  let session;
  try {
    session = await requireAuth(["TRAINER", "ADMIN"]);
  } catch {
    redirect("/login");
  }

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.userId },
    include: {
      user: true,
      batchAllocations: {
        include: {
          batch: {
            include: {
              course: true,
              syllabusVersion: true,
              enrollments: { where: { status: "ACTIVE" } },
              classSessions: { orderBy: { sessionDate: "desc" }, take: 1 },
              occurrences: {
                where: { plannedDate: { gte: new Date() }, status: "SCHEDULED" },
                orderBy: { plannedDate: "asc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!trainerProfile) {
    if (session.role === "ADMIN") {
      redirect("/admin");
    }
    redirect("/login");
  }

  const allocatedBatches = trainerProfile.batchAllocations.map((a) => a.batch);

  // Parallelize batch progress calculations, upcoming classes, and recent sessions
  const [batchesWithStats, upcomingClasses, recentSubmittedSessions] = await Promise.all([
    Promise.all(
      allocatedBatches.map(async (batch) => {
        let progress = null;
        try {
          progress = await calculateBatchSyllabusProgress(batch.id);
        } catch {}

        return {
          ...batch,
          progress,
          studentCount: batch.enrollments.length,
        };
      })
    ),
    prisma.sessionOccurrence.findMany({
      where: {
        trainerProfileId: trainerProfile.id,
        plannedDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        status: "SCHEDULED",
      },
      include: {
        batch: { include: { course: true } },
      },
      orderBy: { plannedDate: "asc" },
      take: 3,
    }),
    prisma.classSession.findMany({
      where: { trainerProfileId: trainerProfile.id },
      include: {
        batch: { include: { course: true } },
        subtopicCoverages: { include: { subtopic: true } },
        _count: { select: { attendanceEntries: true } },
      },
      orderBy: { sessionDate: "desc" },
      take: 4,
    }),
  ]);

  const totalStudents = batchesWithStats.reduce((acc, b) => acc + b.studentCount, 0);

  return (
    <AppShell
      user={{
        name: trainerProfile.user.name,
        email: trainerProfile.user.email,
        role: "TRAINER",
      }}
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#6D1A2B] to-[#4E0F1E] rounded-2xl p-6 sm:p-8 text-white shadow-elevated relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-wider text-[#F6EBCF]">
            Faculty Instruction Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
            Welcome, {trainerProfile.user.name}!
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-stone-200 leading-relaxed">
            Faculty Code: <span className="font-mono font-bold text-[#F6EBCF]">{trainerProfile.employeeCode}</span>
            {" "}• Specialization: <span className="font-medium text-white">{trainerProfile.specialization || "Engineering"}</span>
          </p>
        </div>

        <div className="mt-4 sm:mt-0 sm:absolute sm:right-6 sm:bottom-6 z-10">
          <Link
            href="/trainer/session-entry"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 rounded-xl bg-[#C9A24B] hover:bg-[#B28E3B] text-white font-bold text-xs shadow-md transition-colors min-h-[44px] w-full sm:w-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit Class Session</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Assigned Batches"
          value={allocatedBatches.length}
          subtitle="Active Cohorts"
          icon={<Layers className="w-5 h-5 text-[#6D1A2B]" />}
        />
        <MetricCard
          title="Active Students"
          value={totalStudents}
          subtitle="Enrolled Across Batches"
          icon={<CheckCircle2 className="w-5 h-5 text-[#6D1A2B]" />}
        />
        <MetricCard
          title="Submitted Sessions"
          value={recentSubmittedSessions.length}
          subtitle="Locked Teaching Records"
          icon={<Clock className="w-5 h-5 text-[#6D1A2B]" />}
        />
        <MetricCard
          title="Upcoming Sessions"
          value={upcomingClasses.length}
          subtitle="On Calendar Timetable"
          icon={<Calendar className="w-5 h-5 text-[#6D1A2B]" />}
        />
      </div>

      {/* Main Grid: Upcoming Classes & Batch Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left: Upcoming Classes */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#2A0F16]/10 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#6D1A2B]" />
              <span>Upcoming Scheduled Sessions</span>
            </h2>
            <Link
              href="/trainer/calendar"
              className="text-xs text-[#6D1A2B] font-semibold hover:underline flex items-center gap-1 min-h-[44px] sm:min-h-0 flex items-center"
            >
              <span>Calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {upcomingClasses.length === 0 ? (
            <p className="text-xs text-stone-500 italic p-4 bg-stone-50 rounded-xl">
              No upcoming scheduled sessions on your timetable.
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="p-4 rounded-xl bg-[#FFFBF5] border border-stone-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                >
                  <div>
                    <span className="font-bold text-xs text-[#2A0F16] block">
                      {cls.batch.code} • {cls.batch.course.title}
                    </span>
                    <span className="text-[11px] text-stone-500 block mt-0.5">
                      {formatDate(cls.plannedDate)} ({cls.plannedStartTime} – {cls.plannedEndTime})
                    </span>
                    <span className="text-[11px] text-stone-500 block">
                      Room / Link: {cls.location || "Hybrid Bridge"}
                    </span>
                  </div>

                  <Link
                    href={`/trainer/session-entry?batchId=${cls.batchId}&occurrenceId=${cls.id}&date=${new Date(cls.plannedDate).toISOString().split("T")[0]}`}
                    className="w-full sm:w-auto px-3.5 py-2.5 sm:py-1.5 rounded-lg bg-[#6D1A2B] text-white text-xs font-semibold hover:bg-[#4E0F1E] transition-colors whitespace-nowrap text-center min-h-[44px] sm:min-h-0 flex items-center justify-center"
                  >
                    Enter Session
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Allocated Batches with Syllabus Progress */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#6D1A2B]" />
              <span>Assigned Cohorts & Syllabus</span>
            </h2>
            <Link
              href="/trainer/batches"
              className="text-xs text-[#6D1A2B] font-semibold hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {batchesWithStats.map((batch) => (
              <div
                key={batch.id}
                className="p-4 rounded-xl border border-stone-200/60 bg-[#FFFBF5]/40 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#6D1A2B]">
                      {batch.code}
                    </span>
                    <h3 className="text-sm font-bold text-[#2A0F16] mt-0.5">
                      {batch.course.title}
                    </h3>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      {batch.scheduleType} ({batch.classDays}, {batch.startTime} – {batch.endTime}) • {batch.studentCount} Students
                    </p>
                  </div>

                  <StatusBadge status={batch.status} size="sm" />
                </div>

                <div className="pt-2 border-t border-stone-100">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-stone-500 font-medium">Syllabus Coverage</span>
                    <span className="font-bold text-[#2A0F16]">
                      {batch.progress?.overallPercentage || 0}% ({batch.progress?.uniqueCoveredRequiredSubtopics || 0}/{batch.progress?.totalRequiredSubtopics || 0} Topics)
                    </span>
                  </div>
                  <ProgressIndicator value={batch.progress?.overallPercentage || 0} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
