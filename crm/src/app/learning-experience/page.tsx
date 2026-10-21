"use client";

import React from "react";
import Link from "next/link";
import {
  Compass,
  CheckCircle2,
  BrainCircuit,
  Terminal,
  Layers,
  ArrowRight,
  ShieldCheck,
  Award,
  Users,
  Code2,
  Sparkles,
  GitPullRequest,
  Workflow
} from "lucide-react";
import { CourseNavbar } from "@/frontend/components/layout/CourseNavbar";
import { CourseFooter } from "@/frontend/components/layout/CourseFooter";

const steps = [
  {
    phase: "01",
    title: "Understand From First Principles",
    description: "Before touching frameworks, develop rigorous mental models for runtime execution, stack vs heap memory, references, and mathematical algorithmic complexity.",
    tags: ["Mental Models", "Execution Context", "Data Structures"]
  },
  {
    phase: "02",
    title: "Practise with Daily Lab Code",
    description: "Write code every single day in structured labs. Trace boundary bugs, inspect exception call stacks, and implement algorithms without copypasting.",
    tags: ["Unit Testing", "Debugging Labs", "AST Tracing"]
  },
  {
    phase: "03",
    title: "Build Production Capstone Systems",
    description: "Architect complete, running end-to-end web applications. Connect React interfaces to authenticated Django REST APIs and relational PostgreSQL databases.",
    tags: ["Full-Stack Architecture", "REST Contracts", "PostgreSQL ACID"]
  },
  {
    phase: "04",
    title: "Refine Through Senior Architect Rubrics",
    description: "No automated black-box grading. Every capstone is submitted via GitHub pull request and critiqued line-by-line by veteran practitioner architects.",
    tags: ["1:1 Code Reviews", "PR Rubrics", "Idiomatic Patterns"]
  },
  {
    phase: "05",
    title: "Prepare for Technical Hiring Rigor",
    description: "Practice algorithmic whiteboarding, live system design trade-offs, and behavioral engineering communication to step into interviews with quiet confidence.",
    tags: ["Mock Interviews", "System Design", "Portfolio Defence"]
  }
];

export default function LearningExperiencePage() {
  return (
    <div className="min-h-screen bg-[#140D13] text-white flex flex-col justify-between">
      <CourseNavbar />

      <main className="flex-1 py-12 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {/* Header */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#681C35]/60 border border-[#DEC278]/40 text-[#DEC278] text-xs font-semibold">
              <Compass className="w-3.5 h-3.5" />
              <span>Pedagogy & Architectural Methodology</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              The Learning Experience:{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#DEC278] to-[#C9A24B]">
                Understand. Practise. Build. Refine. Prepare.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-white/70 leading-relaxed font-sans">
              How we transform motivated learners into production-ready software engineers capable of reasoning through complex distributed systems.
            </p>
          </div>

          {/* 5-Step Process Cards */}
          <div className="space-y-6">
            {steps.map((s) => (
              <div
                key={s.phase}
                className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-[#DEC278]/40 transition-all flex flex-col md:flex-row md:items-start gap-6 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#681C35] text-[#DEC278] font-serif font-bold text-xl flex items-center justify-center shrink-0 border border-[#DEC278]/30">
                  {s.phase}
                </div>

                <div className="space-y-3 flex-1">
                  <h2 className="font-serif font-bold text-xl sm:text-2xl text-white group-hover:text-[#DEC278] transition-colors">
                    {s.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
                    {s.description}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {s.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 font-mono"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Box */}
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-[#681C35] via-[#4A1426] to-[#140D13] border border-[#DEC278]/30 text-center space-y-6 shadow-2xl">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
              Ready to Experience Production Engineering?
            </h2>
            <p className="text-xs sm:text-sm text-white/70 max-w-xl mx-auto">
              Book a personal 30-minute counselling conversation with an academy architect to review your starting level and choose your specialization.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/developer-readiness-test"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-gradient-to-r from-[#C9A24B] to-[#997324] text-[#140D13] font-bold text-xs hover:brightness-110 transition-all"
              >
                Take Free Skill Test
              </Link>
              <Link
                href="/programmes"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs transition-all"
              >
                Explore 12 Programmes
              </Link>
            </div>
          </div>
        </div>
      </main>

      <CourseFooter />
    </div>
  );
}
