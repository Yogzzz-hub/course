"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BrainCircuit,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  BookOpen,
  Calendar,
  Compass,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { CourseNavbar } from "@/frontend/components/layout/CourseNavbar";
import { CourseFooter } from "@/frontend/components/layout/CourseFooter";

interface Question {
  id: number;
  category: string;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const questions: Question[] = [
  {
    id: 1,
    category: "Python Core",
    question: "What is the output of the following Python list mutation snippet?",
    codeSnippet: `def append_item(val, target=[]):\n    target.append(val)\n    return target\n\nprint(append_item(1))\nprint(append_item(2))`,
    options: ["[1] then [2]", "[1] then [1, 2]", "[1] then []", "TypeError: immutable default parameter"],
    correctIndex: 1,
    explanation: "Default parameter values in Python are evaluated once when the function is defined, not each time the function is called. Mutating `target` affects subsequent invocations."
  },
  {
    id: 2,
    category: "SQL & Databases",
    question: "Which SQL clause handles grouping aggregations after filtering individual aggregated groups?",
    codeSnippet: `SELECT department_id, COUNT(*) AS employee_count\nFROM employees\nGROUP BY department_id\n-- ??? employee_count > 5`,
    options: ["WHERE", "HAVING", "ORDER BY", "FILTER"],
    correctIndex: 1,
    explanation: "`WHERE` filters individual rows before aggregation occurs; `HAVING` filters aggregated row groups produced by `GROUP BY`."
  },
  {
    id: 3,
    category: "Modern JavaScript",
    question: "In JavaScript, what does `Promise.all([p1, p2, p3])` do if `p2` rejects?",
    options: [
      "Waits for all to resolve and returns rejected values as null",
      "Immediately rejects with the error of p2 (fails fast)",
      "Retries p2 up to 3 times before rejecting",
      "Returns a tuple of fulfilled values and errors"
    ],
    correctIndex: 1,
    explanation: "`Promise.all` fails fast: if any promise rejects, the entire returned promise rejects immediately with that rejection reason."
  },
  {
    id: 4,
    category: "REST & Backend APIs",
    question: "Which HTTP status code is most appropriate when a client request violates business logic constraints (e.g. insufficient account balance)?",
    options: ["400 Bad Request", "401 Unauthorized", "422 Unprocessable Content", "500 Internal Server Error"],
    correctIndex: 2,
    explanation: "422 Unprocessable Content indicates that the request syntax is valid JSON/schema, but server-side business rules prevent execution."
  },
  {
    id: 5,
    category: "Data Structures & Algorithms",
    question: "What is the average time complexity for searching a key in a balanced hash table vs a binary search tree?",
    options: ["O(1) vs O(log n)", "O(n) vs O(1)", "O(log n) vs O(n)", "O(1) vs O(1)"],
    correctIndex: 0,
    explanation: "A hash table averages O(1) amortized lookup via hash function bucket resolution, whereas a balanced BST requires O(log n) comparisons."
  },
  {
    id: 6,
    category: "Docker & DevOps",
    question: "Why should software engineers place dependency installation (e.g. `npm install` or `pip install`) before source code copies in a Dockerfile?",
    options: [
      "To prevent container root security vulnerabilities",
      "To optimize Docker layer caching and accelerate rebuilds",
      "Because Docker cannot read source files before dependencies",
      "To compress final image size by 50%"
    ],
    correctIndex: 1,
    explanation: "Docker caches intermediate image layers. Placing dependency manifests first ensures dependencies are only reinstalled when packages change, not on every code edit."
  },
  {
    id: 7,
    category: "React Architecture",
    question: "When should you prefer `useCallback` or `useMemo` in React?",
    options: [
      "Wrap every single function and variable in them by default",
      "Only when passing callbacks to memoized child components or preventing expensive recomputations",
      "To handle asynchronous fetch requests",
      "To guarantee variables persist across browser reloads"
    ],
    correctIndex: 1,
    explanation: "Memoization has memory overhead. Use them judiciously when referential equality matters to memoized children (`React.memo`) or for computationally expensive calculations."
  },
  {
    id: 8,
    category: "Security & Auth",
    question: "What is the purpose of adding a cryptographic `salt` before hashing a user password with bcrypt or Argon2?",
    options: [
      "To decrypt the password when the user forgets it",
      "To prevent rainbow table attacks and ensure identical passwords have unique hash digests",
      "To enforce minimum password length of 12 characters",
      "To speed up database index searches"
    ],
    correctIndex: 1,
    explanation: "Salting injects unique random data into the hash input, rendering precomputed lookup tables (rainbow tables) useless and preventing hash collisions for identical passwords."
  },
  {
    id: 9,
    category: "PostgreSQL & ACID",
    question: "In database transaction theory, what does the 'I' in ACID stand for?",
    options: ["Indexation", "Immutability", "Isolation", "Iteration"],
    correctIndex: 2,
    explanation: "Isolation ensures concurrent database transactions do not interfere with each other or expose uncommitted intermediate state."
  },
  {
    id: 10,
    category: "System Design",
    question: "What is an 'idempotent' API endpoint?",
    options: [
      "An endpoint that returns encrypted data only",
      "An endpoint where making identical requests multiple times produces the same server state as a single request",
      "An endpoint that only accepts GET requests",
      "An endpoint that bypasses authentication"
    ],
    correctIndex: 1,
    explanation: "Idempotency guarantees that retried network requests (common during timeouts or network drops) will not duplicate operations (such as double-charging a customer)."
  }
];

export default function DeveloperReadinessTestPage() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [testComplete, setTestComplete] = useState(false);

