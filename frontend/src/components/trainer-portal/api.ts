import type {
  TrainerStats,
  TrainerBatch,
  TrainerScheduleItem,
  AttendanceStudent,
  TrainerAssignmentSubmission,
  DoubtSession,
  TrainerAnnouncement,
} from "./types";

export interface TrainerSnapshot {
  stats: TrainerStats;
  batches: TrainerBatch[];
  schedule: TrainerScheduleItem[];
  rosterMap: Record<string, AttendanceStudent[]>;
  assignments: TrainerAssignmentSubmission[];
  doubts: DoubtSession[];
  announcements: TrainerAnnouncement[];
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Trainer API request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const trainerApi = {
  getSnapshot(): Promise<TrainerSnapshot> {
    return requestJson("/api/trainer");
  },
  saveAttendance(batchCode: string, records: AttendanceStudent[]): Promise<void> {
    return requestJson("/api/trainer/attendance", {
      method: "POST",
      body: JSON.stringify({ batchCode, records: records.map((r) => ({ studentId: r.studentId, status: r.status })) }),
    });
  },
  gradeSubmission(id: string, score: number, feedback: string): Promise<void> {
    return requestJson(`/api/trainer/assignments/${encodeURIComponent(id)}/grade`, { method: "POST", body: JSON.stringify({ score, feedback }) });
  },
  acceptDoubt(id: string): Promise<void> {
    return requestJson(`/api/trainer/doubts/${encodeURIComponent(id)}/accept`, { method: "POST" });
  },
  publishAnnouncement(data: { title: string; body: string; batchCode: string }): Promise<{ announcement: TrainerAnnouncement }> {
    return requestJson("/api/trainer/announcements", { method: "POST", body: JSON.stringify(data) });
  },
};
