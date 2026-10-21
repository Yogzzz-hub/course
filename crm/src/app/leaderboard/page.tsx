"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Medal,
  Award,
  Sparkles,
  Terminal,
  LogIn,
  Filter,
  ArrowUpRight
} from "lucide-react";
import { CourseNavbar } from "@/frontend/components/layout/CourseNavbar";
import { CourseFooter } from "@/frontend/components/layout/CourseFooter";

interface LeaderboardEntry {
  rank: number;
  handle: string;
  points: number;
  solved: number;
  accuracy: string;
  track: string;
  badge: string;
}

const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, handle: "matrix_architect", points: 4850, solved: 42, accuracy: "98.2%", track: "Python Full-Stack", badge: "Gold Master" },
  { rank: 2, handle: "lambda_operator", points: 4620, solved: 39, accuracy: "96.5%", track: "Django Backend", badge: "Gold Master" },
  { rank: 3, handle: "concurrency_dev", points: 4410, solved: 37, accuracy: "95.1%", track: "Advanced Python", badge: "Gold Master" },
  { rank: 4, handle: "reactor_kernel", points: 3980, solved: 34, accuracy: "94.0%", track: "React Architecture", badge: "Silver Specialist" },
  { rank: 5, handle: "postgres_indexer", points: 3740, solved: 31, accuracy: "92.8%", track: "SQL & DB Engineering", badge: "Silver Specialist" },
  { rank: 6, handle: "docker_captain", points: 3510, solved: 29, accuracy: "91.4%", track: "DevOps & Cloud", badge: "Silver Specialist" },
  { rank: 7, handle: "algorithmic_mind", points: 3290, solved: 27, accuracy: "90.0%", track: "DSA Preparation", badge: "Bronze Engineer" },
  { rank: 8, handle: "async_await_pro", points: 2980, solved: 24, accuracy: "89.2%", track: "Python Full-Stack", badge: "Bronze Engineer" },
  { rank: 9, handle: "schema_validator", points: 2650, solved: 21, accuracy: "88.5%", track: "Full-Stack App Dev", badge: "Bronze Engineer" },
  { rank: 10, handle: "clean_coder_26", points: 2420, solved: 19, accuracy: "87.0%", track: "Software Engineering", badge: "Bronze Engineer" },
];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<"all" | "monthly" | "weekly">("all");

  return (
    <div className="min-h-screen bg-[#140D13] text-white flex flex-col justify-between">
      <CourseNavbar />

      <main className="flex-1 py-12 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#681C35]/60 border border-[#DEC278]/40 text-[#DEC278] text-xs font-semibold">
              <Trophy className="w-3.5 h-3.5" />
              <span>Opted-In Learner Leaderboard</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white">
              Engineering Hall of Benchmarks
            </h1>
            <p className="text-xs sm:text-sm text-white/60 max-w-xl mx-auto">
              Transparent, pseudonymous rankings tracking algorithmic challenge completions, execution performance, and problem-solving accuracy.
            </p>
          </div>

          {/* Timeframe Filter */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPeriod("all")}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  period === "all" ? "bg-[#681C35] text-white border border-[#DEC278]/40" : "text-white/60 hover:text-white"
                }`}
              >
                All-Time Rankings
              </button>
              <button
                type="button"
                onClick={() => setPeriod("monthly")}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  period === "monthly" ? "bg-[#681C35] text-white border border-[#DEC278]/40" : "text-white/60 hover:text-white"
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setPeriod("weekly")}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  period === "weekly" ? "bg-[#681C35] text-white border border-[#DEC278]/40" : "text-white/60 hover:text-white"
                }`}
              >
                This Week
              </button>
            </div>

            <Link
              href="/python-coding-challenge"
              className="px-3.5 py-1.5 rounded-xl bg-[#DEC278] text-[#140D13] font-bold text-xs hover:bg-white transition-all inline-flex items-center gap-1"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Earn Points</span>
            </Link>
          </div>

          {/* Table */}
          <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1B111A] text-white/60 uppercase font-mono text-[10px] tracking-wider border-b border-white/10">
                  <tr>
                    <th className="py-3.5 px-4">Rank</th>
                    <th className="py-3.5 px-4">Student Engineer</th>
                    <th className="py-3.5 px-4">Specialization Track</th>
                    <th className="py-3.5 px-4 text-center">Problems Solved</th>
                    <th className="py-3.5 px-4 text-center">Accuracy</th>
                    <th className="py-3.5 px-4 text-right">Total Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {mockLeaderboard.map((row) => (
                    <tr key={row.rank} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {row.rank === 1 ? (
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <Medal className="w-4 h-4" /> #1
                          </span>
                        ) : row.rank === 2 ? (
                          <span className="text-slate-300 font-bold flex items-center gap-1">
                            <Medal className="w-4 h-4" /> #2
                          </span>
                        ) : row.rank === 3 ? (
                          <span className="text-amber-600 font-bold flex items-center gap-1">
                            <Medal className="w-4 h-4" /> #3
                          </span>
                        ) : (
                          <span className="text-white/50">#{row.rank}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="text-white font-semibold">{row.handle}</span>
                        <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-[#DEC278]">
                          {row.badge}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-white/70">{row.track}</td>
                      <td className="py-3.5 px-4 text-center font-mono text-[#DEC278] font-bold">
                        {row.solved}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-emerald-400">
                        {row.accuracy}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                        {row.points.toLocaleString()} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <CourseFooter />
    </div>
  );
}
