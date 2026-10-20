import React from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { Clock, BookOpen, CheckCircle2, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentClassesPage() {
  let session;
  try {
    session = await requireAuth(["STUDENT"]);
  } catch {
    redirect("/login");
  }

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.userId },
    include: {
      user: true,
      enrollments: {
        where: { status: "ACTIVE" },
        include: { batch: true },
      },
    },
  });

  if (!profile) redirect("/login");

  const enrollment = profile.enrollments[0];
  const batch = enrollment?.batch;

  const sessions = batch
    ? await prisma.classSession.findMany({
        where: { batchId: batch.id },
        include: {
          trainerProfile: { include: { user: true } },
          attendanceEntries: {
            where: { studentProfileId: profile.id },
          },
          subtopicCoverages: {
            include: { subtopic: true },
          },
        },
        orderBy: { sessionDate: "desc" },
      })
    : [];

  return (
    <AppShell
      user={{
        name: profile.user.name,
        email: profile.user.email,
        role: "STUDENT",
        registrationNumber: profile.registrationNumber,
      }}
    >
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
          Classroom Logs
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          Class Session History
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Atomic logs of held classroom sessions, actual timings, and syllabus topics taught.
        </p>
      </div>

      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-stone-300 text-xs text-stone-500">
            No class sessions have been submitted yet.
          </div>
        ) : (
          sessions.map((item) => {
            const entry = item.attendanceEntries[0];
            const myStatus = entry?.status || "NOT_SUBMITTED";

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-[#2A0F16]/10 p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-stone-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="text-sm font-bold text-[#2A0F16]">
                      {formatDate(item.sessionDate)}
                    </span>
                    <span className="text-xs font-mono text-stone-500">
                      Actual: {item.actualStartTime} – {item.actualEndTime}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#F6EBCF] text-[#4E0F1E]">
                      {item.sessionType}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-xs text-stone-500">My Attendance:</span>
                    <StatusBadge status={myStatus} size="sm" />
                  </div>
                </div>

                {/* Subtopics Covered */}
                {item.subtopicCoverages.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold uppercase text-stone-500 block mb-1">
                      Syllabus Topics Covered:
                    </span>
                    <ul className="space-y-1 text-xs text-stone-700 pl-4 border-l-2 border-[#6D1A2B]/40">
                      {item.subtopicCoverages.map((cov) => (
                        <li key={cov.id} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{cov.subtopic.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {item.notes && (
                  <div className="p-3 rounded-lg bg-[#FFFBF5] border border-stone-200/60 text-xs text-stone-600">
                    <span className="font-semibold text-stone-900 block mb-0.5">Faculty Notes:</span>
                    <p>{item.notes}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
