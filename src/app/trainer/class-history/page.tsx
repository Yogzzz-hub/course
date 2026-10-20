import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { formatDate } from "@/lib/utils";
import { Clock, Lock, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TrainerClassHistoryPage() {
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

  const sessions = await prisma.classSession.findMany({
    where: { trainerProfileId: trainerProfile.id },
    include: {
      batch: { include: { course: true } },
      subtopicCoverages: { include: { subtopic: true } },
      attendanceEntries: true,
      corrections: true,
    },
    orderBy: { sessionDate: "desc" },
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
            Submitted Sessions
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
            Class Session History
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Complete atomic history of locked classroom sessions, attendance logs, and syllabus delivery.
          </p>
        </div>

        <Link
          href="/trainer/session-entry"
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#6D1A2B] text-white text-xs font-semibold hover:bg-[#4E0F1E] transition-colors flex items-center justify-center min-h-[44px]"
        >
          New Session Entry
        </Link>
      </div>

      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-stone-300 text-xs text-stone-500 italic">
            No class sessions have been submitted yet.
          </div>
        ) : (
          sessions.map((sess) => {
            const presentCount = sess.attendanceEntries.filter((a) => a.status === "PRESENT").length;
            const absentCount = sess.attendanceEntries.filter((a) => a.status === "ABSENT").length;
            const leaveCount = sess.attendanceEntries.filter((a) => a.status === "LEAVE").length;

            return (
              <div
                key={sess.id}
                className="bg-white rounded-2xl border border-[#2A0F16]/10 p-4 sm:p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#F6EBCF] text-[#4E0F1E]">
                      {sess.batch.code}
                    </span>
                    <span className="font-bold text-sm text-[#2A0F16]">
                      {formatDate(sess.sessionDate)}
                    </span>
                    <span className="text-xs font-mono text-stone-500">
                      ({sess.actualStartTime} – {sess.actualEndTime})
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                      {sess.sessionType}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                    <Link
                      href={`/trainer/corrections?sessionId=${sess.id}`}
                      className="text-xs text-[#6D1A2B] hover:underline font-semibold min-h-[36px] flex items-center"
                    >
                      Request Correction
                    </Link>
                  </div>
                </div>

                {/* Attendance Summary */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
                  <span className="text-stone-500 font-medium">Attendance:</span>
                  <span className="text-emerald-700 font-bold">{presentCount} Present</span>
                  <span className="text-rose-700 font-bold">{absentCount} Absent</span>
                  <span className="text-amber-700 font-bold">{leaveCount} Leave</span>
                  <span className="text-stone-400 font-mono text-[10px] sm:text-[11px] break-all">
                    (Key: {sess.idempotencyKey})
                  </span>
                </div>

                {/* Topics Covered */}
                {sess.subtopicCoverages.length > 0 && (
                  <div className="text-xs">
                    <span className="font-semibold text-stone-700 block mb-1">
                      Covered Syllabus Subtopics:
                    </span>
                    <ul className="space-y-1 text-stone-600 pl-4 border-l-2 border-[#6D1A2B]/40">
                      {sess.subtopicCoverages.map((cov) => (
                        <li key={cov.id}>• {cov.subtopic.title}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {sess.notes && (
                  <p className="text-xs text-stone-600 italic bg-[#FFFBF5] p-2.5 rounded-lg border border-stone-200/50">
                    "{sess.notes}"
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
