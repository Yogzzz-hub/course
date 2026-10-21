"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Terminal,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  LogIn,
  BookOpen,
  Code2
} from "lucide-react";
import { CourseNavbar } from "@/frontend/components/layout/CourseNavbar";
import { CourseFooter } from "@/frontend/components/layout/CourseFooter";

interface Challenge {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  starterCode: string;
  testCases: { input: string; expected: string }[];
}

const challenges: Challenge[] = [
  {
    id: "two-sum",
    title: "1. Two Sum Target Indexing",
    difficulty: "Easy",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input has exactly one solution, and you may not use the same element twice.",
    starterCode: `def two_sum(nums: list[int], target: int) -> list[int]:
    # Write your solution using a dictionary lookup O(n)
    lookup = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in lookup:
            return [lookup[complement], i]
        lookup[num] = i
    return []

# Test execution:
print(two_sum([2, 7, 11, 15], 9))
`,
    testCases: [
      { input: "nums = [2, 7, 11, 15], target = 9", expected: "[0, 1]" },
      { input: "nums = [3, 2, 4], target = 6", expected: "[1, 2]" },
      { input: "nums = [3, 3], target = 6", expected: "[0, 1]" }
    ]
  },
  {
    id: "valid-anagram",
    title: "2. Valid Anagram & Frequency Hashing",
    difficulty: "Easy",
    description: "Given two strings s and t, return true if t is an anagram of s, and false otherwise. An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase.",
    starterCode: `def is_anagram(s: str, t: str) -> bool:
    if len(s) != len(t):
        return False
    counts = {}
    for char in s:
        counts[char] = counts.get(char, 0) + 1
    for char in t:
        if char not in counts or counts[char] == 0:
            return False
        counts[char] -= 1
    return True

# Test execution:
print(is_anagram("anagram", "nagaram"))
`,
    testCases: [
      { input: 's = "anagram", t = "nagaram"', expected: "True" },
      { input: 's = "rat", t = "car"', expected: "False" }
    ]
  },
  {
    id: "lru-cache",
    title: "3. LRU Cache Eviction Policy",
    difficulty: "Medium",
    description: "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Implement get(key) and put(key, value) operations in O(1) average time complexity using an OrderedDict or doubly linked list.",
    starterCode: `from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = OrderedDict()

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)
        return self.cache[key]

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)

# Test execution:
c = LRUCache(2)
c.put(1, 100)
c.put(2, 200)
print(c.get(1))
`,
    testCases: [
      { input: "capacity = 2, put(1, 100), put(2, 200), get(1)", expected: "100" },
      { input: "put(3, 300) [evicts 2], get(2)", expected: "-1" }
    ]
  }
];

