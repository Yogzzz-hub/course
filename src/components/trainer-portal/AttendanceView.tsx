import React, { useState } from "react";
import { Check, X, CheckCircle2, Save } from "lucide-react";
import type { AttendanceStudent } from "../../data/trainerMock";

export function AttendanceView({
  rosterMap,
  selectedBatchCode,
  onChangeBatch,
  onSaveAttendance,
}: {
  rosterMap: Record<string, AttendanceStudent[]>;
  selectedBatchCode: string;
  onChangeBatch: (batchCode: string) => void;
  onSaveAttendance: (batchCode: string, records: AttendanceStudent[]) => void;
}) {
  const currentRoster = rosterMap[selectedBatchCode] || [];
  const [localRoster, setLocalRoster] = useState<AttendanceStudent[]>(currentRoster);

  // Sync if selected batch changes
  React.useEffect(() => {
    setLocalRoster(rosterMap[selectedBatchCode] || []);
  }, [selectedBatchCode, rosterMap]);

  const toggleStatus = (studentId: string, status: "PRESENT" | "ABSENT") => {
    setLocalRoster((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s))
    );
  };

  const handleSave = () => {
    // TODO: Connect to backend API: POST /api/trainer/session-entry to persist daily attendance & topic
    onSaveAttendance(selectedBatchCode, localRoster);
  };

  const presentCount = localRoster.filter((s) => s.status === "PRESENT").length;

  return (
    <div className="space-y-3">
      {/* Batch selector and quick save toolbar - NO headings or subheadings */}
      <div
        className="p-3.5 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-sm"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-stone-500">Select Cohort:</span>
          <select
            value={selectedBatchCode}
            onChange={(e) => onChangeBatch(e.target.value)}
            className="p-2 rounded-lg border text-sm outline-none cursor-pointer"
            style={{
              backgroundColor: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--text)",
            }}
          >
            {Object.keys(rosterMap).map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <span className="text-xs text-stone-500 hidden sm:inline">
            ({presentCount}/{localRoster.length} present)
          </span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="px-3.5 py-2 rounded-lg text-sm font-semibold transition-opacity shadow-2xs hover:opacity-90 flex items-center justify-center gap-1.5 cursor-pointer"
          style={{
            backgroundColor: "var(--accent)",
            color: "var(--accent-contrast)",
          }}
        >
          <Save size={15} />
          <span>Save Attendance</span>
        </button>
      </div>

      {/* Student Attendance List */}
      <div
        className="rounded-xl border overflow-hidden shadow-2xs w-full"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr
                className="border-b"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                  color: "var(--muted)",
                  fontWeight: 600,
                  fontSize: "12px",
                }}
              >
                <th className="py-3 px-4">Roll No</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4 text-right">Attendance State</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {localRoster.map((student) => {
                const isPresent = student.status === "PRESENT";
                return (
                  <tr
                    key={student.studentId}
                    className="hover:bg-black/2 dark:hover:bg-white/2 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-xs text-stone-500">
                      {student.rollNo}
                    </td>
                    <td className="py-3 px-4 font-semibold" style={{ color: "var(--text)" }}>
                      {student.name}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex rounded-lg border p-0.5" style={{ borderColor: "var(--border)" }}>
                        <button
                          type="button"
                          onClick={() => toggleStatus(student.studentId, "PRESENT")}
                          className="px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          style={{
                            backgroundColor: isPresent ? "#059669" : "transparent",
                            color: isPresent ? "#FFFFFF" : "var(--muted)",
                          }}
                        >
                          <Check size={13} />
                          <span>Present</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStatus(student.studentId, "ABSENT")}
                          className="px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          style={{
                            backgroundColor: !isPresent ? "#DC2626" : "transparent",
                            color: !isPresent ? "#FFFFFF" : "var(--muted)",
                          }}
                        >
                          <X size={13} />
                          <span>Absent</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

