import type { AttendanceStatus } from "../academy/contracts";
import {
  attendanceProgress,
  completionStatus,
  dayStatus,
  scheduledDates,
  syllabusProgress,
  type DayStatus,
} from "../academy/rules";
import { webUrl, type ClassProgress, type StudentSession } from "./contracts";

export type PanelTab = "home" | "schedule" | "work" | "payments" | "more";
export function money(minor: number, currency: string) {
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(minor / 10 ** digits);
}
export function dateTime(instant: string, timeZone = "Asia/Kolkata") {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(instant));
}
export function dayKey(instant: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function timeLabel(instant: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(instant));
}
export function nextStep(
  status: Extract<StudentSession, { mode: "prospect" }>["leadStatus"],
) {
  const steps = {
    new: {
      title: "Let’s find your direction.",
      description:
        "Book a counselling session to talk through your goals and explore the right programme.",
      action: "Book counselling",
      href: "/book-session",
      tab: "schedule",
    },
    counselling_booked: {
      title: "Your conversation is coming up.",
      description:
        "Review your session details and come prepared with the questions that matter to you.",
      action: "View my session",
      tab: "schedule",
    },
    counselling_complete: {
      title: "Your learning plan is taking shape.",
      description:
        "Your counsellor is preparing a recommendation based on your goals. We’ll show it here as soon as it is ready.",
      action: "View learning plan",
      tab: "work",
    },
    plan_ready: {
      title: "Your next chapter starts here.",
      description:
        "Review your personalised learning plan, compare packages and choose your next step.",
      action: "Review my plan",
      tab: "work",
    },
    payment_pending: {
      title: "We’re checking your payment.",
      description:
        "Your enrolment will appear automatically after the payment is verified. You can check its progress in Payments.",
      action: "View payment status",
      tab: "payments",
    },
  } satisfies Record<
    string,
    {
      title: string;
      description: string;
      action: string;
      href?: string;
      tab: PanelTab;
    }
  >;
  return steps[status];
}
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const attachmentTypes: Record<string, readonly string[]> = {
  pdf: ["application/pdf"],
  zip: ["application/zip", "application/x-zip-compressed"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
};
export function submissionError(
  repositoryUrl: string,
  liveUrl: string,
  file: File | null,
) {
  if (!repositoryUrl.trim() && !liveUrl.trim() && !file)
    return "Add a repository, live demo, or attachment before submitting.";
  if (repositoryUrl.trim() && !webUrl.safeParse(repositoryUrl.trim()).success)
    return "Enter a valid HTTPS repository URL.";
  if (liveUrl.trim() && !webUrl.safeParse(liveUrl.trim()).success)
    return "Enter a valid HTTPS live demo URL.";
  if (file) {
    if (file.size === 0 || file.size > MAX_ATTACHMENT_BYTES)
      return "Choose a non-empty file under 10 MB.";
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (
      !attachmentTypes[extension] ||
      (file.type && !attachmentTypes[extension].includes(file.type))
    )
      return "Choose a PDF, ZIP, PNG, or JPEG file.";
  }
  return null;
}
export interface ClassDay {
  date: string;
  /** False for an extra class held on a day the batch does not normally meet. */
  scheduled: boolean;
  status: DayStatus;
  sessions: {
    id: string;
    startTime: string;
    endTime: string;
    /** Null when the trainer's record has no mark for this student. */
    attendance: AttendanceStatus | null;
    topics: { id: string; title: string; subtopics: string[] }[];
  }[];
}
/** Every scheduled date, plus any extra class, oldest first, with the student's own mark per session. */
export function classTimeline({
  batch,
  course,
  sessions,
  studentId,
  today,
}: ClassProgress): ClassDay[] {
  const scheduled = new Set(scheduledDates(batch));
  const dates = [
    ...new Set([...scheduled, ...sessions.map((item) => item.classDate)]),
  ].sort();
  return dates.map((date) => ({
    date,
    scheduled: scheduled.has(date),
    status: dayStatus(batch, sessions, date, today),
    sessions: sessions
      .filter((item) => item.classDate === date)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map((item) => ({
        id: item.id,
        startTime: item.startTime,
        endTime: item.endTime,
        attendance:
          item.attendance.find((mark) => mark.studentId === studentId)
            ?.status ?? null,
        topics: course.syllabus
          .map((topic) => ({
            id: topic.id,
            title: topic.title,
            subtopics: topic.subtopics
              .filter((sub) => item.subtopicIds.includes(sub.id))
              .map((sub) => sub.title),
          }))
          .filter((topic) => topic.subtopics.length > 0),
      })),
  }));
}
const requestLabels = {
  pending_admin: "Awaiting admin approval",
  approved: "Completion approved",
  rejected: "Completion not approved",
} as const;
/** The two progress figures and the completion state, from the shared academy rules. */
export function classStanding(progress: ClassProgress) {
  const { batch, course, sessions, studentId, completionRequest } = progress;
  const attendance = attendanceProgress(batch, sessions, studentId);
  const syllabus = syllabusProgress(batch, course, sessions);
  const status = completionStatus(attendance.percent, syllabus.percent);
  return {
    attendance,
    syllabus,
    eligible: status.eligible,
    request: completionRequest?.status ?? null,
    completion: completionRequest
      ? requestLabels[completionRequest.status]
      : status.label,
  };
}