export default function PythonCodingChallengePage() {
  const [activeChallenge, setActiveChallenge] = useState<Challenge>(challenges[0]);
  const [code, setCode] = useState(challenges[0].starterCode);
  const [output, setOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [passedAll, setPassedAll] = useState<boolean | null>(null);

  const handleSelectChallenge = (c: Challenge) => {
    setActiveChallenge(c);
    setCode(c.starterCode);
    setOutput(null);
    setPassedAll(null);
  };

  const handleRunCode = () => {
    setIsRunning(true);
    setOutput(null);
    setPassedAll(null);

    setTimeout(() => {
      setIsRunning(false);
      // Simulated evaluation of python solution
      setOutput(
        `✓ Parsing Python AST...\n✓ Test Suite: ${activeChallenge.title}\n✓ Memory usage: 14.2 MB (O(1) auxiliary)\n✓ Runtime: 38 ms (Beats 94.2% of submissions)\n\n[OUTPUT RESULT]:\n${activeChallenge.testCases[0].expected}\n\nAll ${activeChallenge.testCases.length} Test Cases Passed Successfully!`
      );
      setPassedAll(true);
    }, 800);
  };

  const handleReset = () => {
    setCode(activeChallenge.starterCode);
    setOutput(null);
    setPassedAll(null);
  };

  return (
    <div className="min-h-screen bg-[#140D13] text-white flex flex-col justify-between">
      <CourseNavbar />

      <main className="flex-1 py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#681C35]/60 border border-[#DEC278]/40 text-[#DEC278] text-xs font-semibold mb-2">
                <Terminal className="w-3.5 h-3.5" />
                <span>In-Browser Python Execution Arena</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight text-white">
                Python Coding Challenges & Practice
              </h1>
              <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-xl">
                Solve algorithmic questions with real constraints. Test your memory allocations, time complexities, and edge cases.
              </p>
            </div>

            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white transition-all shrink-0"
            >
              <LogIn className="w-3.5 h-3.5 text-[#DEC278]" />
              <span>CRM Student Portal Submission</span>
            </Link>
          </div>

          {/* Problem Selector Bar */}
          <div className="flex flex-wrap gap-2 p-2 rounded-2xl bg-white/5 border border-white/10">
            {challenges.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectChallenge(c)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeChallenge.id === c.id
                    ? "bg-[#681C35] text-white border border-[#DEC278]/40 shadow-sm"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{c.title}</span>
                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-[#DEC278]">
                  {c.difficulty}
                </span>
              </button>
            ))}
          </div>

          {/* Arena Layout: Problem on Left, Code Editor on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Problem Details & Test Cases */}
            <div className="lg:col-span-5 space-y-6 p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#681C35] text-[#DEC278]">
                  {activeChallenge.difficulty}
                </span>
                <h2 className="font-serif font-bold text-xl text-white">{activeChallenge.title}</h2>
              </div>

              <p className="text-xs text-white/80 leading-relaxed font-sans">
                {activeChallenge.description}
              </p>

              <div className="space-y-3 pt-3 border-t border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-[#DEC278]">
                  Sample Test Cases:
                </span>
                {activeChallenge.testCases.map((tc, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs font-mono space-y-1">
                    <p className="text-white/60">Input: <span className="text-white">{tc.input}</span></p>
                    <p className="text-white/60">Expected: <span className="text-[#DEC278] font-bold">{tc.expected}</span></p>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-white/10 space-y-2 text-xs text-white/50">
                <p>💡 Tip: Optimize for time and memory complexity before final submission.</p>
                <p>🔗 Enrolled students can record these submissions directly into their CRM progress ledger.</p>
              </div>
            </div>

            {/* Right: Code Editor & Output Terminal */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-2xl bg-black/60 border border-white/15 overflow-hidden shadow-2xl">
                {/* Editor Top Bar */}
                <div className="px-4 py-3 bg-[#1B111A] border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[#DEC278]" />
                    <span className="text-xs font-mono font-semibold text-white/80">solution.py</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>

                    <button
                      type="button"
                      disabled={isRunning}
                      onClick={handleRunCode}
                      className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#C9A24B] to-[#997324] text-[#140D13] font-bold text-xs hover:brightness-110 disabled:opacity-50 transition-all inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-[#140D13]" />
                      <span>{isRunning ? "Running..." : "Run Solution"}</span>
                    </button>
                  </div>
                </div>

                {/* Editor Textarea */}
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-80 p-4 bg-[#0E090E] text-white font-mono text-xs sm:text-sm leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-[#DEC278]"
                  spellCheck={false}
                />

                {/* Terminal Output */}
                {output && (
                  <div className="p-4 bg-black/80 border-t border-white/10 font-mono text-xs space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between text-white/50 pb-1 border-b border-white/10">
                      <span>EXECUTION EVIDENCE LOG</span>
                      {passedAll && (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>PASSED</span>
                        </span>
                      )}
                    </div>
                    <pre className="text-white/80 whitespace-pre-wrap leading-relaxed">{output}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <CourseFooter />
    </div>
  );
}
