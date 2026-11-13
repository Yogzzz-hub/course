import type { Lead, Admission, CohortSeat, AttendanceAlert, FeePayment, Counsellor, Announcement, ManagerStats, ManagerReportsData } from "./types";
import type { ScheduledClassItem } from "../../utils/classScheduleStore";

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
  getSchedule(): Promise<{ classes: ScheduledClassItem[] }> {
    return requestJson("/api/manager/schedule");
  },
  createSchedule(data: {
    batchCode: string;
    topic: string;
    dateIso: string;
    startTime: string;
    endTime: string;
    roomLink?: string;
  }): Promise<{ item: ScheduledClassItem }> {
    return requestJson("/api/manager/schedule", { method: "POST", body: JSON.stringify(data) });
  },
  deleteSchedule(id: string): Promise<void> {
    return requestJson(`/api/manager/schedule/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  createLead(data: {
    fullName: string;
    phone?: string;
    email: string;
    courseTrack?: string;
    source?: string;
    schedulePreference?: string;
  }): Promise<{ lead: Lead }> {
    return requestJson("/api/manager/leads", { method: "POST", body: JSON.stringify(data) });
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
