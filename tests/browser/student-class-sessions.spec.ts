import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  enrolledSession,
  studentClassProgress,
  studentDashboard,
  studentPayments,
} from "../student-fixtures";
import type { ClassProgress } from "../../src/components/student-panel/contracts";

// The fixture is read on Tuesday 20 October 2026 (the payload's `today`), so no clock is needed.
async function mockStudentApi(page: Page, classProgress: unknown = studentClassProgress) {
  let classProgressCalls = 0;
  await page.route("**/api/student/**", (route) => {
    const endpoint = new URL(route.request().url()).pathname.replace("/api/student", "");
    if (endpoint === "/session") return route.fulfill({ json: { session: enrolledSession } });
    if (endpoint === "/dashboard") return route.fulfill({ json: studentDashboard });
    if (endpoint === "/payments") return route.fulfill({ json: studentPayments });
    if (endpoint === "/class-progress") {
      classProgressCalls++;
      return route.fulfill({ json: classProgress });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  return { get classProgressCalls() { return classProgressCalls; } };
}
const variant = (change: (draft: ClassProgress) => void) => {
  const draft = structuredClone(studentClassProgress);
  change(draft);
  return draft;
};
const openSchedule = async (page: Page) => {
  await page.getByRole("navigation", { name: "Workspace navigation", exact: true }).getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your schedule" })).toBeVisible();
};
const rows = (page: Page, name: string) => page.getByRole("list", { name, exact: true }).locator(":scope > li");
const noHorizontalScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

test("home shows attendance and syllabus progress as separate figures with the completion state", async ({ page }) => {
  await mockStudentApi(page);
  await page.goto("/student-panel");
  const card = page.locator("section").filter({ has: page.getByRole("heading", { name: "Attendance & syllabus" }) });
  await expect(card).toContainText("Batch PFS-WD-2026-03");
  await expect(card.getByRole("progressbar", { name: "Attendance progress" })).toHaveJSProperty("value", 25);
  await expect(card).toContainText("Present for 2 of 8 scheduled classes.");
  await expect(card.getByRole("progressbar", { name: "Syllabus progress" })).toHaveJSProperty("value", 83);
  await expect(card).toContainText("5 of 6 syllabus subtopics covered in class.");
  await expect(card.locator("[data-completion]")).toHaveText("Not eligible · attendance and syllabus incomplete");
  await card.getByRole("button", { name: "View class sessions" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your schedule" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Class sessions" })).toBeVisible();
});

test("schedule lists every class date with the student's own attendance, topics and times", async ({ page }) => {
  await mockStudentApi(page);
  await page.goto("/student-panel");
  await openSchedule(page);
  const batch = page.locator("section").filter({ has: page.getByRole("heading", { name: "Your batch" }) });
  await expect(batch).toContainText("PFS-WD-2026-03");
  await expect(batch).toContainText("Python Full-Stack · 4 weeks");
  await expect(batch).toContainText("Weekdays · Tue, Thu · 6:30 pm to 8:30 pm");
  await expect(batch).toContainText("6 Oct 2026 to 29 Oct 2026");
  await expect(batch.getByRole("progressbar", { name: "Attendance progress" })).toHaveJSProperty("value", 25);
  await expect(batch.getByRole("progressbar", { name: "Syllabus progress" })).toHaveJSProperty("value", 83);

  // Classes so far, newest first, including today's and the Saturday extra class.
  const past = rows(page, "Classes so far");
  await expect(past.getByRole("heading", { level: 3 })).toHaveText([
    "Tuesday 20 October 2026", "Saturday 17 October 2026", "Thursday 15 October 2026",
    "Tuesday 13 October 2026", "Thursday 8 October 2026", "Tuesday 6 October 2026",
  ]);
  await expect(past.nth(0)).toContainText("Today");
  await expect(past.nth(0)).toContainText("Scheduled 6:30 pm to 8:30 pm");
  await expect(past.nth(0)).toContainText("Attendance not submitted");
  await expect(past.nth(1)).toContainText("Extra class");
  await expect(past.nth(1)).toContainText("10:00 am to 12:00 pm");
  await expect(past.nth(1)).toContainText("Your attendance: Present");
  await expect(past.nth(1).getByRole("list", { name: "Topics covered" }).getByRole("listitem")).toHaveText([
    "Python foundations: Functions", "SQL & PostgreSQL: PostgreSQL",
  ]);
  // A class with no submitted session is never shown as an absence.
  await expect(past.nth(2)).toContainText("Attendance not submitted");
  await expect(past.nth(2)).not.toContainText("Absent");
  await expect(past.nth(2).getByRole("list", { name: "Topics covered" })).toHaveCount(0);
  await expect(past.nth(3)).toContainText("Your attendance: Leave");
  await expect(past.nth(3)).toContainText("SQL & PostgreSQL: Data modeling");
  await expect(past.nth(4)).toContainText("Your attendance: Absent");
  await expect(past.nth(4)).toContainText("Python foundations: Functions");
  await expect(past.nth(5)).toContainText("6:30 pm to 8:30 pm");
  await expect(past.nth(5)).toContainText("Your attendance: Present");
  await expect(past.nth(5)).toContainText("Python foundations: Variables and types, Control flow");

  // The rest of the schedule sits behind a disclosure, in date order, with no attendance yet.
  const upcoming = rows(page, "Upcoming classes");
  await expect(upcoming.first()).toBeHidden();
  await page.getByText("Upcoming classes (3)").click();
  await expect(upcoming.getByRole("heading", { level: 3 })).toHaveText([
    "Thursday 22 October 2026", "Tuesday 27 October 2026", "Thursday 29 October 2026",
  ]);
  for (const row of await upcoming.all()) {
    await expect(row).toContainText("Scheduled 6:30 pm to 8:30 pm");
    await expect(row).not.toContainText("Attendance");
  }
  // Live class links stay on the same screen.
  await expect(page.getByRole("heading", { name: "Building APIs with Django" })).toBeVisible();
});

test("a long batch shows recent classes first and expands to every date", async ({ page }) => {
  await mockStudentApi(page, variant(draft => { draft.batch.startDate = "2026-09-01"; }));
  await page.goto("/student-panel");
  await openSchedule(page);
  const past = rows(page, "Classes so far");
  await expect(past).toHaveCount(8);
  const toggle = page.getByRole("button", { name: "Show all 16 classes so far" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(past).toHaveCount(16);
  await expect(past.last().getByRole("heading", { level: 3 })).toHaveText("Tuesday 1 September 2026");
  await expect(past.last()).toContainText("Attendance not submitted");
  await expect(page.getByRole("button", { name: "Show recent classes only" })).toHaveAttribute("aria-expanded", "true");
  // Missing submissions lower attendance progress without being counted as absences.
  await expect(page.getByRole("progressbar", { name: "Attendance progress" })).toHaveJSProperty("value", 11);
  await expect(page.getByText("Present for 2 of 18 scheduled classes.")).toBeVisible();
});

test("completion request, unallocated batch and invalid payload states", async ({ page }) => {
  await mockStudentApi(page, variant(draft => {
    draft.completionRequest = { batchId: draft.batch.id, studentId: draft.studentId, submittedAt: "2026-10-29T15:00:00.000Z", status: "pending_admin" };
  }));
  await page.goto("/student-panel");
  await expect(page.locator("[data-completion]")).toHaveText("Awaiting admin approval");
  await expect(page.getByText("Your trainer has sent your course completion to the academy admin.")).toBeVisible();

  await page.unroute("**/api/student/**");
  await mockStudentApi(page, null);
  await page.reload();
  await expect(page.getByText("Your batch is being allocated.", { exact: false })).toBeVisible();
  await openSchedule(page);
  await expect(page.getByRole("heading", { name: "Your class sessions are coming soon" })).toBeVisible();

  // A response carrying another student's attendance is refused rather than shown.
  await page.unroute("**/api/student/**");
  const api = await mockStudentApi(page, variant(draft => {
    draft.sessions[0].attendance.push({ studentId: "student-2", status: "absent" });
  }));
  await page.reload();
  await openSchedule(page);
  await expect(page.getByRole("alert")).toContainText("incomplete information");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  expect(api.classProgressCalls).toBeGreaterThan(0);
});

test("class sessions pass an accessibility scan and fit a 375px screen", async ({ page }) => {
  await mockStudentApi(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/student-panel");
  await expect(page.getByRole("progressbar", { name: "Attendance progress" })).toBeVisible();
  expect(await noHorizontalScroll(page)).toBe(true);
  expect((await new AxeBuilder({ page }).include(".ss-student").analyze()).violations).toEqual([]);

  await page.getByRole("navigation", { name: "Mobile workspace navigation" }).getByRole("button", { name: "Schedule", exact: true }).click();
  await page.getByText("Upcoming classes (3)").click();
  await expect(rows(page, "Upcoming classes").first()).toBeVisible();
  expect(await noHorizontalScroll(page)).toBe(true);
  expect((await new AxeBuilder({ page }).include(".ss-student").analyze()).violations).toEqual([]);
});
