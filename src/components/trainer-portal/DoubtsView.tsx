import React from "react";
import { HelpCircle, Video, CheckCircle2, Clock } from "lucide-react";
import type { DoubtSession } from "../../data/trainerMock";
import { ResponsiveTable } from "../manager-portal/ResponsiveTable";

export function DoubtsView({
  doubts,
  onAcceptDoubt,
}: {
  doubts: DoubtSession[];
  onAcceptDoubt: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Doubt Sessions Table - NO headings or subheadings */}
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
                <th className="py-2.5 px-3.5">Student & Cohort</th>
                <th className="py-2.5 px-3.5">Topic & Query</th>
                <th className="py-2.5 px-3.5">Urgency</th>
                <th className="py-2.5 px-3.5">Requested</th>
                <th className="py-2.5 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {doubts.map((d) => (
                <tr
                  key={d.id}
                  className="hover:bg-black/2 dark:hover:bg-white/2 transition-colors"
                >
                  <td className="py-2.5 px-3.5">
                    <span className="font-semibold text-xs" style={{ color: "var(--text)" }}>
                      {d.studentName}
                    </span>
                    <p className="text-[10px] font-mono text-stone-500">{d.batchCode}</p>
                  </td>
                  <td className="py-2.5 px-3.5 font-medium max-w-sm" style={{ color: "var(--text)" }}>
                    {d.topic}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <span
                      className="text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)",
                        color: "var(--accent)",
                      }}
                    >
                      {d.urgency}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 text-stone-500" style={{ color: "var(--muted)" }}>
                    {d.requestedAt}
                  </td>
                  <td className="py-2.5 px-3.5 text-right">
                    {d.status === "WAITING" ? (
                      <button
                        type="button"
                        onClick={() => onAcceptDoubt(d.id)}
                        className="px-3 py-1.5 rounded-lg font-semibold text-[11px] shadow-2xs hover:opacity-90 cursor-pointer min-h-[44px] md:min-h-0 inline-flex items-center justify-center"
                        style={{
                          backgroundColor: "var(--accent)",
                          color: "var(--accent-contrast)",
                        }}
                      >
                        Accept & Schedule
                      </button>
                    ) : (
                      <a
                        href="https://meet.aintrix.edu/doubt-room"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold shadow-2xs hover:opacity-90 cursor-pointer min-h-[44px] md:min-h-0"
                        style={{
                          backgroundColor: "var(--accent)",
                          color: "var(--accent-contrast)",
                        }}
                      >
                        <Video size={11} />
                        <span>Join Call</span>
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {doubts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs" style={{ color: "var(--muted)" }}>
                    No pending student doubts.
                  </td>
                </tr>
              )}
            </tbody>
          </ResponsiveTable>
        </div>
      </div>
    </div>
  );
}

