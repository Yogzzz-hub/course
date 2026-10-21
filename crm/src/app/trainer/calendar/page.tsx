import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { Calendar, Clock, MapPin, PlusCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TrainerCalendarPage() {
  let session;
  try {
    session = await requireAuth(["TRAINER", "ADMIN"]);
  } catch {
    redirect("/login");
  }

  const trainerProfile = await prisma.trainerProfile.findUnique({
    where: { userId: session.userId },
  });

  if (!trainerProfile) redirect("/login");

  const occurrences = await prisma.sessionOccurrence.findMany({
    where: { trainerProfileId: trainerProfile.id },
    include: {
      batch: { include: { course: true } },
      classSession: true,
    },
    orderBy: { plannedDate: "asc" },
  });

  return (
    <AppShell
      user={{
        name: "Trainer",
        email: "",
        role: "TRAINER",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
            Classroom Timetable
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
            Trainer Schedule Calendar
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Confirmed lecture hours across all allocated cohorts.
          </p>
        </div>

        <Link
          href="/trainer/session-entry"
          className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-[#6D1A2B] text-white text-xs font-semibold hover:bg-[#4E0F1E] transition-colors flex items-center justify-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Record Class Session</span>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#2A0F16]/10 flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-[#2A0F16]">All Scheduled Sessions</h2>
          <span className="text-xs text-stone-500 font-mono">
            {occurrences.length} Total Occurrences
          </span>
        </div>

        {occurrences.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 italic">
            No calendar occurrences assigned.
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {occurrences.map((occ) => {
              const isHeld = occ.status === "HELD";

              return (
                <div
                  key={occ.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/60 transition-colors"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#FFFBF5] border border-[#2A0F16]/10 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] uppercase font-bold text-[#6D1A2B]">
                        {new Date(occ.plannedDate).toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="text-base font-extrabold text-[#2A0F16] leading-none">
                        {new Date(occ.plannedDate).getUTCDate()}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-[#2A0F16] truncate">
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
                          <MapPin className="w-3.5 h-3.5 text-[#C9A24B]" />
                          <span>{occ.location || "Main Campus / Online"}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto">
                    {!isHeld ? (
                      <Link
                        href={`/trainer/session-entry?batchId=${occ.batchId}&occurrenceId=${occ.id}&date=${new Date(occ.plannedDate).toISOString().split("T")[0]}`}
                        className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-1.5 rounded-lg bg-[#6D1A2B] text-white text-xs font-semibold hover:bg-[#4E0F1E] transition-colors whitespace-nowrap flex items-center justify-center text-center"
                      >
                        Enter Session
                      </Link>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 block text-center sm:inline-block">
                        ✓ Submitted
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
