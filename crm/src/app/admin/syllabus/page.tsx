import React from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import { Layers, BookOpen, CheckCircle2, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSyllabusPage() {
  let session;
  try {
    session = await requireAuth(["ADMIN"]);
  } catch {
    redirect("/login");
  }

  const courses = await prisma.course.findMany({
    include: {
      syllabusVersions: {
        include: {
          modules: {
            orderBy: { orderIndex: "asc" },
            include: {
              subtopics: { orderBy: { orderIndex: "asc" } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell
      user={{
        name: "Administrator",
        email: "admin@apexacademy.edu",
        role: "ADMIN",
      }}
    >
      <div className="space-y-4 sm:space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
            Curriculum Governance
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2A0F16] mt-0.5">
            Versioned Syllabus Management
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Review curriculum versions, module hierarchies, and required subtopic specifications.
          </p>
        </div>

        <div className="space-y-6 sm:space-y-8 pb-12">
          {courses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500 text-sm">
              No courses configured with syllabus records yet.
            </div>
          ) : (
            courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-[#2A0F16]/10 p-4 sm:p-6 shadow-sm space-y-5 sm:space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
                  <div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#F6EBCF] text-[#4E0F1E]">
                      {course.code}
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-[#2A0F16] mt-1 break-words">{course.title}</h2>
                    <p className="text-xs text-stone-500">{course.category}</p>
                  </div>

                  <span className="text-xs font-semibold text-stone-600 bg-stone-100 px-2.5 py-1 rounded-full self-start sm:self-auto shrink-0">
                    {course.syllabusVersions.length} Version{course.syllabusVersions.length !== 1 ? "s" : ""} on Record
                  </span>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  {course.syllabusVersions.length === 0 ? (
                    <p className="text-xs text-stone-400 italic">No syllabus versions released for this course yet.</p>
                  ) : (
                    course.syllabusVersions.map((version) => (
                      <div
                        key={version.id}
                        className="p-3.5 sm:p-5 rounded-xl border border-stone-200/60 bg-[#FFFBF5]/40 space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-sm text-[#2A0F16] break-words">
                              {version.title} (v{version.versionNumber}.0)
                            </h3>
                            <p className="text-[11px] text-stone-500">
                              {version.approvedAt
                                ? `Approved on ${formatDate(version.approvedAt)}`
                                : "Draft Version"}
                            </p>
                          </div>

                          <div className="self-start sm:self-auto shrink-0">
                            <StatusBadge status={version.status} size="sm" />
                          </div>
                        </div>

                        <div className="space-y-3">
                          {version.modules.map((mod, idx) => (
                            <div
                              key={mod.id}
                              className="p-3 sm:p-3.5 rounded-lg bg-white border border-stone-100 text-xs shadow-xs"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between font-bold text-stone-900 gap-1 mb-1">
                                <span className="break-words">
                                  Module {idx + 1}: {mod.title.replace(/^module\s+\d+:\s*/i, "")}
                                </span>
                                <span className="text-[11px] text-stone-400 font-normal font-mono shrink-0">
                                  {mod.subtopics.length} Subtopics
                                </span>
                              </div>

                              <ul className="mt-2 space-y-1.5 text-stone-600 pl-3 border-l-2 border-[#C9A24B]/40">
                                {mod.subtopics.map((st) => (
                                  <li key={st.id} className="flex items-start sm:items-center justify-between gap-2">
                                    <span className="break-words">• {st.title}</span>
                                    <span className="text-[10px] text-stone-400 font-mono shrink-0 whitespace-nowrap">
                                      {st.estimatedMinutes}m {st.isRequired && "(Req)"}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
