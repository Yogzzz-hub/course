"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock3,
  Layers,
  Terminal,
  Trophy,
  BrainCircuit,
  Compass,
  MonitorSmartphone,
  Server,
  Database,
  Rocket,
  ShieldCheck,
  Award,
  ChevronRight,
  LogIn
} from "lucide-react";
import { EclipseOrb } from "@/components/public/EclipseSphere";
import { detailedProgrammes } from "@/frontend/data/programmeCatalog";

export function HomeLanding() {
  const [activeTab, setActiveTab] = useState<"flagship" | "all">("flagship");

  const displayProgrammes = activeTab === "flagship"
    ? detailedProgrammes.filter(p => p.category === "flagship" || p.category === "track").slice(0, 6)
    : detailedProgrammes.slice(0, 6);

  return (
    <div className="bg-[#140D13] text-white">
      {/* 1. HERO SECTION WITH 3D ECLIPSE SPHERE */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28 border-b border-white/10">
        {/* Atmospheric Cosmic Backdrop */}
        <div className="hero-sky absolute inset-0 pointer-events-none opacity-40" />
        <div className="absolute top-1/3 right-[15%] -translate-y-1/2 w-[600px] h-[600px] bg-radial from-[#681C35]/50 via-[#C9A24B]/10 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Core Value Proposition */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#681C35]/60 border border-[#DEC278]/40 text-[#DEC278] text-xs font-semibold backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-[#DEC278]" />
                <span>Advanced Computing & Engineering Architecture</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.08] text-balance">
                Are You Ready for Your{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#DEC278] to-[#C9A24B]">
                  Next Developer Interview?
                </span>
              </h1>

              <p className="text-sm sm:text-base text-white/70 max-w-xl mx-auto lg:mx-0 leading-relaxed font-sans">
                Discover your skills, identify your engineering gaps, and build your personalized career roadmap. Intensive 7-month full-stack and distributed systems curriculum directed by verified practitioner architects.
              </p>

              {/* Action Dock */}
              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  href="/developer-readiness-test"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-[#C9A24B] to-[#997324] text-[#140D13] font-bold text-sm hover:brightness-110 shadow-lg shadow-[#C9A24B]/25 transition-all active:scale-95"
                >
                  <BrainCircuit className="w-4 h-4 text-[#140D13]" />
                  <span>Take Free Skill Test</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/programmes"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm backdrop-blur-md transition-all active:scale-95"
                >
                  <BookOpen className="w-4 h-4 text-[#DEC278]" />
                  <span>Explore 12 Programmes</span>
                </Link>

                {/* Direct Link to CRM Login */}
                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-[#681C35]/50 hover:bg-[#681C35]/80 border border-[#DEC278]/30 text-white font-semibold text-sm transition-all"
                  title="Sign in to Student, Trainer, or Admin CRM Portal"
                >
                  <LogIn className="w-4 h-4 text-[#DEC278]" />
                  <span>CRM Portal Sign In</span>
                </Link>
              </div>

              {/* Bottom 3 Milestones */}
              <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/10 text-left">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-xs font-bold text-[#DEC278] uppercase tracking-wider">1. Direction</p>
                  <p className="text-xs text-white/70 mt-1">Explore 12 tracks & compare package inclusions.</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-xs font-bold text-[#DEC278] uppercase tracking-wider">2. Diagnosis</p>
                  <p className="text-xs text-white/70 mt-1">Take adaptive readiness tests & code challenges.</p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-xs font-bold text-[#DEC278] uppercase tracking-wider">3. Execution</p>
                  <p className="text-xs text-white/70 mt-1">Ship production projects with 1:1 mentorship.</p>
                </div>
              </div>
            </div>

            {/* Right Column: 3D Interactive WebGL Eclipse Sphere */}
            <div className="lg:col-span-5 flex items-center justify-center">
              <EclipseOrb />
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATS & GLANCE STATEMENT */}
      <section className="py-12 bg-[#1B111A] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="font-serif text-xl sm:text-2xl md:text-3xl text-white/90 leading-relaxed max-w-4xl mx-auto">
            <strong className="text-[#DEC278] font-bold">7 months</strong> from first principles to full-stack engineering, across{" "}
            <strong className="text-[#DEC278] font-bold">11 learning areas</strong>. Choose from{" "}
            <strong className="text-[#DEC278] font-bold">12 programmes and tracks</strong> with cryptographically verifiable certifications.
          </p>
        </div>
      </section>

      {/* 3. INTERACTIVE ARENA SUITE */}
      <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#DEC278]">
            Interactive Academy Arena
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
            Practical Tools Built for Software Engineers
          </h2>
          <p className="text-sm text-white/60">
            Real in-browser coding environments, adaptive assessments, competitive leaderboards, and structured career roadmaps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Tool 1 */}
          <Link
            href="/developer-readiness-test"
            className="p-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#DEC278]/50 transition-all group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#681C35] text-[#DEC278] flex items-center justify-center font-bold">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-lg text-white group-hover:text-[#DEC278] transition-colors">
                Free Readiness Test
              </h3>
              <p className="text-xs text-white/60 leading-relaxed">
                10 adaptive questions testing your comprehension of Python, SQL, JS, APIs, and boundary debugging.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-[#DEC278]">
              <span>Take Test Now</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </Link>

          {/* Tool 2 */}
          <Link
            href="/python-coding-challenge"
            className="p-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#DEC278]/50 transition-all group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#681C35] text-[#DEC278] flex items-center justify-center font-bold">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-lg text-white group-hover:text-[#DEC278] transition-colors">
                Python Coding Arena
              </h3>
              <p className="text-xs text-white/60 leading-relaxed">
                In-browser CodeMirror IDE for algorithmic challenges, unit tests, and live test execution evidence.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-[#DEC278]">
              <span>Enter Coding Arena</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </Link>

          {/* Tool 3 */}
          <Link
            href="/assessment"
            className="p-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#DEC278]/50 transition-all group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#681C35] text-[#DEC278] flex items-center justify-center font-bold">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-lg text-white group-hover:text-[#DEC278] transition-colors">
                Skill Assessment
              </h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Private adaptive assessment measuring algorithmic reasoning, concurrency, and architecture readiness.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-[#DEC278]">
              <span>Launch Assessment</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </Link>

          {/* Tool 4 */}
          <Link
            href="/leaderboard"
            className="p-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#DEC278]/50 transition-all group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#681C35] text-[#DEC278] flex items-center justify-center font-bold">
                <Trophy className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-lg text-white group-hover:text-[#DEC278] transition-colors">
                Learner Leaderboard
              </h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Opted-in pseudonymous benchmark rankings tracking challenge completion, code efficiency, and score trends.
              </p>
            </div>
            <div className="pt-4 flex items-center text-xs font-semibold text-[#DEC278]">
              <span>View Leaderboard</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* 4. EXPLODED TECHNICAL STACK */}
      <section className="py-16 sm:py-24 bg-[#1B111A] border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#DEC278]">
              Full Architecture Coverage
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mt-1">
              The 4 Layers of Production Software
            </h2>
            <p className="text-sm text-white/60 mt-2">
              Every cohort moves progressively from user interfaces through business logic, database transactions, and cloud infrastructure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <MonitorSmartphone className="w-8 h-8 text-[#A9C9DC]" />
              <h3 className="font-serif font-bold text-lg text-white">1. The Interface</h3>
              <p className="text-xs text-[#DEC278] font-mono">HTML • CSS • JavaScript • React</p>
              <p className="text-xs text-white/60 leading-relaxed">
                Build semantic, accessible, high-performance interfaces with modern React patterns, state management, and responsive layouts.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <Server className="w-8 h-8 text-[#A9C9DC]" />
              <h3 className="font-serif font-bold text-lg text-white">2. The Logic</h3>
              <p className="text-xs text-[#DEC278] font-mono">Python • Django • REST APIs</p>
              <p className="text-xs text-white/60 leading-relaxed">
                Design secure server-side systems, granular authentication mechanisms, and rock-solid REST contracts that scale.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <Database className="w-8 h-8 text-[#A9C9DC]" />
              <h3 className="font-serif font-bold text-lg text-white">3. The Data</h3>
              <p className="text-xs text-[#DEC278] font-mono">SQL • PostgreSQL • Prisma</p>
              <p className="text-xs text-white/60 leading-relaxed">
                Model real-world business domains, normalize tables, write high-concurrency queries, and enforce ACID transactions.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <Rocket className="w-8 h-8 text-[#A9C9DC]" />
              <h3 className="font-serif font-bold text-lg text-white">4. The Delivery</h3>
              <p className="text-xs text-[#DEC278] font-mono">Docker • CI/CD • Git • Testing</p>
              <p className="text-xs text-white/60 leading-relaxed">
                Containerize distributed apps, write automated unit & integration test suites, and deploy production services to the cloud.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FEATURED CURRICULUM CATALOG */}
      <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#DEC278]">
              Academic Programs
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mt-1">
              Explore 12 Engineering Specializations
            </h2>
            <p className="text-sm text-white/60 mt-1 max-w-xl">
              From flagship full-stack tracks to focused modular masteries, complete with atomic module breakdowns and verified fee schedules.
            </p>
          </div>

          <Link
            href="/programmes"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#DEC278] hover:underline shrink-0"
          >
            <span>View All 12 Programmes</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Programme Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayProgrammes.map((card) => (
            <div
              key={card.id}
              className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#DEC278]/40 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#681C35]/60 text-[#DEC278] border border-[#DEC278]/30">
                    {card.badge}
                  </span>
                  <span className="text-xs text-white/50 flex items-center gap-1">
                    <Clock3 className="w-3.5 h-3.5 text-[#DEC278]" />
                    {card.duration}
                  </span>
                </div>

                <h3 className="font-serif font-bold text-lg text-white group-hover:text-[#DEC278] transition-colors">
                  {card.name}
                </h3>

                <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">
                  {card.description}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {card.technologies.slice(0, 4).map((tech) => (
                    <span
                      key={tech}
                      className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/70"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                <ul className="space-y-1.5 pt-2 border-t border-white/10">
                  {card.learningFocus.slice(0, 3).map((topic, i) => (
                    <li key={i} className="text-xs text-white/60 flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#DEC278] shrink-0" />
                      <span className="truncate">{topic}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-white/40 block">Tuition Inclusions</span>
                  <span className="text-sm font-bold text-[#DEC278]">{card.feeDisplay}</span>
                </div>

                <Link
                  href={card.slug}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/20 transition-all"
                >
                  <span>Curriculum</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. TUITION PACKAGES COMPARISON */}
      <section className="py-16 sm:py-24 bg-[#1B111A] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#DEC278]">
              Transparent Tuition
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
              Structured Packages & Inclusions
            </h2>
            <p className="text-sm text-white/60">
              Clear installment plans, zero hidden fees, and transparent double-entry financial ledgering.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Standard Package */}
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase text-[#A9C9DC]">Foundational Track</span>
                <h3 className="font-serif font-bold text-2xl text-white">Standard</h3>
                <p className="text-xs text-white/60">
                  Ideal for students building core programming confidence and modern web fundamentals.
                </p>
                <div className="pt-2">
                  <span className="text-3xl font-serif font-bold text-[#DEC278]">₹28,000</span>
                  <span className="text-xs text-white/40 block mt-1">4 Months Duration • 2 Installments</span>
                </div>
                <ul className="space-y-2.5 pt-4 border-t border-white/10 text-xs text-white/70">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#DEC278]" />
                    <span>Python & Modern JavaScript Essentials</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#DEC278]" />
                    <span>Relational SQL & PostgreSQL Modeling</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#DEC278]" />
                    <span>3 Production Capstone Projects</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#DEC278]" />
                    <span>Cryptographic Verification Certificate</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/book-session?package=standard"
                className="w-full text-center py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all block"
              >
                Discuss Standard Plan
              </Link>
            </div>

            {/* Premium Package (Flagship) */}
            <div className="p-8 rounded-2xl bg-[#681C35]/30 border-2 border-[#DEC278] space-y-6 flex flex-col justify-between relative shadow-xl shadow-[#681C35]/30">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#DEC278] text-[#140D13] font-bold text-[10px] uppercase tracking-wider">
                Flagship Experience
              </div>
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase text-[#DEC278]">Full-Stack Software Engineer</span>
                <h3 className="font-serif font-bold text-2xl text-white">Premium</h3>
                <p className="text-xs text-white/70">
                  Complete 7-month curriculum spanning distributed backends, React architecture, and DevOps.
                </p>
                <div className="pt-2">
                  <span className="text-3xl font-serif font-bold text-[#DEC278]">₹48,000</span>
                  <span className="text-xs text-white/50 block mt-1">7 Months Duration • Flexible Monthly Schedule</span>
                </div>
                <ul className="space-y-2.5 pt-4 border-t border-white/10 text-xs text-white/80">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#DEC278]" />
                    <span>All 11 Learning Modules & Capstone Tracks</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#DEC278]" />
                    <span>Django REST, React & Docker Containers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#DEC278]" />
                    <span>Weekly 1:1 Senior Architect Code Rubrics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#DEC278]" />
                    <span>DSA & Mock Technical Interview Simulations</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/book-session?package=premium"
                className="w-full text-center py-3 rounded-xl bg-gradient-to-r from-[#C9A24B] to-[#997324] text-[#140D13] font-bold text-xs hover:brightness-110 transition-all block shadow-md"
              >
                Apply for Premium Cohort
              </Link>
            </div>

            {/* Elite Package */}
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase text-[#A9C9DC]">Career Accelerator</span>
                <h3 className="font-serif font-bold text-2xl text-white">Elite</h3>
                <p className="text-xs text-white/60">
                  Maximum mentorship, custom distributed system capstone, and personalized placement advisory.
                </p>
                <div className="pt-2">
                  <span className="text-3xl font-serif font-bold text-[#DEC278]">₹68,000</span>
                  <span className="text-xs text-white/40 block mt-1">7 Months + 3 Months Career Support</span>
                </div>
                <ul className="space-y-2.5 pt-4 border-t border-white/10 text-xs text-white/70">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#DEC278]" />
                    <span>Everything in Premium Package</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#DEC278]" />
                    <span>Direct Senior Engineering Placement Referral</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#DEC278]" />
                    <span>Comprehensive Resume & GitHub Portfolio Audit</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#DEC278]" />
                    <span>Unlimited Technical Interview Practice</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/book-session?package=elite"
                className="w-full text-center py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-all block"
              >
                Discuss Elite Accelerator
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAST REDIRECTION TO CRM PORTAL BANNER */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-[#681C35] via-[#4A1426] to-[#1B111A] border border-[#DEC278]/30 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-2xl">
          <div className="space-y-3 text-center lg:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-[#DEC278]">
              Existing Student, Trainer or Administrator?
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
              Log In to Your Academic & CRM Workspace
            </h2>
            <p className="text-xs sm:text-sm text-white/70 max-w-xl">
              Access attendance tracking, assignment submissions, live quiz rubrics, tuition installment ledgers, and graduation credentials.
            </p>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-white text-[#140D13] font-bold text-sm hover:bg-[#DEC278] transition-all shadow-xl hover:scale-105 active:scale-95 shrink-0"
          >
            <LogIn className="w-4 h-4 text-[#681C35]" />
            <span>Sign In to CRM Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
