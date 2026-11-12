import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateBatchSyllabusProgress } from "@/lib/progress";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProgressIndicator } from "@/components/ui/ProgressIndicator";
import { formatDate } from "@/lib/utils";
import { Layers, Users, Clock, Calendar, ArrowRight, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TrainerBatchesPage() {
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
              enrollments: {
                where: { status: "ACTIVE" },
                include: { studentProfile: { include: { user: true } } },
              },
              classSessions: {
                orderBy: { sessionDate: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!trainerProfile) redirect("/login");

  const batches = await Promise.all(
    trainerProfile.batchAllocations.map(async (alloc) => {
      const b = alloc.batch;
      let progress = null;
      try {
        progress = await calculateBatchSyllabusProgress(b.id);
      } catch {}
      return {
        ...b,
        progress,
        isPrimary: alloc.isPrimary,
      };
    })
  );

  return (
    <AppShell
      user={{
        name: trainerProfile.user.name,
        email: trainerProfile.user.email,
        role: "TRAINER",
      }}
    >
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
          Cohort Allocations
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Assigned Batches
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Cohorts explicitly allocated to you by academy administration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {batches.map((batch) => (
          <div
            key={batch.id}
            className="bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-card transition-shadow"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-xs text-[#6D1A2B] px-2 py-0.5 rounded bg-[#F6EBCF] border border-[#C9A24B]/30">
                  {batch.code}
                </span>
                <StatusBadge status={batch.status} size="sm" />
              </div>

              <h2 className="text-lg font-bold text-[#2A0F16]">{batch.course.title}</h2>
              <p className="text-xs text-stone-500 mt-1">
                Curriculum: {batch.syllabusVersion.title} (v{batch.syllabusVersion.versionNumber}.0)
              </p>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-stone-100 text-xs text-stone-700">
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
                  <span>{batch.enrollments.length} / {batch.capacity} Students</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{batch.isPrimary ? "Lead Faculty" : "Associate Faculty"}</span>
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

            <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
              <Link
                href={`/trainer/batches/${batch.id}`}
                className="text-xs font-semibold text-[#6D1A2B] hover:underline flex items-center justify-center sm:justify-start gap-1 min-h-[44px] sm:min-h-0"
              >
                <span>View Roster & Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                href={`/trainer/session-entry?batchId=${batch.id}`}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-1.5 rounded-lg bg-[#6D1A2B] text-white text-xs font-semibold hover:bg-[#4E0F1E] transition-colors min-h-[44px] flex items-center justify-center text-center"
              >
                Record Session
              </Link>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
