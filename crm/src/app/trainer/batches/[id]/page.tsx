import React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateBatchSyllabusProgress } from "@/lib/progress";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProgressIndicator } from "@/components/ui/ProgressIndicator";
import { formatDate } from "@/lib/utils";
import {
  Users,
  Layers,
  Clock,
  Calendar,
  CheckCircle2,
  Lock,
  PlusCircle,
  FileCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface BatchDetailProps {
  params: Promise<{ id: string }>;
}

export default async function TrainerBatchDetailPage({ params }: BatchDetailProps) {
  let session;
  try {
    session = await requireAuth(["TRAINER", "ADMIN"]);
  } catch {
    redirect("/login");
  }

  const { id } = await params;

  // Authorization check: Trainer must be allocated (unless admin)
  if (session.role === "TRAINER") {
    const isAllocated = await prisma.trainerBatchAllocation.findFirst({
      where: {
        batchId: id,
        trainerProfile: { userId: session.userId },
      },
    });
    if (!isAllocated) notFound();
  }

  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      course: true,
      syllabusVersion: {
        include: {
          modules: {
            orderBy: { orderIndex: "asc" },
            include: {
              subtopics: { orderBy: { orderIndex: "asc" } },
            },
          },
        },
      },
      enrollments: {
        include: {
          studentProfile: {
            include: { user: true },
          },
        },
      },
      classSessions: {
        include: {
          subtopicCoverages: { include: { subtopic: true } },
          _count: { select: { attendanceEntries: true } },
        },
        orderBy: { sessionDate: "desc" },
      },
    },
  });

  if (!batch) notFound();

  const progress = await calculateBatchSyllabusProgress(batch.id);

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
          <div className="flex items-center gap-2 mb-1">
            <Link href="/trainer/batches" className="text-xs text-[#6D1A2B] hover:underline">
              Batches
            </Link>
            <span className="text-stone-400">/</span>
            <span className="font-mono text-xs font-bold text-stone-700">{batch.code}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16]">
            {batch.code} • {batch.course.title}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            {batch.scheduleType} Track ({batch.classDays}, {batch.startTime} – {batch.endTime})
          </p>
        </div>

        <Link
          href={`/trainer/session-entry?batchId=${batch.id}`}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#6D1A2B] text-white text-xs font-bold hover:bg-[#4E0F1E] transition-colors flex items-center justify-center gap-1.5 shadow-sm min-h-[44px]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Record Session</span>
        </Link>
      </div>

      {/* Progress & Stats Card */}
      <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
              Curriculum Delivery Progress
            </span>
            <h2 className="text-lg font-bold text-[#2A0F16] mt-0.5">
              {progress.uniqueCoveredRequiredSubtopics} of {progress.totalRequiredSubtopics} Required Topics Covered
            </h2>
          </div>
          <span className="text-3xl font-extrabold text-[#6D1A2B]">
            {progress.overallPercentage}%
          </span>
        </div>
        <ProgressIndicator value={progress.overallPercentage} size="lg" />
      </div>

      {/* Roster & Submitted Sessions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Student Roster */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#2A0F16]/10 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#6D1A2B]" />
              <span>Enrolled Student Roster</span>
            </h2>
            <span className="text-xs font-mono font-semibold text-stone-500">
              {batch.enrollments.length} / {batch.capacity}
            </span>
          </div>

          <div className="divide-y divide-stone-100">
            {batch.enrollments.map((enr) => (
              <div
                key={enr.id}
                className="p-4 flex items-center justify-between gap-3 hover:bg-stone-50/50 transition-colors"
              >
                <div>
                  <span className="text-xs font-bold text-[#2A0F16] block">
                    {enr.studentProfile.user.name}
                  </span>
                  <span className="text-[11px] font-mono text-[#6D1A2B]">
                    {enr.studentProfile.registrationNumber}
                  </span>
                  <span className="text-[11px] text-stone-500 block">
                    Enrolled: {formatDate(enr.effectiveStartDate)}
                  </span>
                </div>

                <StatusBadge status={enr.status} size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Submitted Sessions */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#2A0F16]/10 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-[#2A0F16]/10 flex items-center justify-between">
            <h2 className="text-base font-bold text-[#2A0F16] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#6D1A2B]" />
              <span>Locked Submitted Sessions</span>
            </h2>
            <Link
              href="/trainer/class-history"
              className="text-xs text-[#6D1A2B] font-semibold hover:underline"
            >
              All History
            </Link>
          </div>

          {batch.classSessions.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500 italic">
              No class sessions submitted yet.
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {batch.classSessions.map((session) => (
                <div key={session.id} className="p-4 space-y-2 hover:bg-stone-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2A0F16]">
                      {formatDate(session.sessionDate)} ({session.actualStartTime} – {session.actualEndTime})
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 line-clamp-1">
                    {session.subtopicCoverages.map((c) => c.subtopic.title).join(", ") ||
                      session.notes ||
                      "Class session held."}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
                    <span>{session._count.attendanceEntries} attendance entries recorded</span>
                    <Link
                      href="/trainer/corrections"
                      className="text-[#6D1A2B] hover:underline font-medium"
                    >
                      Request Correction
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
