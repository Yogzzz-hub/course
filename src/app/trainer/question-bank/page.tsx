"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Database,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  X,
  Award,
  Layers,
} from "lucide-react";

export default function TrainerQuestionBankPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [questionBanks, setQuestionBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Question Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [type, setType] = useState("MCQ_SINGLE");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [marks, setMarks] = useState(1);
  const [explanation, setExplanation] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [optionsStr, setOptionsStr] = useState("Option A\nOption B\nOption C\nOption D");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await fetch("/api/trainer/batches");
      const data = await res.json();
      if (data.batches && data.batches.length > 0) {
        const uniqueCourses: any[] = [];
        const seen = new Set();
        data.batches.forEach((b: any) => {
          if (b.course && !seen.has(b.course.id)) {
            seen.add(b.course.id);
            uniqueCourses.push(b.course);
          }
        });
        setCourses(uniqueCourses);
        if (uniqueCourses.length > 0) {
          setSelectedCourseId(uniqueCourses[0].id);
          fetchQuestionBanks(uniqueCourses[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestionBanks = async (cId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/trainer/question-bank?courseId=${cId}`);
      const data = await res.json();
      if (data.success) {
        setQuestionBanks(data.questionBanks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText || !correctAnswer || !selectedCourseId) return;

    const options = ["MCQ_SINGLE", "MCQ_MULTI"].includes(type)
      ? optionsStr
          .split("\n")
          .map((o) => o.trim())
          .filter(Boolean)
      : undefined;

    try {
      setSaving(true);
      const res = await fetch("/api/trainer/question-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseId,
          questionText,
          type,
          difficulty,
          marks: Number(marks),
          explanation,
          correctAnswer,
          options,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowAddModal(false);
      setQuestionText("");
      setCorrectAnswer("");
      setExplanation("");
      fetchQuestionBanks(selectedCourseId);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const allQuestions = questionBanks.flatMap((b) => b.questions || []);

  return (
    <AppShell
      user={{
        name: "Trainer",
        email: "",
        role: "TRAINER",
      }}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#C9A24B]/20 pb-4 sm:pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#C9A24B]">
              Evaluation Assets
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif text-[#2A0F16] font-bold mt-0.5">
              Question Bank Repository
            </h1>
            <p className="text-xs sm:text-sm text-[#2A0F16]/70 mt-1">
              Build and manage reusable assessment questions, MCQs, numeric problems, and practical questions.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#6D1A2B] text-white text-xs font-semibold rounded-xl hover:bg-[#4E0F1E] transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>

        {/* Course Context Picker */}
        {courses.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-[#C9A24B]/20">
            <span className="text-xs font-semibold text-[#2A0F16] shrink-0">Course:</span>
            <select
              value={selectedCourseId}
              onChange={(e) => {
                setSelectedCourseId(e.target.value);
                fetchQuestionBanks(e.target.value);
              }}
              className="w-full sm:w-auto max-w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 p-2.5 rounded-lg border border-[#C9A24B]/30 bg-[#FFFBF5] font-medium text-[#2A0F16]"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.code})
                </option>
              ))}
            </select>
          </div>
        )}

      {loading ? (
        <div className="p-12 text-center text-[#2A0F16]/60 bg-white rounded-xl border border-[#C9A24B]/20 animate-pulse">
          Loading question bank entries...
        </div>
      ) : allQuestions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-[#C9A24B]/20 space-y-3">
          <Database className="w-12 h-12 text-[#C9A24B] mx-auto opacity-60" />
          <h3 className="text-lg font-serif font-bold text-[#2A0F16]">Question Bank Empty</h3>
          <p className="text-sm text-[#2A0F16]/70 max-w-md mx-auto">
            Click "Add Question" above to populate questions for this course.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#2A0F16]/70 px-1">
            <span>Showing {allQuestions.length} reusable questions</span>
            <span className="font-semibold text-[#6D1A2B]">Authorized Trainer Access</span>
          </div>

          <div className="space-y-3">
            {allQuestions.map((q, idx) => {
              let options = [];
              if (q.optionsJson) {
                try {
                  options = JSON.parse(q.optionsJson);
                } catch {}
              }

              return (
                <div
                  key={q.id}
                  className="bg-white rounded-xl border border-[#C9A24B]/20 p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between text-xs text-[#2A0F16]/60">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#6D1A2B]">Q{idx + 1}</span>
                      <span className="px-2 py-0.5 rounded bg-[#F6EBCF] text-[#6D1A2B] text-[10px] font-bold">
                        {q.type}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-semibold">
                        Difficulty: {q.difficulty}
                      </span>
                    </div>
                    <span>Marks: {q.marks}</span>
                  </div>

                  <p className="text-sm font-medium text-[#2A0F16] leading-relaxed">
                    {q.questionText}
                  </p>

                  {options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {options.map((opt: string, oIdx: number) => (
                        <div
                          key={oIdx}
                          className={`p-2 rounded text-xs border ${
                            opt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
                              ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-medium"
                              : "bg-[#FFFBF5] border-[#C9A24B]/15 text-[#2A0F16]/80"
                          }`}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#C9A24B]/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-emerald-700 font-medium">
                      Correct Key: <strong>{q.correctAnswer}</strong>
                    </span>
                    {q.explanation && (
                      <span className="text-[#2A0F16]/65 italic">
                        Explanation: {q.explanation}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-[#C9A24B]/30 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#C9A24B]/20 pb-3">
              <h3 className="font-serif font-bold text-base text-[#2A0F16]">
                Add Question to Bank
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded text-[#2A0F16]/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  Question Text
                </label>
                <textarea
                  rows={3}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Enter problem statement or scenario..."
                  className="w-full text-base sm:text-xs p-2.5 rounded-lg border border-[#C9A24B]/30"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2A0F16] mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 p-2 rounded-lg border border-[#C9A24B]/30"
                  >
                    <option value="MCQ_SINGLE">Single MCQ</option>
                    <option value="MCQ_MULTI">Multi-select MCQ</option>
                    <option value="TRUE_FALSE">True / False</option>
                    <option value="NUMERIC">Numeric</option>
                    <option value="SHORT_ANSWER">Short Answer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 p-2 rounded-lg border border-[#C9A24B]/30"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2A0F16] mb-1">Marks</label>
                  <input
                    type="number"
                    value={marks}
                    onChange={(e) => setMarks(Number(e.target.value))}
                    min={0.5}
                    step={0.5}
                    className="w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 p-2 rounded-lg border border-[#C9A24B]/30"
                  />
                </div>
              </div>

              {["MCQ_SINGLE", "MCQ_MULTI"].includes(type) && (
                <div>
                  <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                    Options (One per line)
                  </label>
                  <textarea
                    rows={4}
                    value={optionsStr}
                    onChange={(e) => setOptionsStr(e.target.value)}
                    className="w-full text-base sm:text-xs p-2.5 rounded-lg border border-[#C9A24B]/30 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  Correct Answer (Must match option text exactly)
                </label>
                <input
                  type="text"
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  placeholder="e.g. Option A or numeric value"
                  className="w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 p-2.5 rounded-lg border border-[#C9A24B]/30"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  Explanation / Solution Notes (Optional)
                </label>
                <input
                  type="text"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Why this answer is correct..."
                  className="w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 p-2.5 rounded-lg border border-[#C9A24B]/30"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2 border rounded-xl text-xs font-medium hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2 bg-[#6D1A2B] hover:bg-[#4E0F1E] text-white text-xs font-semibold rounded-xl"
                >
                  {saving ? "Saving..." : "Add to Question Bank"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </AppShell>
  );
}
