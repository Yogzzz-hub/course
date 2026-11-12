import { initialTrainerSchedule, type TrainerScheduleItem } from "../data/trainerMock";

export interface ScheduledClassItem extends TrainerScheduleItem {
  dateIso?: string;
  startTime?: string;
  endTime?: string;
  facultyName?: string;
}

const STORAGE_KEY = "crm_scheduled_classes";
const SCHEDULE_EVENT = "crm-schedule-updated";

export const initialScheduledClasses: ScheduledClassItem[] = initialTrainerSchedule.map((item, idx) => {
  const presets = [
    { dateIso: "2026-11-11", startTime: "10:00", endTime: "12:00", facultyName: "Dr. Vikram Joshi" },
    { dateIso: "2026-11-12", startTime: "14:00", endTime: "16:00", facultyName: "Neha Kulkarni" },
    { dateIso: "2026-11-13", startTime: "18:00", endTime: "20:30", facultyName: "Arjun Reddy" },
  ];
  const preset = presets[idx] || {};
  return {
    ...item,
    ...preset,
  };
});

export function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time24;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatDateLabel(dateIso: string): string {
  if (!dateIso) return "";
  const parsed = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateIso;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function computeDurationLabel(startTime: string, endTime: string): string {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if (![sh, sm, eh, em].every(Number.isFinite)) return "";
  const diffMins = eh * 60 + em - (sh * 60 + sm);
  if (diffMins <= 0) return "";
  if (diffMins < 60) return `${diffMins} Mins`;
  const hours = diffMins / 60;
  if (Number.isInteger(hours)) return `${hours} ${hours === 1 ? "Hour" : "Hours"}`;
  return `${Number(hours.toFixed(1))} Hours`;
}

export function readScheduledClasses(): ScheduledClassItem[] {
  if (typeof window === "undefined") return initialScheduledClasses;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialScheduledClasses;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return initialScheduledClasses;
}

export function writeScheduledClasses(items: ScheduledClassItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(SCHEDULE_EVENT));
  } catch {
    // ignore storage errors
  }
}

export function subscribeScheduledClasses(callback: (items: ScheduledClassItem[]) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback(readScheduledClasses());
  const storageHandler = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) handler();
  };
  window.addEventListener(SCHEDULE_EVENT, handler);
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(SCHEDULE_EVENT, handler);
    window.removeEventListener("storage", storageHandler);
  };
}

