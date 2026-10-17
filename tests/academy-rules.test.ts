import { describe, expect, it } from "vitest";
import { AcademyApiError } from "../src/components/academy/api";
import { classSessionSchema, type BackdateGrant, type Batch, type ClassSession, type ClassSessionInput, type Course } from "../src/components/academy/contracts";
import { createDemoTrainerApi } from "../src/components/academy/demo";
import {
  addDays, attendanceProgress, completionStatus, dateAccess, dayStatus, isoWeekday, missingAttendanceDates,
  permittedDates, scheduledDates, syllabusProgress, todayIn, validateClassSession,
} from "../src/components/academy/rules";

const today = "2026-10-17"; // A Saturday.
const now = new Date("2026-10-17T06:00:00Z");
const course: Course = {
  id: "course-1", code: "PFS", name: "Python Full-Stack", durationWeeks: 4, syllabusStatus: "approved",
  syllabus: [
    { id: "t1", title: "Foundations", subtopics: [{ id: "t1-s1", title: "Syntax" }, { id: "t1-s2", title: "Functions" }] },
    { id: "t2", title: "Databases", subtopics: [{ id: "t2-s1", title: "SQL" }, { id: "t2-s2", title: "Indexes" }] },
  ],
};
const batch: Batch = {
  id: "batch-1", code: "PFS-WD-01", courseId: course.id, scheduleType: "weekdays", classDays: [1, 3, 5],
  startTime: "18:30", endTime: "20:30", startDate: "2026-10-05", expectedEndDate: "2026-10-30",
  students: [
    { id: "st1", registrationNo: "R1", name: "Aarav Menon", schedulePreference: "weekdays" },
    { id: "st2", registrationNo: "R2", name: "Diya Krishnan", schedulePreference: "weekdays" },
  ],
};
const session = (classDate: string, marks: [string, "present" | "absent" | "leave"][], subtopicIds: string[], startTime = "18:30", endTime = "20:30"): ClassSession => ({
  id: `s-${classDate}-${startTime}`, batchId: batch.id, classDate, startTime, endTime,
  attendance: marks.map(([studentId, status]) => ({ studentId, status })), subtopicIds, notes: null,
  submittedBy: "trainer-1", submittedAt: `${classDate}T15:00:00.000Z`, locked: true,
});
const grant = (classDate: string, extra: Partial<BackdateGrant> = {}): BackdateGrant => ({
  id: `g-${classDate}`, batchId: batch.id, classDate, grantedBy: "Admin", expiresAt: "2026-10-20T00:00:00.000Z", usedBySessionId: null, ...extra,
});
const input = (extra: Partial<ClassSessionInput> = {}): ClassSessionInput => ({
  batchId: batch.id, classDate: "2026-10-16", startTime: "18:30", endTime: "20:30",
  attendance: [{ studentId: "st1", status: "present" }, { studentId: "st2", status: "absent" }], subtopicIds: ["t1-s1"], notes: null, ...extra,
});
const context = (extra: { sessions?: ClassSession[]; grants?: BackdateGrant[] } = {}) => ({
  batch, course, sessions: extra.sessions ?? [], grants: extra.grants ?? [], today, assignedBatchIds: [batch.id], now,
});

