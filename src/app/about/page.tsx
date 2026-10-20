import React from "react";
import Link from "next/link";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import {
  ShieldCheck,
  Award,
  Layers,
  GraduationCap,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Lock,
} from "lucide-react";

export const metadata = {
  title: "About Apex Global Academy | Academic Standards & Mission",
  description: "Learn about the mission, faculty governance, and technical curriculum standards of Apex Global Academy.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col justify-between text-[#251923]">
      <PublicNavbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-12 w-full">
        {/* Mission Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
            About the Academy
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-[#251923]">
            Academic Rigor for Real-World Software Engineering
          </h1>
          <p className="text-xs sm:text-base text-[#6B6268] leading-relaxed">
            Apex Global Academy was founded to bridge the gap between superficial short courses and the demanding architectural standards required by premier technology engineering teams.
          </p>
        </div>

        {/* Institutional Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E9E0D8] space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#6D1A2B]/10 text-[#6D1A2B] flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-lg text-[#251923]">
              Deterministic Competency
            </h3>
            <p className="text-xs text-[#6B6268] leading-relaxed">
              We reject arbitrary grading. Progress is tracked through deterministic quiz evaluations, strict code rubrics, and atomic syllabus verification in every live session.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E9E0D8] space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#315F70]/10 text-[#315F70] flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-lg text-[#251923]">
              Active Practitioner Faculty
            </h3>
            <p className="text-xs text-[#6B6268] leading-relaxed">
              Every course instructor is an active senior practitioner. Cohorts benefit from real-world post-mortems, distributed systems patterns, and direct mentorship.
            </p>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#E9E0D8] space-y-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-[#C9A24B]/15 text-[#997324] flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-lg text-[#251923]">
              Cryptographic Credentials
            </h3>
            <p className="text-xs text-[#6B6268] leading-relaxed">
              Certificates awarded by Apex Global Academy feature a unique SHA-256 token linked directly to our immutable institutional registry for instant public verification.
            </p>
          </div>
        </div>

        {/* Governance & Compliance */}
        <div className="bg-[#F5F0E8] rounded-3xl border border-[#E9E0D8] p-6 sm:p-10 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6D1A2B]">
              Governance & Financial Transparency
            </span>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#251923]">
              Enterprise Ethics & Student Protection
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#6B6268]">
            <div className="p-4 bg-white rounded-2xl border border-[#E9E0D8] space-y-2">
              <div className="font-semibold text-[#251923] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#19674B]" />
                <span>Double-Entry Financial Ledger</span>
              </div>
              <p className="leading-relaxed">
                All tuition commitments and payments are tracked in a GAAP-compliant double-entry ledger with transparent receipts and audited adjustments.
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-[#E9E0D8] space-y-2">
              <div className="font-semibold text-[#251923] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#19674B]" />
                <span>Zero AI Black Box Dependency</span>
              </div>
              <p className="leading-relaxed">
                Student submissions and grades are evaluated deterministically by faculty and predefined objective test suites, ensuring fair, auditable outcomes.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-6 space-y-4">
          <h3 className="font-serif font-bold text-xl text-[#251923]">
            Ready to Advance Your Technical Career?
          </h3>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/courses">
              <button className="px-6 py-3 rounded-xl bg-[#6D1A2B] text-white text-xs font-semibold hover:bg-[#4E0F1E] transition-colors shadow-xs flex items-center justify-center gap-2 min-h-[44px]">
                <span>Explore Academic Programs</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/contact">
              <button className="px-6 py-3 rounded-xl bg-white border border-[#E9E0D8] text-[#251923] text-xs font-semibold hover:bg-[#F5F0E8] transition-colors min-h-[44px]">
                <span>Contact Admissions Committee</span>
              </button>
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
