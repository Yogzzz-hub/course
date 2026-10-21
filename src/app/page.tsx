import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { CourseCard } from "@/components/ui/CourseCard";
import { LandingClientHero, LandingEnquiryBanner } from "@/components/public/LandingClientSection";
import { EclipseHeroSection } from "@/components/public/EclipseSphere";
import {
  ShieldCheck,
  Award,
  Layers,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  Lock,
  FileCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();

  // If already authenticated, redirect smoothly to user's assigned portal
  if (session) {
    switch (session.role) {
      case "ADMIN":
        redirect("/admin");
      case "MANAGER":
        redirect("/manager");
      case "FINANCIER":
        redirect("/financier");
      case "TRAINER":
        redirect("/trainer");
      case "STUDENT":
        redirect("/student");
      default:
        redirect("/login");
    }
  }

  // Fetch published courses for public showcase
  const courses = await prisma.course.findMany({
    where: {
      isPublished: true,
      active: true,
    },
    include: {
      syllabusVersions: {
        where: { status: "APPROVED" },
        include: {
          modules: true,
        },
        take: 1,
      },
      _count: {
        select: {
          batches: true,
          admissions: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 6,
  });

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col justify-between text-[#251923]">
      <PublicNavbar />

      <main className="flex-1">
        {/* Interactive 3D Cosmic Eclipse Sphere Hero */}
        <EclipseHeroSection />

        {/* 4 Academic Pillars Section */}
        <section className="py-16 sm:py-20 border-b border-[#E9E0D8] bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
                Institutional Standards
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#251923]">
                Engineered for Academic Integrity & Depth
              </h2>
              <p className="text-xs sm:text-sm text-[#6B6268]">
                Every facet of the academy operates on deterministic standards, transparent governance, and real operational rigor.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Pillar 1 */}
              <div className="p-6 rounded-2xl border border-[#E9E0D8] bg-[#FBF9F5] space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#6D1A2B]/10 text-[#6D1A2B] flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="font-serif font-bold text-base text-[#251923]">
                  Atomic Curriculum
                </h3>
                <p className="text-xs text-[#6B6268] leading-relaxed">
                  Every lecture session records verified subtopic coverage in real-time. Students and employers track curriculum progression down to individual technical competencies.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="p-6 rounded-2xl border border-[#E9E0D8] bg-[#FBF9F5] space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#315F70]/10 text-[#315F70] flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 className="font-serif font-bold text-base text-[#251923]">
                  Practitioner Faculty
                </h3>
                <p className="text-xs text-[#6B6268] leading-relaxed">
                  Lectures, lab reviews, and code rubrics are directed exclusively by experienced industry software architects and engineering leaders, not automated scripts.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="p-6 rounded-2xl border border-[#E9E0D8] bg-[#FBF9F5] space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#C9A24B]/15 text-[#997324] flex items-center justify-center font-bold">
                  <FileCheck className="w-5 h-5" />
                </div>
                <h3 className="font-serif font-bold text-base text-[#251923]">
                  Double-Entry Ledger
                </h3>
                <p className="text-xs text-[#6B6268] leading-relaxed">
                  Tuition management adheres to strict enterprise financial compliance. Transparent installment schedules, immutable receipts, and verifiable invoices.
                </p>
              </div>

              {/* Pillar 4 */}
              <div className="p-6 rounded-2xl border border-[#E9E0D8] bg-[#FBF9F5] space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#19674B]/10 text-[#19674B] flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="font-serif font-bold text-base text-[#251923]">
                  Cryptographic Proof
                </h3>
                <p className="text-xs text-[#6B6268] leading-relaxed">
                  Graduation certificates feature SHA-256 cryptographic verification tokens. Employers and registrars can verify authenticity in seconds on our public registry.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Programs Section */}
        <section className="py-16 sm:py-24 border-b border-[#E9E0D8] bg-[#FBF9F5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
                  Curricula & Disciplines
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#251923] mt-1">
                  Featured Academic Programs
                </h2>
                <p className="text-xs sm:text-sm text-[#6B6268] mt-1 max-w-xl">
                  Comprehensive, cohort-based technical training structured around real-world software engineering challenges.
                </p>
              </div>

              <Link
                href="/courses"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6D1A2B] hover:underline shrink-0"
              >
                <span>View Full Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          </div>
        </section>

        {/* Public Certificate Verification Banner */}
        <section className="py-12 sm:py-16 bg-[#F5F0E8] border-b border-[#E9E0D8]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E9E0D8] shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF6EC] border border-[#DEC278] text-[#997324] text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4 text-[#C9A24B]" />
                  <span>Employer & Registrar Public Registry</span>
                </div>
                <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#251923]">
                  Verify An Apex Global Academy Credential
                </h3>
                <p className="text-xs sm:text-sm text-[#6B6268] max-w-xl leading-relaxed">
                  Validate the legitimacy and graduation honors of any candidate holding an authentic Apex Academy certificate using its unique cryptographic verification token.
                </p>
              </div>

              <div className="shrink-0 w-full md:w-auto">
                <Link href="/verify-certificate">
                  <button className="w-full md:w-auto px-6 py-3 rounded-xl bg-[#6D1A2B] text-white text-xs font-semibold hover:bg-[#4E0F1E] transition-colors shadow-xs flex items-center justify-center gap-2 min-h-[44px]">
                    <Award className="w-4 h-4 text-[#C9A24B]" />
                    <span>Launch Verification Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Admissions Enquiry CTA Banner */}
        <LandingEnquiryBanner />
      </main>

      <PublicFooter />
    </div>
  );
}
