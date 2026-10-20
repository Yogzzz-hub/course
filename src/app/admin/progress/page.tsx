import React from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateBatchSyllabusProgress } from "@/lib/progress";
import { AppShell } from "@/components/layout/AppShell";
import { ProgressIndicator } from "@/components/ui/ProgressIndicator";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { TrendingUp, Layers, CheckCircle2, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminProgressPage() {
  let session;
  try {
    session = await requireAuth(["ADMIN"]);
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
      enrollments: { where: { status: "ACTIVE" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const progressList = await Promise.all(
    batches.map(async (b) => {
      let progress = null;
      try {
        progress = await calculateBatchSyllabusProgress(b.id);
      } catch {}

      return {
        ...b,
        progress,
        trainerName: b.trainerAllocations[0]?.trainerProfile?.user?.name || "Unassigned",
      };
    })
  );

  return (
    <AppShell
      user={{
        name: "Administrator",
        email: "admin@apexacademy.edu",
        role: "ADMIN",
      }}
    >
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
          Academic Audit
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Academy Syllabus Delivery Audit
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Cohort-by-cohort verification of required syllabus subtopics taught by faculty.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {progressList.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 italic bg-white rounded-2xl border border-[#2A0F16]/10">
            No active batches currently provisioned.
          </div>
        ) : (
          progressList.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-[#2A0F16]/10 p-4 sm:p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[#F6EBCF] text-[#4E0F1E]">
                      {item.code}
                    </span>
                    <span className="font-bold text-sm sm:text-base text-[#2A0F16]">
                      {item.course.title}
                    </span>
                    <StatusBadge status={item.status} size="sm" />
                  </div>
                  <p className="text-xs text-stone-500">
                    Lead Faculty: <span className="font-semibold text-stone-800">{item.trainerName}</span> •{" "}
                    {item.enrollments.length} Active Students
                  </p>
                </div>

                <div className="flex sm:flex-col justify-between sm:justify-start items-center sm:items-end pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                  <span className="text-xl sm:text-2xl font-extrabold text-[#6D1A2B]">
                    {item.progress?.overallPercentage || 0}%
                  </span>
                  <span className="text-[11px] sm:text-xs text-stone-500 block">
                    {item.progress?.uniqueCoveredRequiredSubtopics || 0} of {item.progress?.totalRequiredSubtopics || 0} Topics
                  </span>
                </div>
              </div>

              <ProgressIndicator value={item.progress?.overallPercentage || 0} size="md" />

              {/* Modules Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 pt-2">
                {item.progress?.modules.map((mod) => (
                  <div key={mod.id} className="p-3 rounded-xl bg-[#FFFBF5] border border-stone-100 text-xs">
                    <div className="flex justify-between items-center mb-1 gap-2">
                      <span className="font-bold text-stone-900 truncate">{mod.title}</span>
                      <span className="font-semibold text-[#6D1A2B] shrink-0">{mod.percentage}%</span>
                    </div>
                    <span className="text-[11px] text-stone-500 block">
                      {mod.coveredSubtopics} of {mod.totalSubtopics} Subtopics Covered
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
