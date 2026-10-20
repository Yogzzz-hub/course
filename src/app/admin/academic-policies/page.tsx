"use client";

import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  Award,
  Layers,
  Settings,
} from "lucide-react";

export default function AdminAcademicPoliciesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Policy Modal
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [assignmentsWeight, setAssignmentsWeight] = useState(30);
  const [quizzesWeight, setQuizzesWeight] = useState(30);
  const [projectsWeight, setProjectsWeight] = useState(40);
  const [finalExamWeight, setFinalExamWeight] = useState(0);
  const [minPassScore, setMinPassScore] = useState(50);
  const [requiresAssignmentCompletion, setRequiresAssignmentCompletion] = useState(true);
  const [requiresQuizPass, setRequiresQuizPass] = useState(true);
  const [requiresProjectApproval, setRequiresProjectApproval] = useState(true);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/academic-policies");
      const data = await res.json();
      if (data.success) {
        setCourses(data.courses);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (course: any) => {
    setSelectedCourse(course);
    const curr = course.academicGradingPolicies?.[0];
    if (curr) {
      setAssignmentsWeight(curr.assignmentsWeightPercent);
      setQuizzesWeight(curr.quizzesWeightPercent);
      setProjectsWeight(curr.projectsWeightPercent);
      setFinalExamWeight(curr.finalExamWeightPercent);
      setMinPassScore(curr.minPassScorePercent);
      setRequiresAssignmentCompletion(curr.requiresAssignmentCompletion);
      setRequiresQuizPass(curr.requiresQuizPass);
      setRequiresProjectApproval(curr.requiresProjectApproval);
    } else {
      setAssignmentsWeight(30);
      setQuizzesWeight(30);
      setProjectsWeight(40);
      setFinalExamWeight(0);
      setMinPassScore(50);
      setRequiresAssignmentCompletion(true);
      setRequiresQuizPass(true);
      setRequiresProjectApproval(true);
    }
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    const total =
      Number(assignmentsWeight) +
      Number(quizzesWeight) +
      Number(projectsWeight) +
      Number(finalExamWeight);

    if (Math.abs(total - 100) > 0.01) {
      setErrorMsg(`Total weights must equal exactly 100%. Currently: ${total}%`);
      return;
    }

    try {
      setSaving(true);
      setErrorMsg("");
      const res = await fetch("/api/admin/academic-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          assignmentsWeightPercent: assignmentsWeight,
          quizzesWeightPercent: quizzesWeight,
          projectsWeightPercent: projectsWeight,
          finalExamWeightPercent: finalExamWeight,
          minPassScorePercent: minPassScore,
          requiresAssignmentCompletion,
          requiresQuizPass,
          requiresProjectApproval,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessMsg(data.message);
      setTimeout(() => {
        setSelectedCourse(null);
        fetchPolicies();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalCalculatedWeight =
    Number(assignmentsWeight) +
    Number(quizzesWeight) +
    Number(projectsWeight) +
    Number(finalExamWeight);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-[#C9A24B]/20 pb-4 sm:pb-6">
        <h1 className="text-2xl sm:text-3xl font-serif text-[#2A0F16] font-bold">
          Academic Grading Policies & Certification Rules
        </h1>
        <p className="text-xs sm:text-sm text-[#2A0F16]/70 mt-1">
          Configure course-level assessment weight distributions, graduation pass marks, and prerequisite completion gates.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-[#2A0F16]/60 bg-white rounded-xl border border-[#C9A24B]/20 animate-pulse text-xs">
          Loading course policies...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {courses.map((course) => {
            const currentPolicy = course.academicGradingPolicies?.[0];

            return (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-[#C9A24B]/25 p-4 sm:p-6 shadow-sm flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2.5 py-0.5 rounded bg-[#F6EBCF] text-[#6D1A2B] font-semibold">
                      {course.code}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9A24B]">
                      {currentPolicy ? `Policy v${currentPolicy.version}` : "Default Policy"}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-base sm:text-lg text-[#2A0F16]">{course.title}</h3>

                  {currentPolicy ? (
                    <div className="space-y-3 pt-2 border-t border-[#C9A24B]/15">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-[#FFFBF5]">
                          <span className="text-[10px] text-[#2A0F16]/60 block">Assignments</span>
                          <span className="font-bold text-[#6D1A2B]">
                            {currentPolicy.assignmentsWeightPercent}%
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#FFFBF5]">
                          <span className="text-[10px] text-[#2A0F16]/60 block">Quizzes</span>
                          <span className="font-bold text-[#C9A24B]">
                            {currentPolicy.quizzesWeightPercent}%
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#FFFBF5]">
                          <span className="text-[10px] text-[#2A0F16]/60 block">Projects</span>
                          <span className="font-bold text-[#2A0F16]">
                            {currentPolicy.projectsWeightPercent}%
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#FFFBF5]">
                          <span className="text-[10px] text-[#2A0F16]/60 block">Pass Score</span>
                          <span className="font-bold text-emerald-700">
                            {currentPolicy.minPassScorePercent}%
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-[#2A0F16]/70 space-y-1">
                        <span className="block font-medium">Prerequisites for Certificate:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {currentPolicy.requiresAssignmentCompletion && (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                              Assignments
                            </span>
                          )}
                          {currentPolicy.requiresQuizPass && (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                              Quiz Pass
                            </span>
                          )}
                          {currentPolicy.requiresProjectApproval && (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                              Project Pass
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#2A0F16]/60 italic">
                      Standard default weights applied (30% Assignments, 30% Quizzes, 40% Projects).
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleOpenEdit(course)}
                  className="min-h-[44px] w-full py-2.5 bg-[#6D1A2B] text-white text-xs font-semibold rounded-xl hover:bg-[#4E0F1E] active:scale-[0.99] transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Configure Policy
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Policy Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#C9A24B]/30 shadow-2xl p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-[#C9A24B]/20 pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-[#2A0F16]">
                  Configure Policy: {selectedCourse.title}
                </h3>
                <span className="text-xs text-[#2A0F16]/60">
                  New version will become active for future evaluations.
                </span>
              </div>
              <button
                onClick={() => setSelectedCourse(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#2A0F16]/60 hover:text-[#2A0F16]"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs border border-emerald-200">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSavePolicy} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                    Assignments Weight (%)
                  </label>
                  <input
                    type="number"
                    value={assignmentsWeight}
                    onChange={(e) => setAssignmentsWeight(Number(e.target.value))}
                    min={0}
                    max={100}
                    className="w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 p-2.5 rounded-xl border border-[#C9A24B]/30 focus:outline-none focus:border-[#6D1A2B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                    Quizzes Weight (%)
                  </label>
                  <input
                    type="number"
                    value={quizzesWeight}
                    onChange={(e) => setQuizzesWeight(Number(e.target.value))}
                    min={0}
                    max={100}
                    className="w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 p-2.5 rounded-xl border border-[#C9A24B]/30 focus:outline-none focus:border-[#6D1A2B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                    Projects Weight (%)
                  </label>
                  <input
                    type="number"
                    value={projectsWeight}
                    onChange={(e) => setProjectsWeight(Number(e.target.value))}
                    min={0}
                    max={100}
                    className="w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 p-2.5 rounded-xl border border-[#C9A24B]/30 focus:outline-none focus:border-[#6D1A2B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                    Minimum Pass Score (%)
                  </label>
                  <input
                    type="number"
                    value={minPassScore}
                    onChange={(e) => setMinPassScore(Number(e.target.value))}
                    min={0}
                    max={100}
                    className="w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 p-2.5 rounded-xl border border-[#C9A24B]/30 focus:outline-none focus:border-[#6D1A2B]"
                  />
                </div>
              </div>

              {/* Weight Sum Indicator */}
              <div
                className={`p-2.5 rounded-xl text-xs font-medium flex items-center justify-between border ${
                  Math.abs(totalCalculatedWeight - 100) < 0.01
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                }`}
              >
                <span>Calculated Total Weight:</span>
                <span className="font-bold">{totalCalculatedWeight}% / 100%</span>
              </div>

              {/* Prerequisites Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-[#C9A24B]/15">
                <span className="text-xs font-semibold text-[#2A0F16] block">
                  Mandatory Prerequisites for Certificate Award
                </span>

                <div className="space-y-1.5">
                  <label className="min-h-[44px] flex items-center gap-2.5 text-xs text-[#2A0F16]/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiresAssignmentCompletion}
                      onChange={(e) => setRequiresAssignmentCompletion(e.target.checked)}
                      className="w-4 h-4 rounded text-[#6D1A2B]"
                    />
                    <span>Require completion of all published assignments</span>
                  </label>

                  <label className="min-h-[44px] flex items-center gap-2.5 text-xs text-[#2A0F16]/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiresQuizPass}
                      onChange={(e) => setRequiresQuizPass(e.target.checked)}
                      className="w-4 h-4 rounded text-[#6D1A2B]"
                    />
                    <span>Require passing score on all objective examinations</span>
                  </label>

                  <label className="min-h-[44px] flex items-center gap-2.5 text-xs text-[#2A0F16]/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiresProjectApproval}
                      onChange={(e) => setRequiresProjectApproval(e.target.checked)}
                      className="w-4 h-4 rounded text-[#6D1A2B]"
                    />
                    <span>Require verified trainer approval on practical project milestones</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-[#C9A24B]/20">
                <button
                  type="button"
                  onClick={() => setSelectedCourse(null)}
                  className="min-h-[44px] px-4 py-2 border rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-50 flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || Math.abs(totalCalculatedWeight - 100) > 0.01}
                  className="min-h-[44px] px-5 py-2 bg-[#6D1A2B] text-white text-xs font-semibold rounded-xl shadow-xs disabled:opacity-50 flex items-center justify-center hover:bg-[#4E0F1E] transition"
                >
                  {saving ? "Activating..." : "Save Policy Version"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
