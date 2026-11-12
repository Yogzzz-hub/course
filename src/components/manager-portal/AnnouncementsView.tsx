import React, { useState } from "react";
import { Send } from "lucide-react";
import type { Announcement } from "../../data/managerMock";

export function AnnouncementsView({
  announcements,
  onAddToast,
  onPublishAnnouncement,
}: {
  announcements: Announcement[];
  onAddToast: (toast: { type: "success" | "info" | "warning"; title: string; message: string }) => void;
  onPublishAnnouncement: (newAnn: Announcement) => void;
}) {
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState("All Active Batches");
  const [priority, setPriority] = useState<"NORMAL" | "URGENT">("NORMAL");
  const [body, setBody] = useState("");

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    // TODO: Connect to backend API: POST /api/notifications/announcement
    const newAnn: Announcement = {
      id: `ANN-${Date.now().toString().slice(-4)}`,
      title: title.trim(),
      body: body.trim(),
      author: "Operations Manager",
      audience,
      createdAt: "Today",
      priority,
    };

    onPublishAnnouncement(newAnn);
    setTitle("");
    setBody("");
    onAddToast({
      type: "success",
      title: "Broadcast Published",
      message: `Announcement "${newAnn.title}" pushed to ${audience}.`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Broadcast Composer - NO headings or subheadings */}
      <div
        className="p-4 rounded-xl border shadow-2xs space-y-3"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <form onSubmit={handleBroadcast} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2 space-y-1">
              <label className="font-semibold block text-[11px]" style={{ color: "var(--text)" }}>
                Headline
              </label>
              <input
                type="text"
                placeholder="Announcement title..."
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
                Target Audience
              </label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full p-2 rounded-lg border outline-none text-xs cursor-pointer"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              >
                <option value="All Active Batches">All Active Batches</option>
                <option value="BATCH-PY-2026-A">Python Cohort A Only</option>
                <option value="BATCH-REACT-2026-B">React Cohort B Only</option>
                <option value="BATCH-DSA-2026-C">DSA Cohort C Only</option>
                <option value="Faculty & Trainers">Faculty & Trainers Only</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold block text-[11px]" style={{ color: "var(--text)" }}>
              Message Body
            </label>
            <textarea
              rows={2}
              placeholder="Provide complete broadcast details..."
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

          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-1.5 font-medium text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={priority === "URGENT"}
                onChange={(e) => setPriority(e.target.checked ? "URGENT" : "NORMAL")}
                className="rounded"
              />
              <span style={{ color: priority === "URGENT" ? "var(--accent)" : "var(--muted)" }}>
                Flag as Urgent
              </span>
            </label>

            <button
              type="submit"
              disabled={!title.trim() || !body.trim()}
              className="px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-opacity shadow-2xs hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--accent-contrast)",
              }}
            >
              <Send size={12} />
              <span>Broadcast Now</span>
            </button>
          </div>
        </form>
      </div>

      {/* Announcements Feed */}
      <div className="space-y-2.5">
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
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs" style={{ color: "var(--text)" }}>
                    {ann.title}
                  </span>
                  {ann.priority === "URGENT" && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.2 rounded"
                      style={{
                        backgroundColor: "var(--accent)",
                        color: "var(--accent-contrast)",
                      }}
                    >
                      Urgent
                    </span>
                  )}
                </div>
                <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                  {ann.createdAt}
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                {ann.body}
              </p>
              <div className="pt-1 flex items-center justify-between text-[10px] text-stone-500" style={{ color: "var(--muted)" }}>
                <span>Audience: <strong style={{ color: "var(--text)" }}>{ann.audience}</strong></span>
                <span>By: {ann.author}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
