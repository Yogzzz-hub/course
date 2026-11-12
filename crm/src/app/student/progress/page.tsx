import React from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateBatchSyllabusProgress } from "@/lib/progress";
import { AppShell } from "@/components/layout/AppShell";
import { ProgressIndicator } from "@/components/ui/ProgressIndicator";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, Circle, Layers, Clock, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentProgressPage() {
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
            },
          },
        },
      },
    },
  });

  if (!studentProfile) redirect("/login");

  const enrollment = studentProfile.enrollments[0];
  const batch = enrollment?.batch;

  let progress = null;
  if (batch) {
    progress = await calculateBatchSyllabusProgress(batch.id);
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
          Curriculum Coverage
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Syllabus Delivery & Progress
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Tracking against <span className="font-bold text-[#6D1A2B]">{progress?.syllabusVersionTitle}</span> for Batch{" "}
          <span className="font-bold">{batch?.code}</span>
        </p>
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#2A0F16]">
              Overall Syllabus Coverage
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {progress?.uniqueCoveredRequiredSubtopics} of {progress?.totalRequiredSubtopics} required subtopics verified as taught by faculty.
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-extrabold text-[#6D1A2B]">
              {progress?.overallPercentage || 0}%
            </span>
          </div>
        </div>

        <ProgressIndicator value={progress?.overallPercentage || 0} size="lg" />

        {progress?.lastTeachingDate && (
          <p className="text-xs text-stone-500 pt-2 border-t border-stone-100">
            Last classroom session taught: <span className="font-semibold text-stone-800">{formatDate(progress.lastTeachingDate)}</span>
          </p>
        )}
      </div>

      {/* Modules and Subtopics Breakdown */}
      <div className="space-y-6">
        {progress?.modules.map((mod, idx) => (
          <div
            key={mod.id}
            className="bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <span className="text-xs font-bold text-[#6D1A2B] uppercase tracking-wider">
                  Module {idx + 1}
                </span>
                <h3 className="text-base font-bold text-[#2A0F16] mt-0.5">
                  {mod.title}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-stone-600">
                  {mod.coveredSubtopics} / {mod.totalSubtopics} Covered
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#F6EBCF] text-[#4E0F1E]">
                  {mod.percentage}%
                </span>
              </div>
            </div>

            <ProgressIndicator value={mod.percentage} size="sm" className="mb-4" />

            <div className="divide-y divide-stone-100">
              {mod.subtopics.map((st, sIdx) => (
                <div
                  key={st.id}
                  className="py-3 flex items-start justify-between gap-4 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    {st.isCovered ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-stone-300 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span
                        className={
                          st.isCovered
                            ? "font-semibold text-stone-900"
                            : "text-stone-600"
                        }
                      >
                        {idx + 1}.{sIdx + 1} {st.title}
                      </span>
                      {st.isCovered && st.firstCoveredDate && (
                        <span className="block text-[11px] text-emerald-700 mt-0.5">
                          Taught on {formatDate(st.firstCoveredDate)}
                          {st.timesTaught > 1 && ` (Reinforced ${st.timesTaught}x)`}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] text-stone-400 font-mono whitespace-nowrap">
                    {st.isCovered ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                        Completed
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                        Upcoming
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
