import React from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { formatDate } from "@/lib/utils";
import { BookOpen, Layers, Clock, Calendar, User, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentMyCoursePage() {
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
        include: {
          batch: {
            include: {
              course: true,
              syllabusVersion: {
                include: {
                  modules: {
                    include: { subtopics: true },
                    orderBy: { orderIndex: "asc" },
                  },
                },
              },
              trainerAllocations: {
                include: {
                  trainerProfile: {
                    include: { user: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!profile) redirect("/login");

  const enrollment = profile.enrollments[0];
  const batch = enrollment?.batch;
  const course = batch?.course;
  const trainer = batch?.trainerAllocations[0]?.trainerProfile.user;

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
          Academic Program
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
          {course?.title || "My Course Details"}
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Official enrollment specifications and curriculum roadmap.
        </p>
      </div>

      {course && batch && (
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm">
            <h2 className="text-base font-bold text-[#2A0F16] mb-4">
              Enrollment Specifications (Read-Only)
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-stone-700">
              <div className="p-3 rounded-xl bg-[#FFFBF5] border border-[#2A0F16]/10">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">
                  Course Code
                </span>
                <span className="font-bold text-sm text-[#2A0F16]">{course.code}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#FFFBF5] border border-[#2A0F16]/10">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">
                  Batch Code
                </span>
                <span className="font-bold text-sm text-[#6D1A2B]">{batch.code}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#FFFBF5] border border-[#2A0F16]/10">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">
                  Assigned Faculty
                </span>
                <span className="font-bold text-sm text-[#2A0F16]">
                  {trainer?.name || "Assigned Trainer"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#FFFBF5] border border-[#2A0F16]/10">
                <span className="text-[10px] text-stone-500 uppercase block font-semibold">
                  Start Date
                </span>
                <span className="font-bold text-sm text-[#2A0F16]">
                  {formatDate(batch.startDate)}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-stone-100 text-xs text-stone-600 leading-relaxed">
              <p>{course.description}</p>
            </div>
          </div>

          {/* Curriculum Structure */}
          <div className="bg-white rounded-2xl border border-[#2A0F16]/10 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[#2A0F16]">
                Assigned Syllabus Structure
              </h2>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-[#F6EBCF] text-[#4E0F1E] font-medium">
                {batch.syllabusVersion.title} (v{batch.syllabusVersion.versionNumber})
              </span>
            </div>

            <div className="space-y-4">
              {batch.syllabusVersion.modules.map((mod, idx) => (
                <div key={mod.id} className="p-4 rounded-xl border border-stone-100 bg-[#FFFBF5]/40 text-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#2A0F16]">
                      Module {idx + 1}: {mod.title.replace(/^module\s+\d+:\s*/i, "")}
                    </h3>
                    <span className="text-[11px] text-stone-500 font-medium">
                      {mod.subtopics.length} Subtopics
                    </span>
                  </div>
                  {mod.description && (
                    <p className="mt-1 text-stone-600 text-[11px]">{mod.description}</p>
                  )}
                  <ul className="mt-2.5 space-y-1 text-stone-700 pl-3 border-l-2 border-[#C9A24B]/40">
                    {mod.subtopics.map((st) => (
                      <li key={st.id} className="text-[11px]">
                        • {st.title} {st.isRequired && <span className="text-[10px] text-stone-400">(Required)</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
