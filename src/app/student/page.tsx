import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateStudentBatchAttendance } from "@/lib/attendance";
import { calculateBatchSyllabusProgress } from "@/lib/progress";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/ui/MetricCard";
import { ProgressIndicator } from "@/components/ui/ProgressIndicator";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  User,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentOverviewPage() {
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
            include: {
              course: true,
              syllabusVersion: true,
              trainerAllocations: {
                include: {
                  trainerProfile: {
                    include: { user: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!studentProfile) {
    redirect("/login");
  }

  const enrollment = studentProfile.enrollments[0];
  const batch = enrollment?.batch;

  let attendance = null;
  let syllabus = null;
  let nextSession = null;
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
            include: { subtopic: true },
          },
        },
        orderBy: { sessionDate: "desc" },
        take: 4,
      }),
    ]);

    attendance = att;
    syllabus = syl;
    nextSession = next;
    recentSessions = rec;
  }

  const primaryTrainer = batch?.trainerAllocations[0]?.trainerProfile.user;

  return (
    <AppShell
      user={{
        name: studentProfile.user.name,
        email: studentProfile.user.email,
        role: "STUDENT",
        registrationNumber: studentProfile.registrationNumber,
      }}
    >
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#6D1A2B] to-[#4E0F1E] rounded-2xl p-6 sm:p-8 text-white shadow-elevated relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-wider text-[#F6EBCF]">
            Student Academic Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
            Welcome back, {studentProfile.user.name.split(" ")[0]}!
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-stone-200 leading-relaxed">
            Registration: <span className="font-mono font-bold text-[#F6EBCF]">{studentProfile.registrationNumber}</span>
            {batch && (
              <>
                {" "}• Batch: <span className="font-bold text-white">{batch.code}</span> ({batch.course.title})
              </>
            )}
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Attendance Rate"
          value={attendance?.heldToDatePercentage !== null ? `${attendance?.heldToDatePercentage}%` : "N/A"}
          subtitle={`${attendance?.presentCount || 0} Present of ${attendance?.totalHeld || 0} Held Classes`}
          icon={<CheckCircle2 className="w-5 h-5" />}
        />

        <MetricCard
          title="Syllabus Progress"
          value={`${syllabus?.overallPercentage || 0}%`}
          subtitle={`${syllabus?.uniqueCoveredRequiredSubtopics || 0} of ${syllabus?.totalRequiredSubtopics || 0} Topics Covered`}
          icon={<TrendingUp className="w-5 h-5" />}
        />

        <MetricCard
          title="Lead Faculty"
          value={primaryTrainer ? primaryTrainer.name.split(" ")[0] : "Assigned"}
          subtitle={primaryTrainer ? primaryTrainer.name : "Faculty Lead"}
          icon={<User className="w-5 h-5" />}
        />

        <MetricCard
          title="Enrolled Batch"
          value={batch ? batch.code : "Unassigned"}
          subtitle={batch ? `${batch.scheduleType} (${batch.classDays})` : "Pending Allocation"}
          icon={<BookOpen className="w-5 h-5" />}
        />
      </div>

      {/* Next Upcoming Session & Attendance Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Next Scheduled Session */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#6D1A2B]" />
              <span>Next Scheduled Class</span>
            </h2>
            <Link
              href="/student/calendar"
              className="text-xs text-[#6D1A2B] font-semibold hover:underline flex items-center gap-1"
            >
              <span>Full Calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {nextSession ? (
            <div className="p-4 rounded-xl bg-[#FFFBF5] border border-[#2A0F16]/10 space-y-2 text-xs text-stone-700">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#2A0F16]">
                  {formatDate(nextSession.plannedDate)}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold font-mono">
                  {nextSession.plannedStartTime} – {nextSession.plannedEndTime}
                </span>
              </div>
              <p>
                <span className="font-semibold text-stone-900">Location:</span>{" "}
                {nextSession.location || "Hybrid Classroom Bridge"}
              </p>
              <p>
                <span className="font-semibold text-stone-900">Batch:</span> {batch?.code}
              </p>
            </div>
          ) : (
            <p className="text-xs text-stone-500 italic p-4 bg-stone-50 rounded-xl">
              No upcoming scheduled sessions found in the timetable for this week.
            </p>
          )}

          {/* Quick Syllabus Bar */}
          {syllabus && (
            <div className="mt-6 pt-4 border-t border-stone-100">
              <span className="text-xs font-bold text-stone-700 block mb-2">
                Overall Batch Curriculum Coverage
              </span>
              <ProgressIndicator value={syllabus.overallPercentage} />
            </div>
          )}
        </div>

        {/* Recent Class Attendance History */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#6D1A2B]" />
              <span>Recent Class Activity</span>
            </h2>
            <Link
              href="/student/classes"
              className="text-xs text-[#6D1A2B] font-semibold hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentSessions.length === 0 ? (
            <p className="text-xs text-stone-500 italic p-4 bg-stone-50 rounded-xl">
              No class sessions have been submitted for this batch yet.
            </p>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session) => {
                const entry = session.attendanceEntries[0];
                const status = entry?.status || "NOT_SUBMITTED";

                return (
                  <div
                    key={session.id}
                    className="p-3.5 rounded-xl border border-stone-100 hover:border-stone-200 transition-colors bg-[#FFFBF5]/40 flex items-start justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#2A0F16]">
                          {formatDate(session.sessionDate)}
                        </span>
                        <span className="text-[11px] text-stone-500 font-mono">
                          ({session.actualStartTime} - {session.actualEndTime})
                        </span>
                      </div>
                      <p className="text-stone-600 mt-1 line-clamp-1">
                        {session.subtopicCoverages.map((c: any) => c.subtopic.title).join(", ") ||
                          session.notes ||
                          "Class session delivered."}
                      </p>
                    </div>

                    <StatusBadge status={status} size="sm" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
