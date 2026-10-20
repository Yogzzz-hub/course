"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Award,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

export default function StudentQuizzesPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active taking state
  const [activeQuiz, setActiveQuiz] = useState<any | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<any | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);
  const [takingLoading, setTakingLoading] = useState(false);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [examError, setExamError] = useState("");

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/quizzes");
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

  // Timer countdown
  useEffect(() => {
    if (!activeAttempt || activeAttempt.status !== "IN_PROGRESS") {
      setTimeRemainingSeconds(null);
      return;
    }

    const expiryTime = new Date(activeAttempt.expiresAt).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diffSec = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setTimeRemainingSeconds(diffSec);

      if (diffSec <= 0) {
        clearInterval(interval);
        handleAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeAttempt]);

  const handleStartQuiz = async (quizId: string) => {
    try {
      setTakingLoading(true);
      setExamError("");

      // 1. Fetch detailed quiz questions
      const resDetails = await fetch(`/api/student/quizzes/${quizId}`);
      const dataDetails = await resDetails.json();
      if (!resDetails.ok) throw new Error(dataDetails.error);

      // 2. Start attempt
      const resStart = await fetch(`/api/student/quizzes/${quizId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "START" }),
      });
      const dataStart = await resStart.json();
      if (!resStart.ok) throw new Error(dataStart.error);

      setActiveQuiz(dataDetails.quiz);
      setActiveAttempt(dataStart.attempt);

      // Populate existing responses if resumed
      const initialMap: Record<string, string> = {};
      if (dataStart.attempt.responses) {
        dataStart.attempt.responses.forEach((r: any) => {
          initialMap[r.questionId] = r.responseJson;
        });
      }
      setSelectedAnswers(initialMap);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTakingLoading(false);
    }
  };

  const handleSelectAnswer = async (questionId: string, answer: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: answer }));

    // Autosave response server-side
    if (activeAttempt) {
      await fetch(`/api/student/quizzes/${activeQuiz.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_RESPONSE",
          attemptId: activeAttempt.id,
          questionId,
          responseJson: answer,
        }),
      });
    }
  };

  const handleSubmitAttempt = async () => {
    if (!confirm("Are you sure you want to finish and submit this examination?")) return;
    try {
      setSubmittingQuiz(true);
      const res = await fetch(`/api/student/quizzes/${activeQuiz.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT",
          attemptId: activeAttempt.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActiveAttempt(data.attempt);
      fetchQuizzes();
    } catch (err: any) {
      setExamError(err.message);
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleAutoSubmit = async () => {
    try {
      const res = await fetch(`/api/student/quizzes/${activeQuiz.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SUBMIT",
          attemptId: activeAttempt.id,
        }),
      });
      const data = await res.json();
      if (data.attempt) {
        setActiveAttempt(data.attempt);
        fetchQuizzes();
      }
    } catch (err) {
      console.error("Auto submit failed:", err);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-[#C9A24B]/20 pb-6">
        <h1 className="text-3xl font-serif text-[#2A0F16] font-bold">
          Examinations & Objective Assessments
        </h1>
        <p className="text-sm text-[#2A0F16]/70 mt-1">
          Participate in timed module tests, view auto-graded scorecards, and review evaluated submissions.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-[#2A0F16]/60 bg-white rounded-xl border border-[#C9A24B]/20 animate-pulse">
          Loading assessments catalog...
        </div>
      ) : quizzes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-[#C9A24B]/20 space-y-3">
          <ClipboardList className="w-12 h-12 text-[#C9A24B] mx-auto opacity-60" />
          <h3 className="text-lg font-serif font-bold text-[#2A0F16]">No Scheduled Assessments</h3>
          <p className="text-sm text-[#2A0F16]/70 max-w-md mx-auto">
            You do not currently have any scheduled quizzes or module tests in your enrolled batches.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quizzes.map((quiz) => {
            const hasAttempt = Boolean(quiz.latestAttempt);
            const isCompleted =
              hasAttempt &&
              ["EVALUATED", "AUTO_SUBMITTED", "PUBLISHED"].includes(quiz.latestAttempt.status);
            const isPassed = hasAttempt && quiz.latestAttempt.isPassed;

            return (
              <div
                key={quiz.id}
                className="bg-white rounded-2xl border border-[#C9A24B]/20 p-6 shadow-xs flex flex-col justify-between space-y-5 card-hover hover:border-[#6D1A2B]/40 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2.5 py-0.5 rounded bg-[#F6EBCF] text-[#6D1A2B] font-semibold">
                      {quiz.quizType.replace("_", " ")}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        isCompleted
                          ? isPassed
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {isCompleted
                        ? isPassed
                          ? "Passed"
                          : "Needs Improvement"
                        : quiz.publicationStatus}
                    </span>
                  </div>

                  <h3 className="text-xl font-serif font-bold text-[#2A0F16]">{quiz.title}</h3>
                  {quiz.instructions && (
                    <p className="text-xs text-[#2A0F16]/70 leading-relaxed line-clamp-2">
                      {quiz.instructions}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2 pt-2 text-xs text-[#2A0F16]/70 border-t border-[#C9A24B]/10">
                    <div>
                      <span className="block text-[10px] text-[#2A0F16]/50">Duration</span>
                      <span className="font-semibold">{quiz.durationMinutes} Mins</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#2A0F16]/50">Pass Mark</span>
                      <span className="font-semibold">
                        {quiz.passMarks} / {quiz.maxMarks}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-[#2A0F16]/50">Questions</span>
                      <span className="font-semibold">{quiz.questionCount} Items</span>
                    </div>
                  </div>

                  {/* If attempt completed */}
                  {isCompleted && (
                    <div className="p-3.5 rounded-xl bg-[#FFFBF5] border border-[#C9A24B]/25 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#6D1A2B] tracking-wider block">
                          Final Result
                        </span>
                        <span className="text-xs text-[#2A0F16]/70">
                          Status: {isPassed ? "Pass Threshold Satisfied" : "Below Pass Threshold"}
                        </span>
                      </div>
                      <span className="text-lg font-serif font-bold text-[#6D1A2B]">
                        {quiz.latestAttempt.totalScore} / {quiz.maxMarks}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#C9A24B]/15 flex items-center justify-between">
                  <span className="text-xs text-[#2A0F16]/60">
                    Attempts: {quiz.attemptCount} of {quiz.allowedAttempts}
                  </span>

                  {(!hasAttempt || quiz.attemptCount < quiz.allowedAttempts) && (
                    <button
                      onClick={() => handleStartQuiz(quiz.id)}
                      disabled={takingLoading}
                      className="px-4 py-2 bg-[#6D1A2B] text-white text-xs font-semibold rounded-lg hover:bg-[#4E0F1E] transition-all shadow-sm"
                    >
                      {hasAttempt ? "Retake Quiz" : "Start Assessment"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Examination Modal */}
      {activeQuiz && activeAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-[#C9A24B]/30 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-[#FFFBF5] p-5 border-b border-[#C9A24B]/20 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#2A0F16]">
                  {activeQuiz.title}
                </h3>
                <span className="text-xs text-[#2A0F16]/60">
                  Attempt #{activeAttempt.attemptNumber} • Pass Mark: {activeQuiz.passMarks} /{" "}
                  {activeQuiz.maxMarks}
                </span>
              </div>

              {activeAttempt.status === "IN_PROGRESS" && timeRemainingSeconds !== null && (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#6D1A2B] text-white text-xs font-mono font-bold shadow-sm">
                  <Clock className="w-3.5 h-3.5 text-[#C9A24B]" />
                  <span>{formatTimer(timeRemainingSeconds)}</span>
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {examError && (
                <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
                  {examError}
                </div>
              )}

              {/* If Attempt is Finished, Show Scorecard */}
              {["EVALUATED", "AUTO_SUBMITTED", "PUBLISHED"].includes(activeAttempt.status) ? (
                <div className="text-center py-8 space-y-4">
                  <div
                    className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                      activeAttempt.isPassed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    <Award className="w-8 h-8" />
                  </div>
                  <h4 className="text-2xl font-serif font-bold text-[#2A0F16]">
                    Assessment Finalized
                  </h4>
                  <p className="text-sm text-[#2A0F16]/70 max-w-md mx-auto">
                    Your objective examination has been evaluated. Your total score is{" "}
                    <span className="font-bold text-[#6D1A2B]">
                      {activeAttempt.totalScore} / {activeQuiz.maxMarks}
                    </span>
                    .
                  </p>
                  <span
                    className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold ${
                      activeAttempt.isPassed
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {activeAttempt.isPassed ? "Pass Threshold Satisfied" : "Did Not Meet Pass Score"}
                  </span>
                </div>
              ) : (
                /* Question Paper */
                <div className="space-y-6">
                  {activeQuiz.questions.map((q: any, idx: number) => {
                    const studentAns = selectedAnswers[q.id] || "";

                    return (
                      <div
                        key={q.id}
                        className="p-5 rounded-xl border border-[#C9A24B]/20 bg-[#FFFBF5]/40 space-y-3"
                      >
                        <div className="flex items-center justify-between text-xs text-[#2A0F16]/60">
                          <span className="font-semibold text-[#6D1A2B]">
                            Question {idx + 1} of {activeQuiz.questions.length}
                          </span>
                          <span>Marks: {q.customMarks}</span>
                        </div>

                        <p className="text-sm font-medium text-[#2A0F16] leading-relaxed">
                          {q.questionText}
                        </p>

                        {/* Options */}
                        {Array.isArray(q.options) && q.options.length > 0 ? (
                          <div className="space-y-2.5 pt-1">
                            {q.options.map((opt: string, oIdx: number) => {
                              const isSelected = studentAns === opt;
                              return (
                                <button
                                  key={oIdx}
                                  type="button"
                                  onClick={() => handleSelectAnswer(q.id, opt)}
                                  className={`w-full text-left p-3.5 sm:p-3 rounded-xl text-xs transition-all border flex items-center justify-between min-h-[48px] ${
                                    isSelected
                                      ? "bg-[#6D1A2B] text-white border-[#6D1A2B] shadow-xs"
                                      : "bg-white text-[#2A0F16] border-[#C9A24B]/20 hover:bg-[#F6EBCF]/30"
                                  }`}
                                >
                                  <span className="leading-snug">{opt}</span>
                                  {isSelected && <CheckCircle2 className="w-4 h-4 text-[#C9A24B] shrink-0 ml-2" />}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div>
                            <input
                              type="text"
                              value={studentAns}
                              onChange={(e) => handleSelectAnswer(q.id, e.target.value)}
                              placeholder="Enter your exact numeric or short text answer..."
                              className="w-full text-base sm:text-xs p-3 rounded-xl border border-[#C9A24B]/30 bg-white"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#FFFBF5] border-t border-[#C9A24B]/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <span className="text-[11px] sm:text-xs text-[#2A0F16]/60 text-center sm:text-left">
                Responses autosave automatically on selection.
              </span>

              {["EVALUATED", "AUTO_SUBMITTED", "PUBLISHED"].includes(activeAttempt.status) ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveQuiz(null);
                    setActiveAttempt(null);
                  }}
                  className="px-5 py-2.5 bg-[#6D1A2B] text-white text-xs font-semibold rounded-lg hover:bg-[#4E0F1E] min-h-[44px] flex items-center justify-center"
                >
                  Close Scorecard
                </button>
              ) : (
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Leave assessment? Your timer will continue running.")) {
                        setActiveQuiz(null);
                        setActiveAttempt(null);
                      }
                    }}
                    className="flex-1 sm:flex-none px-4 py-2.5 border border-[#C9A24B]/30 text-xs font-medium rounded-lg text-[#2A0F16] hover:bg-stone-50 min-h-[44px] flex items-center justify-center"
                  >
                    Pause & Exit
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitAttempt}
                    disabled={submittingQuiz}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-[#6D1A2B] text-white text-xs font-semibold rounded-lg hover:bg-[#4E0F1E] shadow-sm disabled:opacity-50 min-h-[44px] flex items-center justify-center"
                  >
                    {submittingQuiz ? "Submitting..." : "Submit Assessment"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
