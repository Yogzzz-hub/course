import type { Lead, Admission, CohortSeat, AttendanceAlert, FeePayment, Counsellor, Announcement, ManagerStats, ManagerReportsData } from "./types";

export interface ManagerSnapshot {
  stats: ManagerStats;
  leads: Lead[];
  admissions: Admission[];
  cohorts: CohortSeat[];
  alerts: AttendanceAlert[];
  payments: FeePayment[];
  counsellors: Counsellor[];
  announcements: Announcement[];
  reports: ManagerReportsData;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Manager API request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const managerApi = {
  getSnapshot(): Promise<ManagerSnapshot> {
    return requestJson("/api/manager");
  },
  updateLead(id: string, patch: { status?: Lead["status"] }): Promise<void> {
    return requestJson(`/api/manager/leads/${encodeURIComponent(id)}`, { method: "POST", body: JSON.stringify(patch) });
  },
  updateAdmission(id: string, status: Admission["status"]): Promise<void> {
    return requestJson(`/api/manager/admissions/${encodeURIComponent(id)}`, { method: "POST", body: JSON.stringify({ status }) });
  },
  updateAlert(id: string, patch: { warningSent?: boolean; resolved?: boolean }): Promise<void> {
    return requestJson(`/api/manager/alerts/${encodeURIComponent(id)}`, { method: "POST", body: JSON.stringify(patch) });
  },
  publishAnnouncement(data: { title: string; body: string; author: string; audience: string; priority: string }): Promise<{ announcement: Announcement }> {
    return requestJson("/api/manager/announcements", { method: "POST", body: JSON.stringify(data) });
  },
};