describe("Academy calendar", () => {
  it("reads today in the academy's time zone, not the browser's", () => {
    expect(todayIn(undefined, new Date("2026-10-16T19:00:00Z"))).toBe("2026-10-17");
    expect(todayIn("UTC", new Date("2026-10-16T19:00:00Z"))).toBe("2026-10-16");
  });
  it("lists the batch's scheduled class dates from its class days", () => {
    expect(isoWeekday(today)).toBe(6);
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    const dates = scheduledDates(batch);
    expect(dates).toHaveLength(12);
    expect(dates.slice(0, 3)).toEqual(["2026-10-05", "2026-10-07", "2026-10-09"]);
    expect(dates.every(date => [1, 3, 5].includes(isoWeekday(date)))).toBe(true);
  });
  it("shows a missing class as attendance not submitted, never as an absence", () => {
    const sessions = [session("2026-10-05", [["st1", "present"], ["st2", "present"]], ["t1-s1"])];
    expect(dayStatus(batch, sessions, "2026-10-05", today)).toBe("submitted");
    expect(dayStatus(batch, sessions, "2026-10-07", today)).toBe("not-submitted");
    expect(dayStatus(batch, sessions, today, today)).toBe("due-today");
    expect(dayStatus(batch, sessions, "2026-10-19", today)).toBe("upcoming");
    expect(missingAttendanceDates(batch, sessions, today)).toEqual(["2026-10-07", "2026-10-09", "2026-10-12", "2026-10-14", "2026-10-16"]);
    // The unsubmitted classes do not appear as absences: student 2 has no absent marks at all.
    expect(attendanceProgress(batch, sessions, "st2")).toEqual({ present: 1, scheduled: 12, percent: 8 });
  });
});

describe("Progress", () => {
  it("counts only present classes against all scheduled classes", () => {
    const sessions = [
      session("2026-10-05", [["st1", "present"], ["st2", "absent"]], ["t1-s1"]),
      session("2026-10-07", [["st1", "present"], ["st2", "leave"]], ["t1-s2"]),
      session("2026-10-09", [["st1", "present"], ["st2", "present"]], ["t2-s1"]),
    ];
    expect(attendanceProgress(batch, sessions, "st1")).toEqual({ present: 3, scheduled: 12, percent: 25 });
    expect(attendanceProgress(batch, sessions, "st2")).toEqual({ present: 1, scheduled: 12, percent: 8 });
  });
  it("measures syllabus as unweighted share of approved subtopics, from the first date each was taught", () => {
    const sessions = [
      session("2026-10-07", [], ["t1-s1", "t1-s2"]),
      session("2026-10-05", [], ["t1-s1", "not-in-syllabus"]),
    ];
    const progress = syllabusProgress(batch, course, sessions);
    expect(progress).toMatchObject({ covered: 2, total: 4, percent: 50 });
    expect(progress.coveredOn.get("t1-s1")).toBe("2026-10-05");
    expect(progress.coveredOn.has("not-in-syllabus")).toBe(false);
  });
  it("allows the admin-approval request only at 100% attendance and 100% syllabus", () => {
    expect(completionStatus(100, 100)).toEqual({ eligible: true, label: "Can be submitted for admin approval" });
    expect(completionStatus(100, 99).label).toBe("Not eligible · syllabus incomplete");
    expect(completionStatus(99, 100).label).toBe("Not eligible · attendance incomplete");
    expect(completionStatus(50, 50)).toEqual({ eligible: false, label: "Not eligible · attendance and syllabus incomplete" });
  });
});

describe("Date access", () => {
  it("opens today and yesterday, locks the future and needs a live grant for earlier dates", () => {
    expect(dateAccess(batch, today, today, [], now)).toBe("today");
    expect(dateAccess(batch, "2026-10-16", today, [], now)).toBe("yesterday");
    expect(dateAccess(batch, "2026-10-19", today, [], now)).toBe("future");
    expect(dateAccess(batch, "2026-10-14", today, [], now)).toBe("needs-grant");
    expect(dateAccess(batch, "2026-10-14", today, [grant("2026-10-14")], now)).toBe("granted");
    expect(dateAccess(batch, "2026-10-14", today, [grant("2026-10-14", { expiresAt: "2026-10-17T05:00:00.000Z" })], now)).toBe("needs-grant");
    expect(dateAccess(batch, "2026-10-14", today, [grant("2026-10-14", { usedBySessionId: "s-1" })], now)).toBe("needs-grant");
    expect(dateAccess(batch, "2026-10-14", today, [grant("2026-10-14", { batchId: "other" })], now)).toBe("needs-grant");
    expect(dateAccess(batch, "2026-10-02", today, [grant("2026-10-02")], now)).toBe("outside-batch");
  });
  it("offers only the dates a trainer may enter", () => {
    expect(permittedDates(batch, today, [grant("2026-10-14"), grant("2026-10-12", { usedBySessionId: "s-1" })], now)).toEqual([
      { date: today, access: "today" }, { date: "2026-10-16", access: "yesterday" }, { date: "2026-10-14", access: "granted" },
    ]);
    expect(permittedDates({ ...batch, startDate: "2026-10-19" }, today, [], now)).toEqual([]);
  });
});