  const q = questions[currentIdx];
  const userSelection = selectedAnswers[currentIdx];
  const isSelected = userSelection !== undefined;

  const handleSelectOption = (optIdx: number) => {
    if (showExplanation) return;
    setSelectedAnswers((prev) => ({ ...prev, [currentIdx]: optIdx }));
  };

  const handleConfirmAnswer = () => {
    setShowExplanation(true);
  };

  const handleNext = () => {
    setShowExplanation(false);
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      setTestComplete(true);
    }
  };

  const handleRestart = () => {
    setSelectedAnswers({});
    setCurrentIdx(0);
    setShowExplanation(false);
    setTestComplete(false);
  };

  // Calculate score
  const correctCount = Object.entries(selectedAnswers).reduce((acc, [qIdx, ansIdx]) => {
    return questions[Number(qIdx)].correctIndex === ansIdx ? acc + 1 : acc;
  }, 0);

  const percentage = Math.round((correctCount / questions.length) * 100);

  return (
    <div className="min-h-screen bg-[#140D13] text-white flex flex-col justify-between">
      <CourseNavbar />

      <main className="flex-1 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#681C35]/60 border border-[#DEC278]/40 text-[#DEC278] text-xs font-semibold">
              <BrainCircuit className="w-3.5 h-3.5" />
              <span>Free Engineering Diagnostic • No Account Required</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white">
              Developer Readiness & Diagnostic Test
            </h1>
            <p className="text-xs sm:text-sm text-white/70 max-w-xl mx-auto leading-relaxed">
              10 real-world engineering questions across Python, SQL, REST APIs, Docker, and system design. Discover your foundational strengths and identify learning areas.
            </p>
          </div>

          {!testComplete ? (
            <div className="p-6 sm:p-10 rounded-3xl bg-white/5 border border-white/10 space-y-8 shadow-2xl backdrop-blur-md">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span className="font-semibold text-[#DEC278] uppercase tracking-wider">
                    Question {currentIdx + 1} of {questions.length} • {q.category}
                  </span>
                  <span>{Math.round(((currentIdx + 1) / questions.length) * 100)}% Complete</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#681C35] to-[#DEC278] transition-all duration-300"
                    style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-4">
                <h2 className="font-serif text-lg sm:text-2xl font-bold text-white leading-snug">
                  {q.question}
                </h2>

                {q.codeSnippet && (
                  <pre className="p-4 rounded-xl bg-black/50 border border-white/10 font-mono text-xs sm:text-sm text-[#DEC278] overflow-x-auto leading-relaxed">
                    {q.codeSnippet}
                  </pre>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3">
                {q.options.map((option, optIdx) => {
                  const isUserPick = userSelection === optIdx;
                  const isCorrect = optIdx === q.correctIndex;

                  let optionStyle = "border-white/15 bg-white/5 hover:bg-white/10 text-white/90";
                  if (showExplanation) {
                    if (isCorrect) {
                      optionStyle = "border-emerald-500 bg-emerald-950/40 text-emerald-200 font-semibold";
                    } else if (isUserPick && !isCorrect) {
                      optionStyle = "border-rose-500 bg-rose-950/40 text-rose-200";
                    } else {
                      optionStyle = "border-white/5 bg-white/5 opacity-50";
                    }
                  } else if (isUserPick) {
                    optionStyle = "border-[#DEC278] bg-[#681C35]/50 text-white font-semibold";
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={showExplanation}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-start gap-3 ${optionStyle}`}
                    >
                      <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-mono shrink-0 mt-0.5">
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="flex-1 leading-relaxed">{option}</span>
                      {showExplanation && isCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      )}
                      {showExplanation && isUserPick && !isCorrect && (
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation Card */}
              {showExplanation && (
                <div className="p-5 rounded-xl bg-white/5 border border-[#DEC278]/30 space-y-2 animate-fade-in">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#DEC278]">
                    Engineering Explanation
                  </p>
                  <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-sans">
                    {q.explanation}
                  </p>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <span className="text-xs text-white/40">
                  {showExplanation ? "Review explanation above" : "Pick the best answer"}
                </span>

                {!showExplanation ? (
                  <button
                    type="button"
                    disabled={!isSelected}
                    onClick={handleConfirmAnswer}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A24B] to-[#997324] text-[#140D13] font-bold text-xs hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Confirm Answer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2.5 rounded-xl bg-white text-[#140D13] font-bold text-xs hover:bg-[#DEC278] transition-all inline-flex items-center gap-1.5"
                  >
                    <span>{currentIdx < questions.length - 1 ? "Next Question" : "See Final Score"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Results Screen */
            <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#681C35]/30 to-white/5 border border-[#DEC278]/40 text-center space-y-8 shadow-2xl backdrop-blur-md">
              <div className="w-16 h-16 rounded-full bg-[#DEC278] text-[#140D13] flex items-center justify-center mx-auto shadow-lg shadow-[#DEC278]/20">
                <Sparkles className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
                  Test Results: {percentage}%
                </h2>
                <p className="text-sm text-white/70">
                  You scored <strong className="text-[#DEC278]">{correctCount}</strong> out of{" "}
                  <strong>{questions.length}</strong> questions correctly.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-left space-y-3 max-w-xl mx-auto">
                <h3 className="font-serif font-bold text-base text-[#DEC278]">
                  Personalized Engineering Roadmap Recommendation
                </h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  {percentage >= 80
                    ? "Exceptional foundational depth! You are primed for Advanced Python Distributed Architecture, High-Concurrency Django Backends, and Senior DSA Technical Interview preparation."
                    : percentage >= 50
                    ? "Solid working baseline. To excel in technical interviews, focus on strengthening mutable parameter handling, Docker caching mechanics, and PostgreSQL ACID transaction isolation."
                    : "Great first diagnostic! Accelerate your engineering trajectory with our 7-Month Python Full-Stack Software Engineering Master Track starting from first principles."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link
                  href="/programmes/python-full-stack"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#C9A24B] to-[#997324] text-[#140D13] font-bold text-xs hover:brightness-110 shadow-lg shadow-[#C9A24B]/20 transition-all inline-flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Explore Flagship Curriculum</span>
                </Link>

                <Link
                  href="/book-session"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs transition-all inline-flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4 text-[#DEC278]" />
                  <span>Discuss Roadmap with Architect</span>
                </Link>

                <button
                  type="button"
                  onClick={handleRestart}
                  className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-transparent hover:bg-white/5 text-white/70 hover:text-white text-xs transition-all inline-flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake Test</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <CourseFooter />
    </div>
  );
}
