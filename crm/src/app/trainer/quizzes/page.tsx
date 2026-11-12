"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardList,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Award,
  Users,
} from "lucide-react";

export default function TrainerQuizzesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Quiz Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [quizType, setQuizType] = useState("MODULE_TEST");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [passMarks, setPassMarks] = useState(50);
  const [maxMarks, setMaxMarks] = useState(100);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [autoEvaluateObjective, setAutoEvaluateObjective] = useState(true);
  const [allowNegativeMarking, setAllowNegativeMarking] = useState(false);
  const [negativeMarkValue, setNegativeMarkValue] = useState(0.25);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await fetch("/api/trainer/batches");
      const data = await res.json();
      if (data.batches && data.batches.length > 0) {
        setBatches(data.batches);
        setSelectedBatchId(data.batches[0].id);
        fetchQuizzes(data.batches[0].id);
        fetchQuestions(data.batches[0].courseId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizzes = async (bId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/trainer/quizzes?batchId=${bId}`);
      const data = await res.json();
      if (data.success) {
        setQuizzes(data.quizzes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (cId: string) => {
    try {
      const res = await fetch(`/api/trainer/question-bank?courseId=${cId}`);
      const data = await res.json();
      if (data.success) {
        const flat = data.questionBanks.flatMap((b: any) => b.questions || []);
        setAvailableQuestions(flat);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    const batch = batches.find((b) => b.id === selectedBatchId);
    if (!batch || !title) return;

    try {
      setSaving(true);
      const res = await fetch("/api/trainer/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: batch.courseId,
          batchId: selectedBatchId,
          title,
          instructions,
          quizType,
          durationMinutes: Number(durationMinutes),
          passMarks: Number(passMarks),
          maxMarks: Number(maxMarks),
          autoEvaluateObjective,
          allowNegativeMarking,
          negativeMarkValue: Number(negativeMarkValue),
          questionIds: selectedQuestionIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowCreateModal(false);
      setTitle("");
      setInstructions("");
      setSelectedQuestionIds([]);
      fetchQuizzes(selectedBatchId);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleQuestionSelection = (id: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((qId) => qId !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#C9A24B]/20 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-[#2A0F16] font-bold">
            Quizzes & Examination Builder
          </h1>
          <p className="text-xs sm:text-sm text-[#2A0F16]/70 mt-1">
            Schedule timed module tests, attach questions from the bank, and monitor attempt evaluations.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#6D1A2B] text-white text-xs font-semibold rounded-lg hover:bg-[#4E0F1E] transition-all shadow-sm min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          Create Examination
        </button>
      </div>

      {/* Batch Selector */}
      {batches.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-[#C9A24B]/20 shadow-xs">
          <span className="text-xs font-semibold text-[#2A0F16] shrink-0">Select Batch:</span>
          <select
            value={selectedBatchId}
            onChange={(e) => {
              setSelectedBatchId(e.target.value);
              fetchQuizzes(e.target.value);
              const b = batches.find((x) => x.id === e.target.value);
              if (b) fetchQuestions(b.courseId);
            }}
            className="w-full sm:w-auto max-w-full text-base sm:text-xs p-3 sm:p-2.5 rounded-lg border border-[#C9A24B]/30 bg-[#FFFBF5] font-medium text-[#2A0F16] shadow-xs min-h-[44px]"
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} ({b.course?.title})
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-[#2A0F16]/60 bg-white rounded-xl border border-[#C9A24B]/20 animate-pulse">
          Loading examinations...
        </div>
      ) : quizzes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-[#C9A24B]/20 space-y-3">
          <ClipboardList className="w-12 h-12 text-[#C9A24B] mx-auto opacity-60" />
          <h3 className="text-lg font-serif font-bold text-[#2A0F16]">No Quizzes Scheduled</h3>
          <p className="text-sm text-[#2A0F16]/70 max-w-md mx-auto">
            Click "Create Examination" above to construct an assessment from your question bank.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => {
            const totalAttempts = quiz.attempts.length;
            const passedCount = quiz.attempts.filter((a: any) => a.isPassed).length;
            const passPct =
              totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0;

            return (
              <div
                key={quiz.id}
                className="bg-white rounded-2xl border border-[#C9A24B]/20 p-5 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between text-xs text-[#2A0F16]/60">
                  <span className="font-semibold text-[#6D1A2B]">{quiz.batch?.code}</span>
                  <span className="px-2 py-0.5 rounded bg-[#F6EBCF] text-[#6D1A2B] font-bold text-[10px]">
                    {quiz.quizType}
                  </span>
                </div>

                <div>
                  <h3 className="font-serif font-bold text-base text-[#2A0F16]">{quiz.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-[#2A0F16]/60 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#C9A24B]" />
                      {quiz.durationMinutes} mins
                    </span>
                    <span>• {quiz.questions.length} Questions</span>
                  </div>
                </div>

                <div className="p-3 bg-[#FFFBF5] rounded-xl border border-[#C9A24B]/15 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[#2A0F16]/60 block">Attempts</span>
                    <span className="font-bold text-[#2A0F16]">{totalAttempts} Completed</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#2A0F16]/60 block">Pass Rate</span>
                    <span className="font-bold text-emerald-700">{passPct}%</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#C9A24B]/15 text-xs text-[#2A0F16]/60 flex items-center justify-between">
                  <span>Pass Mark: {quiz.passMarks}</span>
                  <span>Max: {quiz.maxMarks}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Quiz Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-[#C9A24B]/30 shadow-2xl overflow-hidden">
            <div className="bg-[#FFFBF5] p-5 border-b border-[#C9A24B]/20 flex items-center justify-between shrink-0">
              <h3 className="font-serif font-bold text-base text-[#2A0F16]">
                Configure Examination
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded text-[#2A0F16]/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuiz} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  Examination Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Module 2: System Architecture & Concurrency Test"
                  className="w-full text-xs p-2.5 rounded-lg border border-[#C9A24B]/30"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full text-base sm:text-xs p-3 sm:p-2 rounded-lg border border-[#C9A24B]/30 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                    Pass Marks
                  </label>
                  <input
                    type="number"
                    value={passMarks}
                    onChange={(e) => setPassMarks(Number(e.target.value))}
                    className="w-full text-base sm:text-xs p-3 sm:p-2 rounded-lg border border-[#C9A24B]/30 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                    Max Marks
                  </label>
                  <input
                    type="number"
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(Number(e.target.value))}
                    className="w-full text-base sm:text-xs p-3 sm:p-2 rounded-lg border border-[#C9A24B]/30 min-h-[44px]"
                  />
                </div>
              </div>

              {/* Question Selection from Bank */}
              <div className="space-y-2 pt-2 border-t border-[#C9A24B]/15">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#2A0F16]">
                    Select Questions from Question Bank ({selectedQuestionIds.length} Selected)
                  </label>
                </div>

                {availableQuestions.length === 0 ? (
                  <p className="text-xs text-[#2A0F16]/60 italic p-3 bg-[#FFFBF5] rounded-lg">
                    No questions available in the question bank for this course. Add questions to the bank first.
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto divide-y divide-[#C9A24B]/10 border border-[#C9A24B]/20 rounded-lg p-2 bg-[#FFFBF5]/40">
                    {availableQuestions.map((q) => {
                      const isChecked = selectedQuestionIds.includes(q.id);
                      return (
                        <div
                          key={q.id}
                          onClick={() => toggleQuestionSelection(q.id)}
                          className="p-3 sm:p-2 flex items-center justify-between text-xs cursor-pointer hover:bg-white rounded transition-colors min-h-[44px]"
                        >
                          <div className="flex items-center gap-2 max-w-[85%]">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="w-4 h-4 rounded text-[#6D1A2B]"
                            />
                            <span className="line-clamp-1">{q.questionText}</span>
                          </div>
                          <span className="text-[10px] text-[#2A0F16]/60 font-semibold shrink-0">
                            {q.marks} Marks
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#C9A24B]/20">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 border rounded-lg text-xs min-h-[44px] flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#6D1A2B] text-white text-xs font-semibold rounded-lg shadow-sm min-h-[44px] flex items-center justify-center"
                >
                  {saving ? "Creating..." : "Publish Assessment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