describe("Combined class session validation", () => {
  it("accepts one complete entry", () => {
    expect(validateClassSession(input(), context())).toEqual({});
  });
  it("rejects future and ungranted past dates", () => {
    expect(validateClassSession(input({ classDate: "2026-10-19" }), context()).classDate).toBe("Future dates are locked.");
    expect(validateClassSession(input({ classDate: "2026-10-14" }), context()).classDate).toBe("Dates before yesterday need authorised backdated access.");
    expect(validateClassSession(input({ classDate: "2026-10-14" }), context({ grants: [grant("2026-10-14")] }))).toEqual({});
  });
  it("prevents duplicate and overlapping sessions for the same batch and date", () => {
    const sessions = [session("2026-10-16", [["st1", "present"], ["st2", "present"]], ["t1-s1"])];
    expect(validateClassSession(input(), context({ sessions })).form).toBe("A class session for this batch, date and start time has already been submitted.");
    expect(validateClassSession(input({ startTime: "19:00", endTime: "21:00" }), context({ sessions })).startTime).toBe("This time overlaps a session already submitted for that date.");
    expect(validateClassSession(input({ startTime: "20:30", endTime: "21:30" }), context({ sessions }))).toEqual({});
  });
  it("needs the end after the start, every student marked once, an approved subtopic and short notes", () => {
    expect(validateClassSession(input({ endTime: "18:00" }), context()).endTime).toBe("End time must be later than the start time.");
    expect(validateClassSession(input({ attendance: [] }), context()).attendance).toBe("Mark attendance for every student (2 left).");
    expect(validateClassSession(input({ attendance: [{ studentId: "st1", status: "present" }, { studentId: "intruder", status: "present" }] }), context()).attendance).toBe("Attendance includes a student who is not in this batch.");
    expect(validateClassSession(input({ subtopicIds: [] }), context()).subtopics).toBe("Select at least one subtopic covered in this session.");
    expect(validateClassSession(input({ subtopicIds: ["made-up"] }), context()).subtopics).toBe("Choose subtopics from the approved syllabus.");
    expect(validateClassSession(input({ notes: "x".repeat(1001) }), context()).notes).toBe("Keep notes under 1000 characters.");
  });
  it("refuses batches that are not assigned to the trainer", () => {
    expect(validateClassSession(input(), { ...context(), assignedBatchIds: [] }).form).toBe("You can only submit sessions for batches assigned to you.");
  });
});

