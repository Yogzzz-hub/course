import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { CourseCard } from "@/components/ui/CourseCard";
import { BookOpen, Search, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CoursesCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;

  const whereClause: any = {
    isPublished: true,
    active: true,
  };

  if (q && q.trim()) {
    whereClause.OR = [
      { title: { contains: q.trim() } },
      { description: { contains: q.trim() } },
      { code: { contains: q.trim() } },
    ];
  }

  if (category && category !== "ALL") {
    whereClause.category = category;
  }

  const [courses, categories] = await Promise.all([
    prisma.course.findMany({
      where: whereClause,
      include: {
        syllabusVersions: {
          where: { status: "APPROVED" },
          include: {
            modules: {
              orderBy: { orderIndex: "asc" },
            },
          },
          take: 1,
        },
        _count: {
          select: { batches: true, admissions: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.course.findMany({
      where: { isPublished: true, active: true },
      select: { category: true },
      distinct: ["category"],
    }),
  ]);

  const categoryList = ["ALL", ...categories.map((c) => c.category).filter(Boolean)];

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col justify-between text-[#251923]">
      <PublicNavbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8 w-full">
        {/* Catalog Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
            Academic Catalog
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#251923]">
            Explore Programs & Syllabi
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6268] leading-relaxed">
            Every technical discipline at Apex Global Academy is structured around an approved syllabus version, clear prerequisites, and hands-on laboratory milestones.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {categoryList.map((cat) => {
            const isSelected = (!category && cat === "ALL") || category === cat;
            return (
              <Link
                key={cat}
                href={cat === "ALL" ? "/courses" : `/courses?category=${encodeURIComponent(cat)}`}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all select-none min-h-[36px] flex items-center ${
                  isSelected
                    ? "bg-[#6D1A2B] text-white shadow-xs"
                    : "bg-white border border-[#E9E0D8] text-[#6B6268] hover:text-[#251923] hover:border-[#6D1A2B]"
                }`}
              >
                {cat === "ALL" ? "All Disciplines" : cat}
              </Link>
            );
          })}
        </div>

        {/* Courses Grid */}
        {courses.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-[#E9E0D8] space-y-3">
            <BookOpen className="w-10 h-10 text-[#C9A24B] mx-auto opacity-70" />
            <h3 className="font-serif font-bold text-base text-[#251923]">No Courses Found</h3>
            <p className="text-xs text-[#6B6268] max-w-sm mx-auto">
              No programs match the selected category. Try selecting another discipline or viewing all courses.
            </p>
            <Link
              href="/courses"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6D1A2B] hover:underline pt-2"
            >
              <span>Reset filter</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            {courses.map((course) => {
              const latestVersion = course.syllabusVersions[0];
              return (
                <CourseCard
                  key={course.id}
                  id={course.id}
                  code={course.code}
                  title={course.title}
                  slug={course.slug}
                  description={course.description}
                  category={course.category}
                  durationWeeks={course.durationWeeks}
                  durationHours={course.durationHours}
                  deliveryMode={course.deliveryMode}
                  syllabusModuleCount={latestVersion?.modules?.length || 0}
                  enrolledCount={course._count.admissions}
                />
              );
            })}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
