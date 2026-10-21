"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowUpRight, LogIn, Sparkles, BookOpen, Terminal, Trophy, Compass, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export function CourseNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const links = [
    { label: "Free Skill Test", href: "/developer-readiness-test", highlight: true },
    { label: "Programmes", href: "/programmes" },
    { label: "Coding Arena", href: "/python-coding-challenge" },
    { label: "Assessment", href: "/assessment" },
    { label: "Leaderboard", href: "/leaderboard" },
    { label: "Learning Experience", href: "/learning-experience" },
    { label: "Career Support", href: "/career-support" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#140D13]/90 backdrop-blur-md border-b border-white/10 text-white transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-[#681C35] via-[#A9C9DC] to-[#DEC278] p-0.5 shadow-lg shadow-[#681C35]/30">
            <div className="w-full h-full bg-[#140D13] rounded-full flex items-center justify-center">
              <span className="font-serif font-bold text-base text-[#DEC278] group-hover:scale-110 transition-transform">
                A
              </span>
            </div>
          </div>
          <div>
            <span className="font-serif font-bold text-base sm:text-lg tracking-tight text-white block leading-tight">
              Aintrix Academy
            </span>
            <span className="text-[10px] font-semibold tracking-widest uppercase text-[#DEC278]/90 block">
              Learn • Build • Evolve
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden xl:flex items-center gap-1">
          {links.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5",
                  link.highlight
                    ? "bg-[#681C35]/40 text-[#DEC278] border border-[#DEC278]/30 hover:bg-[#681C35]/70"
                    : isActive
                    ? "text-[#DEC278] bg-white/10 font-semibold"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Secondary Navigation / Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Direct Redirection to CRM Login */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#681C35] to-[#8E2849] hover:from-[#52152A] hover:to-[#681C35] border border-[#DEC278]/40 shadow-md shadow-[#681C35]/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Sign in to Student, Trainer, or Admin CRM Portal"
          >
            <LogIn className="w-3.5 h-3.5 text-[#DEC278]" />
            <span>Sign In / CRM Portal</span>
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex xl:hidden items-center gap-2">
          <Link
            href="/login"
            className="inline-flex sm:hidden items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#681C35] border border-[#DEC278]/30"
          >
            <LogIn className="w-3 h-3 text-[#DEC278]" />
            <span>Sign In</span>
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="xl:hidden border-t border-white/10 bg-[#140D13]/98 px-5 py-6 space-y-3 shadow-2xl backdrop-blur-xl animate-fade-in max-h-[85vh] overflow-y-auto">
          {/* Prominent CRM Sign-In Button on Mobile */}
          <div className="pb-3 border-b border-white/10">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-[#681C35] to-[#8E2849] border border-[#DEC278]/40 text-white font-bold text-sm shadow-lg"
            >
              <div className="flex items-center gap-2.5">
                <LogIn className="w-4 h-4 text-[#DEC278]" />
                <span>Sign In to CRM Portal</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[#DEC278]" />
            </Link>
            <p className="text-[11px] text-white/50 mt-1.5 px-1">
              Access Student Workspace, Trainer Portal, Admin & Financial Records
            </p>
          </div>

          <div className="space-y-1 pt-1">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/10 text-[#DEC278] font-bold"
                      : "text-white/80 hover:text-white hover:bg-white/5"
                  )}
                >
                  <span>{link.label}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-white/40" />
                </Link>
              );
            })}
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/50 px-1">
            <Link href="/privacy-policy" onClick={() => setMobileOpen(false)} className="hover:underline">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms-and-conditions" onClick={() => setMobileOpen(false)} className="hover:underline">
              Terms & Conditions
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
