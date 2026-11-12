"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Clock,
  CheckCircle2,
  ExternalLink,
  Github,
  Award,
  UploadCloud,
  X,
} from "lucide-react";

export default function StudentProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Submit milestone state
  const [selectedMilestone, setSelectedMilestone] = useState<any | null>(null);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/projects");
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubmit = (project: any, milestone: any) => {
    setSelectedProject(project);
    setSelectedMilestone(milestone);
    setRepoUrl("");
    setDemoUrl("");
    setNotes("");
    setMsg("");
  };

  const handleSubmitMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      setSubmitting(true);
      setMsg("");
      const res = await fetch("/api/student/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject.id,
          milestoneId: selectedMilestone?.id,
          repoUrl,
          demoUrl,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMsg("Milestone submitted successfully!");
      setTimeout(() => {
        setSelectedMilestone(null);
        setSelectedProject(null);
        fetchProjects();
      }, 1200);
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-[#C9A24B]/20 pb-6">
        <h1 className="text-3xl font-serif text-[#2A0F16] font-bold">
          Practical Projects & Hands-On Labs
        </h1>
        <p className="text-sm text-[#2A0F16]/70 mt-1">
          Deliver milestone codebases, share deployed live demos, and track trainer milestone evaluations.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-[#2A0F16]/60 bg-white rounded-xl border border-[#C9A24B]/20 animate-pulse">
          Loading practical lab projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-[#C9A24B]/20 space-y-3">
          <Layers className="w-12 h-12 text-[#C9A24B] mx-auto opacity-60" />
          <h3 className="text-lg font-serif font-bold text-[#2A0F16]">No Assigned Projects</h3>
          <p className="text-sm text-[#2A0F16]/70 max-w-md mx-auto">
            You do not have any active hands-on lab or capstone project assignments.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {projects.map((proj) => {
            const deadline = new Date(proj.deadline);

            return (
              <div
                key={proj.id}
                className="bg-white rounded-2xl border border-[#C9A24B]/25 p-6 shadow-xs space-y-6 card-hover hover:border-[#6D1A2B]/40 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#C9A24B]/15 pb-4">
                  <div>
                    <div className="flex items-center gap-2.5 text-xs text-[#2A0F16]/60 mb-1">
                      <span className="px-2.5 py-0.5 rounded bg-[#F6EBCF] text-[#6D1A2B] font-semibold">
                        {proj.course.title}
                      </span>
                      <span>• Batch: {proj.batch?.code}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#C9A24B]" />
                        Deadline: {deadline.toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-xl font-serif font-bold text-[#2A0F16]">{proj.title}</h3>
                    <p className="text-sm text-[#2A0F16]/75 mt-1 leading-relaxed">
                      {proj.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-[#2A0F16]/60 block">Max Practical Marks</span>
                    <span className="text-2xl font-serif font-bold text-[#6D1A2B]">
                      {proj.maxMarks}
                    </span>
                  </div>
                </div>

                {/* Milestones Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#6D1A2B]">
                    Project Milestones & Deliverables
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {proj.milestones.map((m: any, mIdx: number) => {
                      const submission = proj.submissions.find((s: any) => s.milestoneId === m.id);
                      const isApproved = submission?.status === "APPROVED";

                      return (
                        <div
                          key={m.id}
                          className="p-4 rounded-xl border border-[#C9A24B]/20 bg-[#FFFBF5]/60 flex flex-col justify-between space-y-3"
                        >
                          <div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-[#2A0F16]">
                                Milestone {mIdx + 1}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-[#F6EBCF] text-[#6D1A2B] font-medium">
                                Weight: {m.weightPercentage}%
                              </span>
                            </div>
                            <h5 className="font-serif font-bold text-sm text-[#2A0F16] mt-1">
                              {m.title}
                            </h5>
                            {m.description && (
                              <p className="text-xs text-[#2A0F16]/70 mt-1">{m.description}</p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-[#C9A24B]/15">
                            {submission ? (
                              <div className="space-y-1.5">
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Submitted ({submission.status})
                                </span>
                                {submission.repoUrl && (
                                  <a
                                    href={submission.repoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-[#6D1A2B] flex items-center gap-1 underline"
                                  >
                                    <Github className="w-3 h-3" /> View Repo
                                  </a>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenSubmit(proj, m)}
                                className="w-full py-1.5 px-3 bg-[#6D1A2B] text-white text-xs font-medium rounded-lg hover:bg-[#4E0F1E] transition-all"
                              >
                                Submit Milestone
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Milestone Modal */}
      {selectedMilestone && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#C9A24B]/30 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#C9A24B]/20 pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-[#2A0F16]">
                  Submit Milestone: {selectedMilestone.title}
                </h3>
                <span className="text-xs text-[#2A0F16]/60">{selectedProject.title}</span>
              </div>
              <button
                onClick={() => {
                  setSelectedMilestone(null);
                  setSelectedProject(null);
                }}
                className="p-1 rounded-lg text-[#2A0F16]/60 hover:bg-[#F6EBCF]/40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {msg && (
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs border border-emerald-200">
                {msg}
              </div>
            )}

            <form onSubmit={handleSubmitMilestone} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  Code Repository URL (GitHub / GitLab)
                </label>
                <input
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/project"
                  className="w-full text-base sm:text-xs p-3 sm:p-2.5 rounded-lg border border-[#C9A24B]/30 min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  Live Demo / Deployment URL (Optional)
                </label>
                <input
                  type="url"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  placeholder="https://my-app.vercel.app"
                  className="w-full text-base sm:text-xs p-3 sm:p-2.5 rounded-lg border border-[#C9A24B]/30 min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  Milestone Submission Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Summary of completed features, testing performed, or known blockers..."
                  className="w-full text-base sm:text-xs p-3 rounded-lg border border-[#C9A24B]/30"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#C9A24B]/20">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMilestone(null);
                    setSelectedProject(null);
                  }}
                  className="px-4 py-2.5 border border-[#C9A24B]/30 rounded-lg text-xs font-medium text-[#2A0F16] hover:bg-stone-50 min-h-[44px] flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#6D1A2B] text-white text-xs font-semibold rounded-lg hover:bg-[#4E0F1E] shadow-sm disabled:opacity-50 min-h-[44px] flex items-center justify-center"
                >
                  {submitting ? "Submitting..." : "Upload Milestone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
