import React from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { Calendar, Clock, MapPin, User } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ManagerCalendarPage() {
  let session;
  try {
    session = await requireAuth(["MANAGER", "ADMIN"]);
  } catch {
    redirect("/login");
  }

  const occurrences = await prisma.sessionOccurrence.findMany({
    include: {
      batch: { include: { course: true } },
      trainerProfile: { include: { user: true } },
      classSession: true,
    },
    orderBy: { plannedDate: "asc" },
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
          Master Schedule
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Academy Master Calendar
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Complete cross-cohort timetable, trainer scheduling, and session delivery states.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#2A0F16]/10 flex items-center justify-between">
          <h2 className="text-base font-bold text-[#2A0F16]">All Cohort Sessions</h2>
          <span className="text-xs font-mono font-semibold text-stone-500">
            {occurrences.length} Sessions Scheduled
          </span>
        </div>

        {occurrences.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 italic">
            No session occurrences scheduled.
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {occurrences.map((occ) => (
              <div
                key={occ.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/60 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#FFFBF5] border border-[#2A0F16]/10 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] uppercase font-bold text-[#6D1A2B]">
                      {new Date(occ.plannedDate).toLocaleDateString("en-US", { month: "short" })}
                    </span>
                    <span className="text-base font-extrabold text-[#2A0F16] leading-none">
                      {new Date(occ.plannedDate).getUTCDate()}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#2A0F16]">
                        {occ.batch.code} • {occ.batch.course.title}
                      </span>
                      <StatusBadge status={occ.status} size="sm" />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-stone-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#C9A24B]" />
                        <span>{occ.plannedStartTime} – {occ.plannedEndTime}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-[#C9A24B]" />
                        <span>Faculty: {occ.trainerProfile.user.name}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#C9A24B]" />
                        <span>{occ.location || "Hybrid Bridge"}</span>
                      </span>
                    </div>

                    {occ.cancellationReason && (
                      <p className="mt-1 text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded inline-block">
                        Note: {occ.cancellationReason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="w-full sm:w-auto text-left sm:text-right">
                  {occ.classSession ? (
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 block text-center sm:inline-block">
                      ✓ Session Submitted & Locked
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-2.5 py-1.5 rounded-lg block text-center sm:inline-block">
                      Pending Delivery
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
