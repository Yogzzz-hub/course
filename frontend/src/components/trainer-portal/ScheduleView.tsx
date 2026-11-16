import React from "react";
import { Video, Calendar, Clock } from "lucide-react";
import type { TrainerScheduleItem } from "./types";
import { ResponsiveTable } from "../manager-portal/ResponsiveTable";

export function ScheduleView({ schedule }: { schedule: TrainerScheduleItem[] }) {
  return (
    <div className="space-y-3">
      {/* Schedule Table - NO headings or subheadings */}
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
                <th className="py-2.5 px-3.5">Cohort & Code</th>
                <th className="py-2.5 px-3.5">Topic</th>
                <th className="py-2.5 px-3.5">Date & Time</th>
                <th className="py-2.5 px-3.5">Duration</th>
                <th className="py-2.5 px-3.5 text-right">Classroom</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {schedule.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-black/2 dark:hover:bg-white/2 transition-colors"
                >
                  <td className="py-2.5 px-3.5">
                    <span className="font-mono text-[10px] font-semibold block" style={{ color: "var(--accent)" }}>
                      {item.batchCode}
                    </span>
                    <span className="font-medium text-xs" style={{ color: "var(--text)" }}>
                      {item.batchName}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 font-medium" style={{ color: "var(--text)" }}>
                    {item.topic}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <div className="font-medium">{item.date}</div>
                    <div className="text-[10px] text-stone-500">{item.time}</div>
                  </td>
                  <td className="py-2.5 px-3.5 text-stone-600">
                    {item.duration}
                  </td>
                  <td className="py-2.5 px-3.5 text-right">
                    <a
                      href={item.roomLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-opacity shadow-2xs hover:opacity-90 min-h-[44px] md:min-h-0"
                      style={{
                        backgroundColor: "var(--accent)",
                        color: "var(--accent-contrast)",
                      }}
                    >
                      <Video size={12} />
                      <span>Join Live</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </ResponsiveTable>
        </div>
      </div>
    </div>
  );
}

