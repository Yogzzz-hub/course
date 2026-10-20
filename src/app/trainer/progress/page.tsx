import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateBatchSyllabusProgress } from "@/lib/progress";
import { AppShell } from "@/components/layout/AppShell";
import { ProgressIndicator } from "@/components/ui/ProgressIndicator";
import { formatDate } from "@/lib/utils";
import { Layers, CheckCircle2, Circle, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TrainerProgressPage() {
  let session;
  try {
    session = await requireAuth(["TRAINER", "ADMIN"]);
  } catch {
    redirect("/login");
  }

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.userId },
    include: {
      batchAllocations: {
        include: {
          batch: {
            include: { course: true, syllabusVersion: true },
          },
        },
      },
    },
  });

  if (!trainerProfile) redirect("/login");

  const progressList = await Promise.all(
    trainerProfile.batchAllocations.map(async (alloc: any) => {
      const b = alloc.batch;
      const prog = await calculateBatchSyllabusProgress(b.id);
      return {
        batch: b,
        prog,
      };
    })
  );

  return (
    <AppShell
      user={{
        name: "Trainer",
        email: "",
        role: "TRAINER",
      }}
    >
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
          Curriculum Audit
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Syllabus Coverage Progress
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Detailed delivery breakdown across all assigned cohorts. Progress reflects unique verified required subtopics taught.
        </p>
      </div>

      <div className="space-y-8">
        {progressList.map(({ batch, prog }) => (
          <div
            key={batch.id}
            className="bg-white rounded-2xl border border-[#2A0F16]/10 p-4 sm:p-6 shadow-sm space-y-5 sm:space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
              <div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#F6EBCF] text-[#4E0F1E]">
                  {batch.code}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-[#2A0F16] mt-1">{batch.course.title}</h2>
                <p className="text-xs text-stone-500">
                  Curriculum: {prog.syllabusVersionTitle} (v{prog.versionNumber}.0)
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#6D1A2B]">
                  {prog.overallPercentage}%
                </span>
                <span className="text-xs text-stone-500 block">
                  {prog.uniqueCoveredRequiredSubtopics} / {prog.totalRequiredSubtopics} Topics Delivered
                </span>
              </div>
            </div>

            <ProgressIndicator value={prog.overallPercentage} size="md" />

            {/* Modules Grid */}
            <div className="space-y-4">
              {prog.modules.map((mod: any, idx: number) => (
                <div key={mod.id} className="p-3.5 sm:p-4 rounded-xl border border-stone-100 bg-[#FFFBF5]/40 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-2">
                    <h3 className="font-bold text-stone-900">
                      Module {idx + 1}: {mod.title.replace(/^module\s+\d+:\s*/i, "")}
                    </h3>
                    <span className="font-bold text-[#6D1A2B]">
                      {mod.coveredSubtopics} / {mod.totalSubtopics} Covered ({mod.percentage}%)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {mod.subtopics.map((st: any) => (
                      <div
                        key={st.id}
                        className="flex items-start gap-2 p-2 rounded bg-white border border-stone-100"
                      >
                        {st.isCovered ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-stone-300 shrink-0 mt-0.5" />
                        )}
                        <span className={st.isCovered ? "font-semibold text-stone-900" : "text-stone-500"}>
                          {st.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
