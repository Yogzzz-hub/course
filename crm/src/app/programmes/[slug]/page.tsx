import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Clock3,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Award,
  Terminal,
  Database,
  Server
} from "lucide-react";
import { CourseNavbar } from "@/frontend/components/layout/CourseNavbar";
import { CourseFooter } from "@/frontend/components/layout/CourseFooter";
import { detailedProgrammes } from "@/frontend/data/programmeCatalog";

export function generateStaticParams() {
  return detailedProgrammes.map((p) => ({
    slug: p.id,
  }));
}

export default async function ProgrammeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const prog = detailedProgrammes.find(
    (p) => p.id === slug || p.slug.endsWith(slug)
  );

  if (!prog) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#140D13] text-white flex flex-col justify-between">
      <CourseNavbar />

      <main className="flex-1 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-white/50">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/programmes" className="hover:text-white transition-colors">
              Programmes
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#DEC278] font-semibold truncate">{prog.name}</span>
          </nav>

          {/* Hero Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#681C35]/60 border border-[#DEC278]/40 text-[#DEC278] text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{prog.eyebrow}</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
                {prog.heroTitle}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#DEC278] to-[#C9A24B]">
                  {prog.heroHighlight}
                </span>
              </h1>

              <p className="text-sm sm:text-base text-white/70 leading-relaxed max-w-2xl font-sans">
                {prog.heroSubtitle || prog.description}
              </p>

              {/* Technologies */}
              <div className="flex flex-wrap gap-2 pt-2">
                {prog.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-[#DEC278]"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Sidebar Pricing & Enrolment Card */}
            <div className="lg:col-span-4 p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-[#681C35]/30 to-white/5 border border-[#DEC278]/40 shadow-xl space-y-6 sticky top-28">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#DEC278]">
                  {prog.badge}
                </span>
                <h3 className="font-serif font-bold text-xl text-white">{prog.name}</h3>
              </div>

              <div className="pt-2 border-t border-white/10">
                <span className="text-xs text-white/50 block font-mono">{prog.feeLabel}</span>
                <span className="text-3xl font-serif font-bold text-[#DEC278]">{prog.feeDisplay}</span>
                <span className="text-xs text-white/60 block mt-1 flex items-center gap-1.5 font-mono">
                  <Clock3 className="w-3.5 h-3.5 text-[#DEC278]" />
                  <span>Duration: {prog.duration}</span>
                </span>
              </div>

              <div className="space-y-3 pt-2">
                <Link
                  href={`/book-session?programme=${encodeURIComponent(prog.id)}`}
                  className="w-full text-center py-3.5 rounded-xl bg-gradient-to-r from-[#C9A24B] to-[#997324] text-[#140D13] font-bold text-xs hover:brightness-110 transition-all block shadow-md"
                >
                  Book Counselling Session
                </Link>

                <Link
                  href="/login"
                  className="w-full text-center py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all block border border-white/15"
                >
                  Already Enrolled? Sign In to CRM
                </Link>
              </div>

              <div className="space-y-2 pt-4 border-t border-white/10 text-xs text-white/70">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#DEC278] shrink-0" />
                  <span>1:1 Practitioner Architect Mentorship</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#DEC278] shrink-0" />
                  <span>Cryptographic SHA-256 Verifiable Certificate</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#DEC278] shrink-0" />
                  <span>Production Capstone Code Reviews</span>
                </div>
              </div>
            </div>
          </div>

          {/* Curriculum Breakdown */}
          <div className="pt-8 border-t border-white/10 space-y-8">
            <div className="max-w-2xl space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#DEC278]">
                Atomic Syllabus
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                Curriculum & Module Breakdown
              </h2>
              <p className="text-xs sm:text-sm text-white/60">
                Each module is structured around practical lab exercises, first-principles theory, and atomic rubrics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {prog.modules.map((mod, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4 hover:border-[#DEC278]/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#DEC278] font-mono">
                      Module {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[11px] text-white/40">{mod.topics.length} Key Topics</span>
                  </div>

                  <h3 className="font-serif font-bold text-lg text-white">{mod.name}</h3>
                  <p className="text-xs text-white/70 leading-relaxed">{mod.description}</p>

                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 block">
                      Core Subjects Covered:
                    </span>
                    <ul className="space-y-1.5 text-xs text-white/80">
                      {mod.topics.map((topic, tIdx) => (
                        <li key={tIdx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#DEC278] shrink-0 mt-0.5" />
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-World Projects */}
          {prog.projects && prog.projects.length > 0 && (
            <div className="pt-8 border-t border-white/10 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#DEC278]">
                  Production Capstones
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                  Real-World Engineering Projects
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {prog.projects.map((proj, pIdx) => (
                  <div
                    key={pIdx}
                    className="p-5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3"
                  >
                    <Terminal className="w-5 h-5 text-[#DEC278] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-white">{proj}</p>
                      <p className="text-[11px] text-white/50 mt-1">Production code rubrics applied</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <CourseFooter />
    </div>
  );
}
