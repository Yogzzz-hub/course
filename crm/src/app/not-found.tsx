import React from "react";
import Link from "next/link";
import { Compass, Home, ArrowLeft, GraduationCap, BookOpen, ShieldCheck } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FFFBF5] text-[#2A0F16] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#C9A24B]/30 shadow-card p-8 md:p-10 space-y-6">
        {/* Brand Icon */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#6D1A2B]/10 border border-[#6D1A2B]/20 flex items-center justify-center text-[#6D1A2B]">
          <Compass className="w-8 h-8 animate-spin-slow" />
        </div>

        {/* Status & Title */}
        <div className="space-y-2">
          <span className="inline-block text-[11px] font-bold tracking-widest text-[#C9A24B] uppercase bg-[#F6EBCF] px-3 py-1 rounded-full">
            HTTP 404 — Page Not Located
          </span>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#6D1A2B]">
            Destination Not Found
          </h1>
          <p className="text-xs md:text-sm text-[#6B5E62] leading-relaxed">
            The academic resource or route you requested does not exist or may have been repositioned within the curriculum.
          </p>
        </div>

        {/* Quick Nav Options */}
        <div className="pt-2 grid grid-cols-2 gap-2 text-left">
          <Link
            href="/courses"
            className="p-3 rounded-xl border border-stone-200 hover:border-[#6D1A2B] bg-stone-50 hover:bg-[#FDF4F6] transition-all flex items-center gap-2.5 text-xs font-semibold text-[#6D1A2B]"
          >
            <BookOpen className="w-4 h-4 text-[#C9A24B] shrink-0" />
            <span>Course Catalog</span>
          </Link>
          <Link
            href="/login"
            className="p-3 rounded-xl border border-stone-200 hover:border-[#6D1A2B] bg-stone-50 hover:bg-[#FDF4F6] transition-all flex items-center gap-2.5 text-xs font-semibold text-[#6D1A2B]"
          >
            <ShieldCheck className="w-4 h-4 text-[#C9A24B] shrink-0" />
            <span>Staff / Student Portal</span>
          </Link>
        </div>

        {/* Primary CTA */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#6D1A2B] text-white text-xs font-semibold hover:bg-[#4E0F1E] transition-all shadow-sm"
          >
            <Home className="w-4 h-4" />
            <span>Return to Homepage</span>
          </Link>
        </div>

        {/* Footer Brand */}
        <div className="pt-4 border-t border-stone-100 flex items-center justify-center gap-2 text-[11px] text-[#A4999D]">
          <GraduationCap className="w-3.5 h-3.5 text-[#C9A24B]" />
          <span>Apex Global Academy Operations System</span>
        </div>
      </div>
    </div>
  );
}
