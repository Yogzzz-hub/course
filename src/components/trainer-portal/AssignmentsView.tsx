import React, { useState } from "react";
import { CheckCircle2, FileText, ExternalLink, Award } from "lucide-react";
import type { TrainerAssignmentSubmission } from "../../data/trainerMock";
import { Drawer } from "../manager-portal/Drawer";
import { ResponsiveTable } from "../manager-portal/ResponsiveTable";

export function AssignmentsView({
  submissions,
  onGradeSubmission,
}: {
  submissions: TrainerAssignmentSubmission[];
  onGradeSubmission: (id: string, score: number, feedback: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"TO_REVIEW" | "GRADED">("TO_REVIEW");
  const [selectedSubmission, setSelectedSubmission] = useState<TrainerAssignmentSubmission | null>(null);
  const [scoreInput, setScoreInput] = useState<number>(85);
  const [feedbackInput, setFeedbackInput] = useState<string>("");

  const pendingList = submissions.filter((s) => s.status === "PENDING_REVIEW");
  const gradedList = submissions.filter((s) => s.status === "GRADED");
  const displayList = activeTab === "TO_REVIEW" ? pendingList : gradedList;

  const handleOpenReview = (sub: TrainerAssignmentSubmission) => {
    setSelectedSubmission(sub);
    setScoreInput(sub.score ?? 85);
    setFeedbackInput(sub.feedback ?? "");
  };

  const handleSaveGrade = () => {
    if (!selectedSubmission) return;
    // TODO: Connect to backend API: POST /api/trainer/submissions/[id]/grade to persist score and notify student
    onGradeSubmission(selectedSubmission.id, scoreInput, feedbackInput);
    setSelectedSubmission(null);
  };

  return (
    <div className="space-y-3">
      {/* Two tabs: To review vs Graded - NO headings or subheadings */}
      <div className="flex items-center gap-1.5 border-b pb-2 overflow-x-auto" style={{ borderColor: "var(--border)" }}>
        <button
          type="button"
          onClick={() => setActiveTab("TO_REVIEW")}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors min-h-[44px]"
          style={{
            backgroundColor: activeTab === "TO_REVIEW" ? "var(--accent)" : "transparent",
            color: activeTab === "TO_REVIEW" ? "var(--accent-contrast)" : "var(--muted)",
          }}
        >
          <span>To Review</span>
          <span
            className="text-[10px] px-1.5 py-0.2 rounded-full"
            style={{
              backgroundColor: activeTab === "TO_REVIEW" ? "rgba(255,255,255,0.2)" : "var(--bg-secondary)",
            }}
          >
            {pendingList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("GRADED")}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors min-h-[44px]"
          style={{
            backgroundColor: activeTab === "GRADED" ? "var(--accent)" : "transparent",
            color: activeTab === "GRADED" ? "var(--accent-contrast)" : "var(--muted)",
          }}
        >
          <span>Graded</span>
          <span
            className="text-[10px] px-1.5 py-0.2 rounded-full"
            style={{
              backgroundColor: activeTab === "GRADED" ? "rgba(255,255,255,0.2)" : "var(--bg-secondary)",
            }}
          >
            {gradedList.length}
          </span>
        </button>
      </div>

      {/* Submissions Table */}
      <div
        className="rounded-xl border overflow-hidden shadow-2xs"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="overflow-x-auto">
          <ResponsiveTable className="w-full text-left border-collapse text-xs">
            <thead>
              <tr
                className="border-b"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                  color: "var(--muted)",
                  fontWeight: 600,
                  fontSize: "11px",
                }}
              >
                <th className="py-2.5 px-3.5">Student</th>
                <th className="py-2.5 px-3.5">Assignment Deliverable</th>
                <th className="py-2.5 px-3.5">Cohort</th>
                <th className="py-2.5 px-3.5">Submitted</th>
                {activeTab === "GRADED" && <th className="py-2.5 px-3.5">Score</th>}
                <th className="py-2.5 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {displayList.map((sub) => (
                <tr
                  key={sub.id}
                  className="hover:bg-black/2 dark:hover:bg-white/2 transition-colors"
                >
                  <td className="py-2.5 px-3.5">
                    <span className="font-semibold text-xs" style={{ color: "var(--text)" }}>
                      {sub.studentName}
                    </span>
                    <p className="text-[10px] text-stone-500">{sub.studentEmail}</p>
                  </td>
                  <td className="py-2.5 px-3.5 font-medium" style={{ color: "var(--text)" }}>
                    {sub.assignmentTitle}
                  </td>
                  <td className="py-2.5 px-3.5 font-mono text-[11px]" style={{ color: "var(--muted)" }}>
                    {sub.batchCode}
                  </td>
                  <td className="py-2.5 px-3.5 text-stone-500">
                    {sub.submittedAt}
                  </td>
                  {activeTab === "GRADED" && (
                    <td className="py-2.5 px-3.5 font-semibold" style={{ color: "var(--accent)" }}>
                      {sub.score} / {sub.maxScore}
                    </td>
                  )}
                  <td className="py-2.5 px-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenReview(sub)}
                      className="px-2.5 py-1.5 rounded border text-[11px] font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer min-h-[44px] md:min-h-0 inline-flex items-center justify-center"
                      style={{
                        borderColor: "var(--border)",
                        color: "var(--text)",
                      }}
                    >
                      {activeTab === "TO_REVIEW" ? "Review & Grade" : "Edit Grade"}
                    </button>
                  </td>
                </tr>
              ))}
              {displayList.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs" style={{ color: "var(--muted)" }}>
                    No submissions in this category.
                  </td>
                </tr>
              )}
            </tbody>
          </ResponsiveTable>
        </div>
      </div>

      {/* Review & Grade Drawer */}
      <Drawer
        isOpen={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
        title={selectedSubmission?.assignmentTitle || "Evaluate Assignment"}
        subtitle={`Student: ${selectedSubmission?.studentName} • ${selectedSubmission?.batchCode}`}
      >
        {selectedSubmission && (
          <div className="space-y-4 text-xs">
            <div
              className="p-3 rounded-lg border space-y-1.5"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex justify-between">
                <span className="text-stone-500">Candidate</span>
                <span className="font-semibold">{selectedSubmission.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Submitted</span>
                <span>{selectedSubmission.submittedAt}</span>
              </div>
              {selectedSubmission.fileUrl && (
                <div className="flex justify-between items-center pt-1">
                  <span className="text-stone-500">Project Code Repository</span>
                  <a
                    href={selectedSubmission.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold flex items-center gap-1 underline"
                    style={{ color: "var(--accent)" }}
                  >
                    <span>Inspect Code</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold block text-xs" style={{ color: "var(--text)" }}>
                Score (out of {selectedSubmission.maxScore})
              </label>
              <input
                type="number"
                min={0}
                max={selectedSubmission.maxScore}
                value={scoreInput}
                onChange={(e) => setScoreInput(Number(e.target.value))}
                className="w-full p-2 rounded-lg border text-xs outline-none font-semibold"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold block text-xs" style={{ color: "var(--text)" }}>
                Faculty Feedback & Improvement Notes
              </label>
              <textarea
                rows={3}
                placeholder="Write constructive notes for the student..."
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                className="w-full p-2 rounded-lg border text-xs outline-none resize-none"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleSaveGrade}
              className="w-full py-2 rounded-lg font-semibold text-xs shadow-xs hover:opacity-90 cursor-pointer flex items-center justify-center gap-1.5"
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--accent-contrast)",
              }}
            >
              <Award size={14} />
              <span>Submit Grade & Feedback</span>
            </button>
          </div>
        )}
      </Drawer>
    </div>
  );
}

