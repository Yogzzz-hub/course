import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Accordion } from "@/components/ui/Accordion";
import { CourseDetailClientCTA } from "./CourseDetailClientCTA";
import {
  Clock,
  BookOpen,
  Award,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  GraduationCap,
  Layers,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      syllabusVersions: {
        where: { status: "APPROVED" },
        include: {
          modules: {
            orderBy: { orderIndex: "asc" },
            include: {
              subtopics: {
                orderBy: { orderIndex: "asc" },
              },
            },
          },
        },
        take: 1,
      },
      _count: {
        select: { batches: true, admissions: true },
      },
    },
  });

  if (!course) {
    notFound();
  }

  const approvedSyllabus = course.syllabusVersions[0];
  const modules = approvedSyllabus?.modules || [];

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col justify-between text-[#251923]">
      <PublicNavbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10 w-full">
        {/* Breadcrumb Back */}
        <div>
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B6268] hover:text-[#6D1A2B] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Programs</span>
          </Link>
        </div>

        {/* Hero Banner */}
        <div className="bg-white rounded-3xl border border-[#E9E0D8] p-6 sm:p-10 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#FAF6EC] text-[#997324] border border-[#DEC278]">
              {course.category}
            </span>
            <span className="text-xs font-mono font-medium text-[#6B6268]">
              Code: {course.code}
            </span>
          </div>

          <h1 className="font-serif text-2xl sm:text-4xl font-bold text-[#251923] tracking-tight">
            {course.title}
          </h1>

          <p className="text-xs sm:text-sm text-[#6B6268] leading-relaxed max-w-3xl">
            {course.description}
          </p>

          {/* Metadata Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#E9E0D8]">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-[#6B6268] font-semibold block">
                Duration
              </span>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#251923]">
                <Clock className="w-4 h-4 text-[#C9A24B]" />
                <span>{course.durationWeeks} Weeks</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-[#6B6268] font-semibold block">
                Curriculum
              </span>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#251923]">
                <BookOpen className="w-4 h-4 text-[#315F70]" />
                <span>{modules.length} Core Modules</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-[#6B6268] font-semibold block">
                Delivery Mode
              </span>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#251923]">
                <Award className="w-4 h-4 text-[#6D1A2B]" />
                <span className="truncate">{course.deliveryMode || "Live Online"}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-[#6B6268] font-semibold block">
                Credential
              </span>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#251923]">
                <ShieldCheck className="w-4 h-4 text-[#19674B]" />
                <span>SHA-256 Verified</span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <CourseDetailClientCTA
            courseId={course.id}
            courseTitle={course.title}
          />
        </div>

        {/* Prerequisites */}
        {course.prerequisites && (
          <div className="p-6 rounded-2xl bg-[#F5F0E8] border border-[#E9E0D8] space-y-2">
            <h3 className="font-serif font-bold text-sm text-[#251923] flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#6D1A2B]" />
              <span>Recommended Prerequisites & Background</span>
            </h3>
            <p className="text-xs text-[#6B6268] leading-relaxed">
              {course.prerequisites}
            </p>
          </div>
        )}

        {/* Syllabus Modules Breakdown */}
        <div className="space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
              Detailed Syllabus
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#251923] mt-0.5">
              Curriculum & Learning Units
            </h2>
            <p className="text-xs text-[#6B6268] mt-1">
              Approved version {approvedSyllabus?.versionNumber || 1}.0. All modules require hands-on technical completion.
            </p>
          </div>

          {modules.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-[#E9E0D8] text-xs text-[#6B6268]">
              Curriculum version under governance review. Please contact admissions for full course outline.
            </div>
          ) : (
            <div className="space-y-4">
              {modules.map((mod, idx) => (
                <div
                  key={mod.id}
                  className="bg-white rounded-2xl border border-[#E9E0D8] p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#FAF6EC] text-[#997324] font-bold text-xs flex items-center justify-center shrink-0 border border-[#DEC278]">
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="font-serif font-bold text-sm text-[#251923]">
                          {mod.title}
                        </h3>
                        {mod.description && (
                          <p className="text-xs text-[#6B6268] mt-0.5">
                            {mod.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-[#315F70] shrink-0 bg-[#EAF2F5] px-2.5 py-1 rounded-full border border-[#97B8C4]">
                      {mod.subtopics.length} Subtopics
                    </span>
                  </div>

                  {/* Subtopics List */}
                  {mod.subtopics.length > 0 && (
                    <div className="pt-2 border-t border-[#E9E0D8]/60 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {mod.subtopics.map((sub, sIdx) => (
                        <div
                          key={sub.id}
                          className="flex items-center gap-2 text-xs text-[#251923] p-1.5 rounded-lg bg-[#FBF9F5]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#19674B] shrink-0" />
                          <span className="truncate">{sub.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
