"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  Layers,
  Plus,
  Clock,
  CheckCircle2,
  ExternalLink,
  Award,
  X,
} from "lucide-react";

export default function TrainerProjectsPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Project Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [maxMarks, setMaxMarks] = useState(100);
  const [milestones, setMilestones] = useState<{ title: string; weightPercentage: number }[]>([
    { title: "Milestone 1: Architecture & API Schema", weightPercentage: 30 },
    { title: "Milestone 2: Core Business Workflows", weightPercentage: 40 },
    { title: "Milestone 3: Automated Tests & Deployment", weightPercentage: 30 },
  ]);
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
        fetchProjects(data.batches[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async (bId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/trainer/projects?batchId=${bId}`);
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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const batch = batches.find((b) => b.id === selectedBatchId);
    if (!batch || !title || !deadline) return;

    try {
      setSaving(true);
      const res = await fetch("/api/trainer/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: batch.courseId,
          batchId: selectedBatchId,
          title,
          description,
          deadline,
          maxMarks: Number(maxMarks),
          milestones,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowCreateModal(false);
      setTitle("");
      setDescription("");
      fetchProjects(selectedBatchId);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

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
              Capstone Curriculum
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif text-[#2A0F16] font-bold mt-0.5">
              Practical Projects & Labs
            </h1>
            <p className="text-xs sm:text-sm text-[#2A0F16]/70 mt-1">
              Assign hands-on capstones, configure phased milestone deadlines, and evaluate student submissions.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#6D1A2B] text-white text-xs font-semibold rounded-xl hover:bg-[#4E0F1E] transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Project</span>
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
                fetchProjects(e.target.value);
              }}
              className="w-full sm:w-auto max-w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 p-2.5 rounded-lg border border-[#C9A24B]/30 bg-[#FFFBF5] font-medium text-[#2A0F16] shadow-xs"
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
          Loading assigned projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-[#C9A24B]/20 space-y-3">
          <Layers className="w-12 h-12 text-[#C9A24B] mx-auto opacity-60" />
          <h3 className="text-lg font-serif font-bold text-[#2A0F16]">No Projects Created</h3>
          <p className="text-sm text-[#2A0F16]/70 max-w-md mx-auto">
            Click "Create Project" above to launch a practical assignment for this batch.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-[#C9A24B]/25 p-6 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between text-xs text-[#2A0F16]/60">
                <span className="font-semibold text-[#6D1A2B]">{p.batch?.code}</span>
                <span>Deadline: {new Date(p.deadline).toLocaleDateString()}</span>
              </div>
              <h3 className="font-serif font-bold text-lg text-[#2A0F16]">{p.title}</h3>
              <p className="text-xs text-[#2A0F16]/70 line-clamp-2">{p.description}</p>

              <div className="space-y-2 pt-2 border-t border-[#C9A24B]/15">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6D1A2B] block">
                  Configured Milestones ({p.milestones.length})
                </span>
                <div className="space-y-1">
                  {p.milestones.map((m: any) => (
                    <div
                      key={m.id}
                      className="p-2 rounded bg-[#FFFBF5] text-xs text-[#2A0F16] flex justify-between"
                    >
                      <span>{m.title}</span>
                      <span className="font-semibold">{m.weightPercentage}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 text-xs text-[#2A0F16]/60 flex justify-between">
                <span>Max Marks: {p.maxMarks}</span>
                <span className="font-semibold text-[#6D1A2B]">
                  {p.submissions.length} Submissions Received
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-[#C9A24B]/30 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#C9A24B]/20 pb-3">
              <h3 className="font-serif font-bold text-base text-[#2A0F16]">
                Create Practical Project
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded text-[#2A0F16]/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Capstone: Distributed Microservices Engine"
                  className="w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 p-2.5 rounded-lg border border-[#C9A24B]/30"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                  Description & Specifications
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed functional requirements..."
                  className="w-full text-base sm:text-xs p-2.5 rounded-lg border border-[#C9A24B]/30"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#2A0F16] mb-1">
                    Final Deadline
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 p-2.5 rounded-lg border border-[#C9A24B]/30"
                    required
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
                    className="w-full text-base sm:text-xs min-h-[44px] sm:min-h-0 p-2.5 rounded-lg border border-[#C9A24B]/30"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-[#C9A24B]/20">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2 border rounded-xl text-xs font-medium hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2 bg-[#6D1A2B] hover:bg-[#4E0F1E] text-white text-xs font-semibold rounded-xl shadow-sm"
                >
                  {saving ? "Publishing..." : "Assign Project"}
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
