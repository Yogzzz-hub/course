"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  ExternalLink,
  ChevronRight,
  X,
  Award,
} from "lucide-react";

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingAssignment, setSubmittingAssignment] = useState<any | null>(null);

  // Form state
  const [content, setContent] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/assignments");
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

  const handleOpenSubmit = (assignment: any) => {
    setSubmittingAssignment(assignment);
    setContent("");
    setExternalLink("");
    setAttachmentUrl("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignment) return;

    try {
      setSubmitting(true);
      setErrorMsg("");
      const res = await fetch(`/api/student/assignments/${submittingAssignment.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, externalLink, attachmentUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit assignment");
      }
      setSuccessMsg("Assignment submitted successfully!");
      setTimeout(() => {
        setSubmittingAssignment(null);
        fetchAssignments();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-[#C9A24B]/20 pb-6">
        <h1 className="text-3xl font-serif text-[#2A0F16] font-bold">
          Assignments & Evaluations
        </h1>
        <p className="text-sm text-[#2A0F16]/70 mt-1">
          Submit required course deliverables, review rubric evaluations, and inspect trainer feedback.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-[#2A0F16]/60 bg-white rounded-xl border border-[#C9A24B]/20 animate-pulse">
          Loading assigned deliverables...
        </div>
      ) : assignments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-[#C9A24B]/20 space-y-3">
          <FileText className="w-12 h-12 text-[#C9A24B] mx-auto opacity-60" />
          <h3 className="text-lg font-serif font-bold text-[#2A0F16]">No Assignments Active</h3>
          <p className="text-sm text-[#2A0F16]/70 max-w-md mx-auto">
            You do not have any published assignments requiring submission at this time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assignments.map((assignment) => {
            const isSubmitted = Boolean(assignment.latestSubmission);
            const isGraded = assignment.latestSubmission?.status === "GRADED";
            const dueDate = new Date(assignment.dueDate);
            const isOverdue = new Date() > dueDate && !isSubmitted;

            return (
              <div
                key={assignment.id}
                className="bg-white rounded-2xl border border-[#C9A24B]/20 p-6 shadow-xs flex flex-col justify-between space-y-5 card-hover hover:border-[#6D1A2B]/40 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2.5 py-0.5 rounded bg-[#F6EBCF] text-[#6D1A2B] font-semibold">
                      {assignment.course.title}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        isGraded
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : isSubmitted
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : isOverdue
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {isGraded
                        ? "Graded"
                        : isSubmitted
                        ? "Submitted (Under Review)"
                        : isOverdue
                        ? "Overdue"
                        : "Pending Submission"}
                    </span>
                  </div>

                  <h3 className="text-xl font-serif font-bold text-[#2A0F16]">
                    {assignment.title}
                  </h3>
                  <p className="text-xs text-[#2A0F16]/70 line-clamp-2 leading-relaxed">
                    {assignment.description}
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-[#2A0F16]/70 border-t border-[#C9A24B]/10">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#C9A24B]" />
                      <span>Due: {dueDate.toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-[#C9A24B]" />
                      <span>Max Marks: {assignment.maxMarks}</span>
                    </div>
                  </div>

                  {/* If Graded, Show Grade & Feedback */}
                  {isGraded && assignment.latestSubmission?.grade && (
                    <div className="p-3.5 rounded-xl bg-[#FFFBF5] border border-emerald-200/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#2A0F16]">Awarded Score</span>
                        <span className="text-sm font-bold text-emerald-700 font-serif">
                          {assignment.latestSubmission.grade.marksAwarded} /{" "}
                          {assignment.latestSubmission.grade.maxMarks}
                        </span>
                      </div>
                      {assignment.latestSubmission.grade.feedback && (
                        <p className="text-xs text-[#2A0F16]/80 italic">
                          "{assignment.latestSubmission.grade.feedback}"
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#C9A24B]/15 flex items-center justify-between">
                  <span className="text-xs text-[#2A0F16]/60">
                    Attempts: {assignment.submissionCount} of {assignment.maxAttempts}
                  </span>

                  {(!isSubmitted || assignment.submissionCount < assignment.maxAttempts) && (
                    <button
                      onClick={() => handleOpenSubmit(assignment)}
                      className="px-4 py-2 bg-[#6D1A2B] text-white text-xs font-semibold rounded-lg hover:bg-[#4E0F1E] transition-all shadow-sm"
                    >
                      {isSubmitted ? "Resubmit Attempt" : "Submit Work"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submission Modal */}
      {submittingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#C9A24B]/30 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#C9A24B]/20 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#2A0F16]">
                  Submit: {submittingAssignment.title}
                </h3>
                <p className="text-xs text-[#2A0F16]/60 mt-0.5">
                  Allowed: {submittingAssignment.allowedSubmissionTypes}
                </p>
              </div>
              <button
                onClick={() => setSubmittingAssignment(null)}
                className="p-1 rounded-lg text-[#2A0F16]/60 hover:bg-[#F6EBCF]/40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs border border-emerald-200">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  Written Answer / Submission Notes
                </label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste your code, summary, or written text answer here..."
                  className="w-full text-base sm:text-xs p-3 rounded-lg border border-[#C9A24B]/30 focus:outline-hidden focus:border-[#6D1A2B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  Project Repository / Document URL
                </label>
                <input
                  type="url"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  placeholder="https://github.com/... or Google Docs link"
                  className="w-full text-base sm:text-xs p-3 sm:p-2.5 rounded-lg border border-[#C9A24B]/30 focus:outline-hidden focus:border-[#6D1A2B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  Attachment / Artifact Storage URL
                </label>
                <input
                  type="text"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="Link to file in academy cloud or permitted drive"
                  className="w-full text-base sm:text-xs p-3 sm:p-2.5 rounded-lg border border-[#C9A24B]/30 focus:outline-hidden focus:border-[#6D1A2B]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#C9A24B]/20">
                <button
                  type="button"
                  onClick={() => setSubmittingAssignment(null)}
                  className="px-4 py-2.5 border border-[#C9A24B]/30 rounded-lg text-xs font-medium text-[#2A0F16] hover:bg-[#FFFBF5] min-h-[44px] flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#6D1A2B] text-white text-xs font-semibold rounded-lg hover:bg-[#4E0F1E] transition-all shadow-sm disabled:opacity-50 min-h-[44px] flex items-center justify-center"
                >
                  {submitting ? "Uploading..." : "Confirm & Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
