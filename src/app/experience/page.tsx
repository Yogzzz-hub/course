import React from "react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { EclipseHeroSection } from "@/components/public/EclipseSphere";
import { prisma } from "@/lib/prisma";
import { CourseCard } from "@/components/ui/CourseCard";
import { LandingEnquiryBanner } from "@/components/public/LandingClientSection";

export const dynamic = "force-dynamic";

export default async function ExperiencePage() {
  const courses = await prisma.course.findMany({
    where: { isPublished: true, active: true },
    include: {
      syllabusVersions: {
        where: { status: "APPROVED" },
        include: { modules: true },
        take: 1,
      },
      _count: {
        select: { batches: true, admissions: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col justify-between text-[#251923]">
      <PublicNavbar />

      <main className="flex-1">
        {/* Interactive 3D Cosmic Eclipse Sphere Hero */}
        <EclipseHeroSection />

        {/* Featured Curriculum Programs */}
        <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
                Academic Programs
              </span>
              <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[#251923] mt-1">
                Explore Engineering Specializations
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course: any) => {
              const latestVersion = course.syllabusVersions?.[0];
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
        </section>

        <LandingEnquiryBanner />
      </main>

      <PublicFooter />
    </div>
  );
}
