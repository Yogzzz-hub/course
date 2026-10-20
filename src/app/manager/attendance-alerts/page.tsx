import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Clock, Calendar, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ManagerAttendanceAlertsPage() {
  let session;
  try {
    session = await requireAuth(["MANAGER", "ADMIN"]);
  } catch {
    redirect("/login");
  }

  // 1. Missing session submissions: occurrences marked held or in past without classSession
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const missingSessions = await prisma.sessionOccurrence.findMany({
    where: {
      plannedDate: { lte: yesterday },
      status: { in: ["SCHEDULED", "HELD"] },
      classSession: null,
    },
    include: {
      batch: { include: { course: true } },
      trainerProfile: { include: { user: true } },
    },
    orderBy: { plannedDate: "desc" },
  });

  // 2. Pending correction requests
  const pendingCorrections = await prisma.correctionRequest.findMany({
    where: { status: "PENDING" },
    include: {
      requestedBy: true,
      classSession: {
        include: { batch: { include: { course: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

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
          Academic Compliance
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Attendance Compliance & Operational Alerts
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Monitor missing trainer attendance submissions and audit correction requests.
        </p>
      </div>

      <div className="space-y-8">
        {/* Missing Submissions Section */}
        <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#2A0F16]">
                  Past Sessions With Missing Attendance
                </h2>
                <p className="text-xs text-stone-500">
                  Scheduled occurrences past due with no locked faculty submission recorded.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-rose-50 text-rose-800 border border-rose-200 shrink-0 ml-2">
              {missingSessions.length} Alerts
            </span>
          </div>

          {missingSessions.length === 0 ? (
            <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>All past scheduled occurrences have verified class submissions on file!</span>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {missingSessions.map((item) => (
                <div
                  key={item.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#6D1A2B]">{item.batch.code}</span>
                      <span className="font-bold text-[#2A0F16]">{item.batch.course.title}</span>
                    </div>
                    <p className="text-stone-500 mt-0.5">
                      Scheduled: {formatDate(item.plannedDate)} ({item.plannedStartTime} – {item.plannedEndTime})
                    </p>
                    <p className="text-stone-700 mt-0.5">
                      Assigned Faculty: <span className="font-semibold">{item.trainerProfile.user.name}</span>
                    </p>
                  </div>

                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-rose-100 text-rose-800 self-start sm:self-auto">
                    Missing Submission
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Session Corrections */}
        <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#2A0F16]">
                Pending Session Correction Requests
              </h2>
              <p className="text-xs text-stone-500">
                Formal faculty adjustment proposals awaiting review.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 shrink-0 ml-2">
              {pendingCorrections.length} In Review
            </span>
          </div>

          {pendingCorrections.length === 0 ? (
            <div className="p-6 bg-stone-50 rounded-xl text-xs text-stone-500 italic text-center">
              No pending correction proposals awaiting review.
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {pendingCorrections.map((corr) => (
                <div key={corr.id} className="py-3.5 space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-bold text-[#2A0F16]">
                      Batch {corr.classSession.batch.code} • Field: {corr.targetField}
                    </span>
                    <span className="text-stone-500 text-[11px]">
                      Requested by {corr.requestedBy.name} on {formatDate(corr.createdAt)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-lg bg-[#FFFBF5] border border-stone-200 font-mono text-[11px]">
                    <div>
                      <span className="text-stone-400 block">Existing Value:</span>
                      <span className="text-stone-700">{corr.oldValue}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block">Proposed Value:</span>
                      <span className="text-[#6D1A2B] font-bold">{corr.proposedValue}</span>
                    </div>
                  </div>

                  <p className="text-stone-600">
                    <span className="font-semibold text-stone-800">Reason:</span> {corr.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
