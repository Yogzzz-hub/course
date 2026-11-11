import React, { useState } from "react";
import { Send } from "lucide-react";
import type { TrainerAnnouncement, TrainerBatch } from "../../data/trainerMock";

export function AnnouncementsView({
  announcements,
  batches,
  onPublishAnnouncement,
}: {
  announcements: TrainerAnnouncement[];
  batches: TrainerBatch[];
  onPublishAnnouncement: (newAnn: TrainerAnnouncement) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [batchCode, setBatchCode] = useState(batches[0]?.code || "BATCH-PY-2026-A");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    // TODO: Connect to backend API: POST /api/trainer/announcements to notify cohort
    const newAnn: TrainerAnnouncement = {
      id: `TANN-${Date.now().toString().slice(-4)}`,
      title: title.trim(),
      body: body.trim(),
      batchCode,
      createdAt: "Today",
    };

    onPublishAnnouncement(newAnn);
    setTitle("");
    setBody("");
  };

  return (
    <div className="space-y-4">
      {/* Faculty Notice Composer - NO headings or subheadings */}
      <div
        className="p-4 rounded-xl border shadow-2xs space-y-3"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2 space-y-1">
              <label className="font-semibold block text-[11px]" style={{ color: "var(--text)" }}>
                Notice Title
              </label>
              <input
                type="text"
                placeholder="e.g. Lab environment setup instructions..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 rounded-lg border outline-none text-xs"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold block text-[11px]" style={{ color: "var(--text)" }}>
                Cohort
              </label>
              <select
                value={batchCode}
                onChange={(e) => setBatchCode(e.target.value)}
                className="w-full p-2 rounded-lg border outline-none text-xs cursor-pointer"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              >
                {batches.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.code} ({b.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold block text-[11px]" style={{ color: "var(--text)" }}>
              Message
            </label>
            <textarea
              rows={2}
              placeholder="Write announcement details..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-2 rounded-lg border outline-none resize-none text-xs"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
            />
          </div>

          <div className="flex justify-end pt-0.5">
            <button
              type="submit"
              disabled={!title.trim() || !body.trim()}
              className="px-3.5 py-1.5 rounded-lg font-semibold text-xs shadow-2xs hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--accent-contrast)",
              }}
            >
              <Send size={12} />
              <span>Post to Cohort</span>
            </button>
          </div>
        </form>
      </div>

      {/* Announcements Feed */}
      <div className="space-y-2">
        {announcements.map((ann) => (
          <div
            key={ann.id}
            className="p-3.5 rounded-xl border shadow-2xs space-y-1.5"
            style={{
              backgroundColor: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs" style={{ color: "var(--text)" }}>
                {ann.title}
              </span>
              <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                {ann.createdAt}
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
              {ann.body}
            </p>
            <div className="pt-0.5 text-[10px] text-stone-500">
              Posted to: <strong className="font-mono text-stone-700">{ann.batchCode}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

