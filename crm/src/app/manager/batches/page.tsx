import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateBatchSyllabusProgress } from "@/lib/progress";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProgressIndicator } from "@/components/ui/ProgressIndicator";
import { formatDate } from "@/lib/utils";
import { Layers, Users, Clock, Calendar, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ManagerBatchesPage() {
  let session;
  try {
    session = await requireAuth(["MANAGER", "ADMIN"]);
  } catch {
    redirect("/login");
  }

  const batches = await prisma.batch.findMany({
    include: {
      course: true,
      syllabusVersion: true,
      trainerAllocations: {
        include: { trainerProfile: { include: { user: true } } },
      },
      enrollments: {
        where: { status: "ACTIVE" },
      },
      _count: { select: { classSessions: true, occurrences: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const batchesWithStats = await Promise.all(
    batches.map(async (b) => {
      let progress = null;
      try {
        progress = await calculateBatchSyllabusProgress(b.id);
      } catch {}

      return {
        ...b,
        progress,
        trainerName: b.trainerAllocations[0]?.trainerProfile.user.name || "Unassigned",
        utilizationRate: b.capacity > 0 ? Math.round((b.enrollments.length / b.capacity) * 100) : 0,
      };
    })
  );

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
          Cohort Operations
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Batch & Capacity Monitoring
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Monitor active cohort rosters, faculty allocations, timetable delivery, and syllabus progress.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {batchesWithStats.map((batch) => (
          <div
            key={batch.id}
            className="bg-white rounded-2xl border border-[#2A0F16]/10 p-4 sm:p-6 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-card transition-shadow"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-xs text-[#6D1A2B] px-2 py-0.5 rounded bg-[#F6EBCF] border border-[#C9A24B]/30">
                  {batch.code}
                </span>
                <StatusBadge status={batch.status} size="sm" />
              </div>

              <h2 className="text-base font-bold text-[#2A0F16]">{batch.course.title}</h2>
              <p className="text-xs text-stone-500 mt-0.5">Faculty: {batch.trainerName}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pt-3 border-t border-stone-100 text-xs text-stone-700">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#C9A24B]" />
                  <span>{batch.scheduleType} ({batch.classDays})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#C9A24B]" />
                  <span>{batch.startTime} – {batch.endTime}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#C9A24B]" />
                  <span>{batch.enrollments.length} / {batch.capacity} ({batch.utilizationRate}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#C9A24B]" />
                  <span>{batch._count.classSessions} Held Sessions</span>
                </div>
              </div>

              {batch.progress && (
                <div className="mt-4 pt-3 border-t border-stone-100 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-500">Syllabus Progress</span>
                    <span className="font-bold text-[#2A0F16]">{batch.progress.overallPercentage}%</span>
                  </div>
                  <ProgressIndicator value={batch.progress.overallPercentage} size="sm" />
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
              <span className="text-[11px] text-stone-500">
                Start: {formatDate(batch.startDate)}
              </span>
              <span className="text-xs font-semibold text-[#6D1A2B]">
                Mode: {batch.trainingMode}
              </span>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
