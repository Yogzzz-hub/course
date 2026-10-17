import { describe, expect, it, vi } from "vitest";
import { attendanceProgress, syllabusProgress } from "../src/components/academy/rules";
import { createHttpStudentApi } from "../src/components/student-panel/api";
import { classProgressSchema, type ClassProgress } from "../src/components/student-panel/contracts";
import { classStanding, classTimeline } from "../src/components/student-panel/utils";
import { studentClassProgress } from "./student-fixtures";

const progress = (change: (draft: ClassProgress) => void = () => {}) => {
  const draft = structuredClone(studentClassProgress);
  change(draft);
  return draft;
};
const otherStudent = { id: "student-2", registrationNo: "SS-2026-WD002", name: "Diya Krishnan", schedulePreference: "weekdays" as const };

describe("student class progress contract", () => {
  it("accepts one student's own view of the batch", () => {
    expect(classProgressSchema.safeParse(studentClassProgress).success).toBe(true);
  });
  it("rejects payloads that carry other students' data or another batch", () => {
    const leaks = [
      progress(draft => { draft.batch.students.push(otherStudent); }),
      progress(draft => { draft.batch.students = [otherStudent]; }),
      progress(draft => { draft.sessions[0].attendance.push({ studentId: "student-2", status: "absent" }); }),
      progress(draft => { draft.sessions[0].attendance = [{ studentId: "student-2", status: "present" }]; }),
      progress(draft => { draft.sessions[1].batchId = "batch-other"; }),
      progress(draft => { draft.sessions[1].id = draft.sessions[0].id; }),
      progress(draft => { draft.batch.courseId = "course-other"; }),
      progress(draft => { draft.batch.expectedEndDate = "2026-10-01"; }),
      progress(draft => { draft.completionRequest = { batchId: draft.batch.id, studentId: "student-2", submittedAt: "2026-10-20T10:00:00.000Z", status: "pending_admin" }; }),
    ];
    for (const payload of leaks) expect(classProgressSchema.safeParse(payload).success).toBe(false);
  });
  it("is read from /class-progress, allows no allocated batch and refuses a leaking response", async () => {
    const respond = (body: unknown) => vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body)));
    const fetcher = respond(studentClassProgress);
    await expect(createHttpStudentApi({ fetcher }).classProgress()).resolves.toEqual(studentClassProgress);
    expect(fetcher.mock.calls[0][0]).toBe("/api/student/class-progress");
    expect(fetcher.mock.calls[0][1]).toMatchObject({ method: "GET", credentials: "include", cache: "no-store" });
    await expect(createHttpStudentApi({ fetcher: respond(null) }).classProgress()).resolves.toBeNull();
    const leaking = progress(draft => { draft.batch.students.push(otherStudent); });
    await expect(createHttpStudentApi({ fetcher: respond(leaking) }).classProgress()).rejects.toMatchObject({ code: "contract" });
  });
});

describe("student class timeline", () => {
  const days = classTimeline(studentClassProgress);
  const day = (date: string) => days.find(item => item.date === date)!;

  it("lists every scheduled date plus extra classes, oldest first", () => {
    expect(days.map(item => item.date)).toEqual([
      "2026-10-06", "2026-10-08", "2026-10-13", "2026-10-15", "2026-10-17", "2026-10-20", "2026-10-22", "2026-10-27", "2026-10-29",
    ]);
    expect(day("2026-10-17").scheduled).toBe(false);
    expect(days.filter(item => !item.scheduled)).toHaveLength(1);
  });
  it("shows the student's own mark and never turns a missing session into an absence", () => {
    expect(day("2026-10-06").sessions[0].attendance).toBe("present");
    expect(day("2026-10-08").sessions[0].attendance).toBe("absent");
    expect(day("2026-10-13").sessions[0].attendance).toBe("leave");
    expect(day("2026-10-15")).toMatchObject({ status: "not-submitted", sessions: [] });
    expect(day("2026-10-20")).toMatchObject({ status: "due-today", sessions: [] });
    expect(day("2026-10-22")).toMatchObject({ status: "upcoming", sessions: [] });
    const unmarked = classTimeline(progress(draft => { draft.sessions[0].attendance = []; }));
    expect(unmarked[0].sessions[0].attendance).toBeNull();
  });
  it("groups covered subtopics under their topics in syllabus order, with session times", () => {
    expect(day("2026-10-06").sessions[0]).toMatchObject({
      startTime: "18:30", endTime: "20:30",
      topics: [{ id: "t1", title: "Python foundations", subtopics: ["Variables and types", "Control flow"] }],
    });
    expect(day("2026-10-17").sessions[0]).toMatchObject({
      startTime: "10:00", endTime: "12:00",
      topics: [{ title: "Python foundations", subtopics: ["Functions"] }, { title: "SQL & PostgreSQL", subtopics: ["PostgreSQL"] }],
    });
  });
  it("orders two sessions on one date by start time", () => {
    const twice = classTimeline(progress(draft => {
      draft.sessions.push({ ...draft.sessions[0], id: "session-morning", startTime: "09:00", endTime: "10:00" });
    }));
    expect(twice[0].sessions.map(item => item.startTime)).toEqual(["09:00", "18:30"]);
  });
});

describe("student progress figures", () => {
  it("uses the shared rules: present over all scheduled classes, distinct subtopics over the syllabus", () => {
    const standing = classStanding(studentClassProgress);
    const { batch, course, sessions, studentId } = studentClassProgress;
    expect(standing.attendance).toEqual(attendanceProgress(batch, sessions, studentId));
    expect(standing.attendance).toEqual({ present: 2, scheduled: 8, percent: 25 });
    expect(standing.syllabus).toEqual(syllabusProgress(batch, course, sessions));
    expect(standing.syllabus).toMatchObject({ covered: 5, total: 6, percent: 83 });
    expect(standing).toMatchObject({ eligible: false, request: null, completion: "Not eligible · attendance and syllabus incomplete" });
  });
  it("shows the completion request's state once one exists", () => {
    const request = (status: "pending_admin" | "approved" | "rejected") => classStanding(progress(draft => {
      draft.completionRequest = { batchId: draft.batch.id, studentId: draft.studentId, submittedAt: "2026-10-29T15:00:00.000Z", status };
    })).completion;
    expect(request("pending_admin")).toBe("Awaiting admin approval");
    expect(request("approved")).toBe("Completion approved");
    expect(request("rejected")).toBe("Completion not approved");
  });
  it("becomes eligible only at 100% attendance and 100% syllabus", () => {
    const complete = progress(draft => {
      draft.batch.expectedEndDate = "2026-10-08";
      draft.sessions = [
        { ...draft.sessions[0], subtopicIds: ["t1-s1", "t1-s2", "t1-s3"] },
        { ...draft.sessions[1], attendance: [{ studentId: draft.studentId, status: "present" }], subtopicIds: ["t2-s1", "t2-s2", "t2-s3"] },
      ];
    });
    expect(classStanding(complete)).toMatchObject({ eligible: true, completion: "Can be submitted for admin approval" });
  });
});
