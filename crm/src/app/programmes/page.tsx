"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Clock3, Search, CheckCircle2, BookOpen, ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import { CourseNavbar } from "@/frontend/components/layout/CourseNavbar";
import { CourseFooter } from "@/frontend/components/layout/CourseFooter";
import { detailedProgrammes } from "@/frontend/data/programmeCatalog";

type FilterCategory = "all" | "flagship-track" | "module";

export default function ProgrammesPage() {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProgrammes = useMemo(() => {
    return detailedProgrammes.filter((item) => {
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "flagship-track" && (item.category === "flagship" || item.category === "track")) ||
        (activeFilter === "module" && item.category === "module");

      if (!matchesFilter) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.technologies.some((tech) => tech.toLowerCase().includes(query)) ||
        item.learningFocus.some((topic) => topic.toLowerCase().includes(query))
      );
    });
  }, [activeFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-[#140D13] text-white flex flex-col justify-between">
      <CourseNavbar />

      <main className="flex-1 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#681C35]/60 border border-[#DEC278]/40 text-[#DEC278] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>12 Specialized Academic Curricula</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              One Focused Engineering Philosophy.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#DEC278] to-[#C9A24B]">
                All Pathways & Specialisations.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-white/70 leading-relaxed font-sans">
              A structured path that brings first-principles programming, distributed full-stack architecture, and career placement preparation together.
            </p>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-2 rounded-2xl bg-white/5 border border-white/10">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeFilter === "all"
                    ? "bg-[#681C35] text-white border border-[#DEC278]/40 shadow-sm"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                All Programmes ({detailedProgrammes.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("flagship-track")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeFilter === "flagship-track"
                    ? "bg-[#681C35] text-white border border-[#DEC278]/40 shadow-sm"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                Full Programmes & Tracks (7)
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("module")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeFilter === "module"
                    ? "bg-[#681C35] text-white border border-[#DEC278]/40 shadow-sm"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                Modular Courses (5)
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                placeholder="Search by topic, tech, or skill…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#DEC278]"
              />
            </div>
          </div>

          {/* Cards Grid */}
          {filteredProgrammes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-12 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-white/40 mx-auto" />
              <h3 className="font-serif font-bold text-lg text-white">No matching programmes found</h3>
              <p className="text-xs text-white/60">Try adjusting your search terms or selecting another category.</p>
              <button
                type="button"
                onClick={() => {
                  setActiveFilter("all");
                  setSearchQuery("");
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all mt-2"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProgrammes.map((card) => (
                <div
                  key={card.id}
                  className={`p-6 rounded-2xl bg-white/5 border transition-all flex flex-col justify-between group ${
                    card.isFlagship
                      ? "border-[#DEC278]/60 shadow-lg shadow-[#681C35]/30 bg-gradient-to-b from-[#681C35]/20 to-white/5"
                      : "border-white/10 hover:border-[#DEC278]/40"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#681C35]/70 text-[#DEC278] border border-[#DEC278]/30">
                        {card.badge}
                      </span>
                      <span className="text-xs text-white/60 flex items-center gap-1 font-mono">
                        <Clock3 className="w-3.5 h-3.5 text-[#DEC278]" />
                        {card.duration}
                      </span>
                    </div>

                    <h3 className="font-serif font-bold text-lg text-white group-hover:text-[#DEC278] transition-colors">
                      {card.name}
                    </h3>

                    <p className="text-xs text-white/70 line-clamp-3 leading-relaxed">
                      {card.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {card.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/80"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>

                    <ul className="space-y-1.5 pt-3 border-t border-white/10">
                      {card.learningFocus.slice(0, 3).map((topic, i) => (
                        <li key={i} className="text-xs text-white/70 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#DEC278] shrink-0" />
                          <span className="truncate">{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-white/40 block font-mono">{card.feeLabel}</span>
                      <span className="text-base font-bold text-[#DEC278]">{card.feeDisplay}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={card.slug}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#140D13] bg-[#DEC278] hover:bg-white transition-all inline-flex items-center gap-1"
                      >
                        <span>Curriculum</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <CourseFooter />
    </div>
  );
}
