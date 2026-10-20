"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Award,
  Users,
} from "lucide-react";

export default function TrainerAssignmentsPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Assignment Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [maxMarks, setMaxMarks] = useState(100);
  const [criteria, setCriteria] = useState<{ title: string; maxMarks: number }[]>([
    { title: "Technical Correctness", maxMarks: 50 },
    { title: "Code Quality & Documentation", maxMarks: 50 },
  ]);

  // Submissions Drawer & Grading
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [gradingSubmission, setGradingSubmission] = useState<any | null>(null);
  const [marksAwarded, setMarksAwarded] = useState(85);
  const [feedback, setFeedback] = useState("");
  const [reasonForRevision, setReasonForRevision] = useState("");
  const [savingGrade, setSavingGrade] = useState(false);

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
        fetchAssignments(data.batches[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async (bId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/trainer/assignments?batchId=${bId}`);
      const data = await res.json();
      if (data.success) {
        setAssignments(data.assignments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubmissions = async (assignmentId: string) => {
    try {
      const res = await fetch(`/api/trainer/assignments/${assignmentId}/submissions`);
      const data = await res.json();
      if (data.success) {
        setSelectedAssignment(data.assignment);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const batch = batches.find((b) => b.id === selectedBatchId);
    if (!batch || !title || !dueDate) return;

    try {
      const res = await fetch("/api/trainer/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: batch.courseId,
          batchId: selectedBatchId,
          title,
          description,
          dueDate,
          maxMarks: Number(maxMarks),
          rubricCriteria: criteria,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowCreateModal(false);
      setTitle("");
      setDescription("");
      fetchAssignments(selectedBatchId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;

    try {
      setSavingGrade(true);
      const res = await fetch(`/api/trainer/submissions/${gradingSubmission.id}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marksAwarded: Number(marksAwarded),
          feedback,
          reasonForRevision: reasonForRevision || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setGradingSubmission(null);
      if (selectedAssignment) {
        handleOpenSubmissions(selectedAssignment.id);
      }
      fetchAssignments(selectedBatchId);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingGrade(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#C9A24B]/20 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-[#2A0F16] font-bold">
            Assignment & Rubric Evaluations
          </h1>
          <p className="text-xs sm:text-sm text-[#2A0F16]/70 mt-1">
            Publish batch assignments with custom grading rubrics, evaluate student submissions, and record audited revisions.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#6D1A2B] text-white text-xs font-semibold rounded-lg hover:bg-[#4E0F1E] transition-all shadow-sm min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          Create Assignment
        </button>
      </div>

      {/* Batch Filter */}
      {batches.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-[#C9A24B]/20 shadow-xs">
          <span className="text-xs font-semibold text-[#2A0F16] shrink-0">Select Batch:</span>
          <select
            value={selectedBatchId}
            onChange={(e) => {
              setSelectedBatchId(e.target.value);
              fetchAssignments(e.target.value);
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
          Loading batch assignments...
        </div>
      ) : assignments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-[#C9A24B]/20 space-y-3">
          <FileText className="w-12 h-12 text-[#C9A24B] mx-auto opacity-60" />
          <h3 className="text-lg font-serif font-bold text-[#2A0F16]">No Assignments Active</h3>
          <p className="text-sm text-[#2A0F16]/70 max-w-md mx-auto">
            Click "Create Assignment" above to assign coursework to this batch.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-2xl border border-[#C9A24B]/20 p-5 shadow-xs flex flex-col justify-between space-y-4 card-hover hover:border-[#6D1A2B]/40 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#2A0F16]/60">
                  <span className="font-semibold text-[#6D1A2B]">{a.batch?.code}</span>
                  <span>Due: {new Date(a.dueDate).toLocaleDateString()}</span>
                </div>
                <h3 className="font-serif font-bold text-base text-[#2A0F16]">{a.title}</h3>
                <p className="text-xs text-[#2A0F16]/70 line-clamp-2">{a.description}</p>
                <div className="pt-2 text-xs text-[#2A0F16]/70 flex items-center justify-between">
                  <span>Max Marks: {a.maxMarks}</span>
                  <span className="font-semibold text-[#6D1A2B]">
                    {a._count?.submissions || 0} Submissions
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleOpenSubmissions(a.id)}
                className="w-full py-2.5 bg-[#FFFBF5] border border-[#C9A24B]/30 text-[#6D1A2B] text-xs font-semibold rounded-lg hover:bg-[#F6EBCF]/40 transition-colors min-h-[44px] flex items-center justify-center"
              >
                Review Submissions ({a._count?.submissions || 0})
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Submissions Drawer Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-[#C9A24B]/30 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#FFFBF5] p-4 sm:p-5 border-b border-[#C9A24B]/20 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-base sm:text-lg text-[#2A0F16]">
                  Submissions: {selectedAssignment.title}
                </h3>
                <span className="text-[11px] sm:text-xs text-[#2A0F16]/60">
                  Max Marks: {selectedAssignment.maxMarks} • Due:{" "}
                  {new Date(selectedAssignment.dueDate).toLocaleDateString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedAssignment(null)}
                className="p-1 rounded text-[#2A0F16]/60 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {selectedAssignment.submissions.length === 0 ? (
                <p className="text-center py-8 text-xs text-[#2A0F16]/60 italic">
                  No students have submitted work for this assignment yet.
                </p>
              ) : (
                <div className="divide-y divide-[#C9A24B]/10">
                  {selectedAssignment.submissions.map((sub: any) => {
                    const isGraded = sub.status === "GRADED";
                    return (
                      <div
                        key={sub.id}
                        className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-[#2A0F16]">
                              {sub.studentProfile.user.name}
                            </h4>
                            <span className="text-xs text-[#2A0F16]/50">
                              (Attempt #{sub.attemptNumber})
                            </span>
                            {sub.isLate && (
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700">
                                Late
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[#2A0F16]/60 block mt-0.5">
                            Submitted: {new Date(sub.submittedAt).toLocaleString()}
                          </span>

                          {sub.content && (
                            <p className="text-xs text-[#2A0F16]/80 mt-1 line-clamp-2 bg-[#FFFBF5] p-2 rounded">
                              {sub.content}
                            </p>
                          )}
                          {sub.externalLink && (
                            <a
                              href={sub.externalLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-[#6D1A2B] underline flex items-center gap-1 mt-1 min-h-[36px]"
                            >
                              <ExternalLink className="w-3 h-3" /> Project Repository / Artifact
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
                          {isGraded ? (
                            <div className="text-left sm:text-right">
                              <span className="text-xs font-bold text-emerald-700 font-serif block">
                                {sub.grade.marksAwarded} / {selectedAssignment.maxMarks}
                              </span>
                              <button
                                onClick={() => {
                                  setGradingSubmission(sub);
                                  setMarksAwarded(sub.grade.marksAwarded);
                                  setFeedback(sub.grade.feedback || "");
                                  setReasonForRevision("");
                                }}
                                className="text-[11px] text-[#6D1A2B] underline min-h-[44px] flex items-center"
                              >
                                Revise Grade
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setGradingSubmission(sub);
                                setMarksAwarded(selectedAssignment.maxMarks * 0.85);
                                setFeedback("");
                                setReasonForRevision("");
                              }}
                              className="px-4 py-2 bg-[#6D1A2B] text-white text-xs font-semibold rounded-lg hover:bg-[#4E0F1E] min-h-[44px] flex items-center justify-center"
                            >
                              Grade Work
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grade Submission Modal */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#C9A24B]/30 shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#C9A24B]/20 pb-3">
              <h3 className="font-serif font-bold text-base text-[#2A0F16]">
                Evaluate: {gradingSubmission.studentProfile.user.name}
              </h3>
              <button
                onClick={() => setGradingSubmission(null)}
                className="p-1 rounded text-[#2A0F16]/60 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveGrade} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  Marks Awarded (Max: {selectedAssignment?.maxMarks})
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={marksAwarded}
                  onChange={(e) => setMarksAwarded(Number(e.target.value))}
                  max={selectedAssignment?.maxMarks}
                  min={0}
                  className="w-full text-base sm:text-xs p-3 sm:p-2.5 rounded-lg border border-[#C9A24B]/30 min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  Student Feedback
                </label>
                <textarea
                  rows={3}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Constructive review points on technical accuracy and code quality..."
                  className="w-full text-base sm:text-xs p-3 sm:p-2.5 rounded-lg border border-[#C9A24B]/30"
                />
              </div>

              {gradingSubmission.grade && (
                <div>
                  <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                    Reason for Grade Revision (Audited)
                  </label>
                  <input
                    type="text"
                    value={reasonForRevision}
                    onChange={(e) => setReasonForRevision(e.target.value)}
                    placeholder="e.g. Re-evaluated unit tests after student clarification"
                    className="w-full text-base sm:text-xs p-3 sm:p-2.5 rounded-lg border border-[#C9A24B]/30 min-h-[44px]"
                    required
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  className="px-4 py-2.5 border rounded-lg text-xs min-h-[44px] flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGrade}
                  className="px-5 py-2.5 bg-[#6D1A2B] text-white text-xs font-semibold rounded-lg shadow-sm min-h-[44px] flex items-center justify-center"
                >
                  {savingGrade ? "Recording..." : "Save & Publish Grade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
