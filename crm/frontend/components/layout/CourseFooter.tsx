"use client";

import React from "react";
import Link from "next/link";
import { Mail, Phone, MapPin, ArrowUpRight, LogIn, ExternalLink, ShieldCheck } from "lucide-react";
import { academy } from "@/frontend/config/academy";

export function CourseFooter() {
  return (
    <footer className="bg-[#140D13] border-t border-white/10 text-white/70 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">
          {/* Col 1: Brand & Manifesto */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3 group inline-flex">
              <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-[#681C35] via-[#A9C9DC] to-[#DEC278] p-0.5 shadow-md">
                <div className="w-full h-full bg-[#140D13] rounded-full flex items-center justify-center">
                  <span className="font-serif font-bold text-sm text-[#DEC278]">A</span>
                </div>
              </div>
              <span className="font-serif font-bold text-xl text-white">Aintrix Academy</span>
            </Link>
            <p className="text-sm text-white/60 max-w-sm leading-relaxed">
              Turn theoretical understanding into verified engineering ability. And ambition into your next software career chapter.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/15 transition-all"
              >
                <LogIn className="w-3.5 h-3.5 text-[#DEC278]" />
                <span>Enter CRM Portal (/login)</span>
              </Link>
            </div>
          </div>

          {/* Col 2: Academic Programmes */}
          <div className="space-y-3">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-[#DEC278]">
              Flagship Curricula
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/programmes/python-full-stack" className="hover:text-white transition-colors">
                  Python Full-Stack Track
                </Link>
              </li>
              <li>
                <Link href="/programmes/full-stack-app-dev" className="hover:text-white transition-colors">
                  Full-Stack App Development
                </Link>
              </li>
              <li>
                <Link href="/programmes/django-backend-dev" className="hover:text-white transition-colors">
                  Django & Backend Systems
                </Link>
              </li>
              <li>
                <Link href="/programmes/react-development" className="hover:text-white transition-colors">
                  Modern React Architecture
                </Link>
              </li>
              <li>
                <Link href="/programmes/devops-docker-deployment" className="hover:text-white transition-colors">
                  DevOps, Docker & Cloud
                </Link>
              </li>
              <li>
                <Link href="/programmes/dsa-technical-interview" className="hover:text-white transition-colors">
                  DSA & Interview Prep
                </Link>
              </li>
              <li>
                <Link href="/programmes" className="text-[#DEC278] hover:underline font-medium inline-flex items-center gap-1 pt-1">
                  <span>View All 12 Programmes</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Interactive Arena */}
          <div className="space-y-3">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-[#DEC278]">
              Interactive Arena
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/developer-readiness-test" className="hover:text-white transition-colors">
                  Free Developer Readiness Test
                </Link>
              </li>
              <li>
                <Link href="/python-coding-challenge" className="hover:text-white transition-colors">
                  Python Coding Arena
                </Link>
              </li>
              <li>
                <Link href="/assessment" className="hover:text-white transition-colors">
                  Adaptive Skill Assessment
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="hover:text-white transition-colors">
                  Learner Leaderboard
                </Link>
              </li>
              <li>
                <Link href="/backend-developer-roadmap" className="hover:text-white transition-colors">
                  Backend Developer Roadmap
                </Link>
              </li>
              <li>
                <Link href="/full-stack-developer-roadmap" className="hover:text-white transition-colors">
                  Full-Stack Learning Roadmap
                </Link>
              </li>
              <li>
                <Link href="/learning-experience" className="hover:text-white transition-colors">
                  The Learning Experience
                </Link>
              </li>
              <li>
                <Link href="/career-support" className="hover:text-white transition-colors">
                  Career Support & Placement
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Academy Office */}
          <div className="space-y-3">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-[#DEC278]">
              Headquarters
            </h3>
            <div className="space-y-2.5 text-xs text-white/60">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#DEC278] shrink-0 mt-0.5" />
                <span>{academy.address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#DEC278] shrink-0" />
                <a href={`mailto:${academy.email}`} className="hover:text-white transition-colors">
                  {academy.email}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#DEC278] shrink-0" />
                <a href={`tel:${academy.phone}`} className="hover:text-white transition-colors">
                  {academy.phone}
                </a>
              </div>
              {academy.googleMapsUrl && (
                <div className="pt-1">
                  <a
                    href={academy.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#DEC278] hover:underline"
                  >
                    <span>View on Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <p>© {new Date().getFullYear()} Aintrix Academy. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy-policy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms-and-conditions" className="hover:text-white transition-colors">
              Terms & Conditions
            </Link>
            <Link href="/login" className="hover:text-[#DEC278] transition-colors font-medium">
              CRM Portal Sign In
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