describe("Demo trainer store", () => {
  const demo = () => createDemoTrainerApi({ now: () => now, storage: null, latency: 0 });
  const allPresent = (b: Batch) => b.students.map(student => ({ studentId: student.id, status: "present" as const }));

  it("seeds two batches with missing classes and one backdated grant", async () => {
    const workspace = await demo().workspace();
    expect(workspace.today).toBe(today);
    expect(workspace.batches.map(item => item.code)).toEqual(["PFS-WD-2026-03", "RCT-WE-2026-01"]);
    const weekday = workspace.batches[0];
    const missing = missingAttendanceDates(weekday, workspace.sessions, today);
    expect(missing).toHaveLength(3);
    expect(workspace.grants).toHaveLength(1);
    expect(missing).toContain(workspace.grants[0].classDate);
  });

  it("stores one locked record per submission, replays a repeated idempotency key and rejects duplicates", async () => {
    const api = demo();
    const { batches, courses } = await api.workspace();
    const weekday = batches[0];
    const entry: ClassSessionInput = { batchId: weekday.id, classDate: "2026-10-16", startTime: "18:30", endTime: "20:30", attendance: allPresent(weekday), subtopicIds: [courses[0].syllabus[2].subtopics[1].id], notes: "  Indexes lab  " };
    const saved = await api.submitClassSession(entry, "key-1");
    expect(classSessionSchema.parse(saved)).toMatchObject({ locked: true, classDate: "2026-10-16", notes: "Indexes lab" });
    expect(await api.submitClassSession(entry, "key-1")).toEqual(saved);
    await expect(api.submitClassSession(entry, "key-2")).rejects.toMatchObject({ status: 409 });
    expect((await api.workspace()).sessions.filter(item => item.classDate === "2026-10-16")).toHaveLength(1);
  });

  it("returns field errors for an incomplete entry and consumes a backdated grant once", async () => {
    const api = demo();
    const { batches, courses, grants } = await api.workspace();
    const weekday = batches[0];
    const incomplete = api.submitClassSession({ batchId: weekday.id, classDate: "2026-10-16", startTime: "18:30", endTime: "20:30", attendance: [], subtopicIds: [], notes: null }, "key-a");
    await expect(incomplete).rejects.toBeInstanceOf(AcademyApiError);
    await expect(incomplete).rejects.toMatchObject({ status: 422, fieldErrors: { attendance: "Mark attendance for every student (6 left).", subtopics: "Select at least one subtopic covered in this session." } });

    const granted = { batchId: weekday.id, classDate: grants[0].classDate, startTime: "18:30", endTime: "20:30", attendance: allPresent(weekday), subtopicIds: [courses[0].syllabus[0].subtopics[0].id], notes: null };
    const saved = await api.submitClassSession(granted, "key-b");
    expect((await api.workspace()).grants[0].usedBySessionId).toBe(saved.id);
    await expect(api.submitClassSession({ ...granted, startTime: "21:00", endTime: "22:00" }, "key-c")).rejects.toMatchObject({ status: 422, fieldErrors: { classDate: "Dates before yesterday need authorised backdated access." } });
  });

  it("sends a course for admin approval only once attendance and syllabus reach 100%", async () => {
    const api = demo();
    const { batches, courses, sessions } = await api.workspace();
    const weekend = batches[1], react = courses[1];
    const [arjun, , nikhil] = weekend.students;
    await expect(api.requestCompletion({ batchId: weekend.id, studentId: arjun.id })).rejects.toMatchObject({ status: 422 });

    const covered = syllabusProgress(weekend, react, sessions).coveredOn;
    const remaining = react.syllabus.flatMap(topic => topic.subtopics).filter(sub => !covered.has(sub.id)).map(sub => sub.id);
    await api.submitClassSession({ batchId: weekend.id, classDate: today, startTime: "10:00", endTime: "13:00", attendance: allPresent(weekend), subtopicIds: remaining, notes: null }, "final");

    await expect(api.requestCompletion({ batchId: weekend.id, studentId: arjun.id })).resolves.toMatchObject({ status: "pending_admin" });
    await expect(api.requestCompletion({ batchId: weekend.id, studentId: arjun.id })).rejects.toMatchObject({ status: 409 });
    await expect(api.requestCompletion({ batchId: weekend.id, studentId: nikhil.id })).rejects.toMatchObject({ status: 422, message: "Not eligible · attendance incomplete. Both attendance and syllabus must reach 100%." });
    await expect(api.requestCompletion({ batchId: "someone-elses", studentId: arjun.id })).rejects.toMatchObject({ status: 403 });
  });

  it("resets to the seeded workspace", async () => {
    const api = demo();
    const { batches, courses } = await api.workspace();
    await api.submitClassSession({ batchId: batches[0].id, classDate: "2026-10-16", startTime: "18:30", endTime: "20:30", attendance: allPresent(batches[0]), subtopicIds: [courses[0].syllabus[0].subtopics[0].id], notes: null }, "key-r");
    const before = (await api.workspace()).sessions.length;
    api.reset();
    expect((await api.workspace()).sessions.length).toBe(before - 1);
  });
});
