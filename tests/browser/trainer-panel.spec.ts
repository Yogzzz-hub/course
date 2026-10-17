import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Saturday 17 October 2026, 11:30 in the academy's time zone. The demo store seeds itself around "today".
const fixedNow = new Date("2026-10-17T06:00:00Z");

async function openPanel(page: Page) {
  await page.clock.setFixedTime(fixedNow);
  await page.goto("/trainer-panel");
  await expect(page.getByRole("heading", { level: 1, name: "Class sessions" })).toBeVisible();
}
const entry = (page: Page) => page.getByRole("form", { name: /Class session entry/ });

test("trainer panel shows the demo notice, allocated batches and unsubmitted classes", async ({ page }) => {
  await openPanel(page);
  await expect(page.getByRole("note")).toContainText("Demo workspace.");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const weekday = page.getByRole("tab", { name: /PFS-WD-2026-03/ });
  await expect(weekday).toHaveAttribute("aria-selected", "true");
  await expect(weekday).toContainText("3 classes with attendance not submitted");
  await expect(page.getByText("Attendance not submitted for Fri 2 Oct, Fri 9 Oct and Fri 16 Oct. These are not counted as absences.")).toBeVisible();

  const date = page.getByLabel("Class date");
  await expect(date).toHaveValue("2026-10-16");
  await expect(date.locator("option")).toHaveText(["Today · Sat 17 Oct · extra class", "Yesterday · Fri 16 Oct", "Backdated access · Fri 9 Oct"]);

  await weekday.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /RCT-WE-2026-01/ })).toBeFocused();
  await expect(page.getByRole("tab", { name: /RCT-WE-2026-01/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Class date")).toHaveValue("2026-10-17");
});

test("combined class session entry validates, reviews, submits once and locks", async ({ page }) => {
  await openPanel(page);
  const form = entry(page);
  await form.getByRole("button", { name: "Review class session" }).click();
  await expect(form.getByRole("alert")).toHaveText("Some details need attention before this session can be submitted.");
  await expect(form.getByText("Mark attendance for every student (6 left).")).toBeVisible();
  await expect(form.getByText("Select at least one subtopic covered in this session.")).toBeVisible();
  await expect(form.locator('[data-field="attendance"]')).toBeFocused();

  await form.getByRole("button", { name: "Mark everyone present" }).click();
  await form.getByRole("radiogroup", { name: "Attendance for Diya Krishnan" }).getByText("Absent").click();
  await form.getByRole("radiogroup", { name: "Attendance for Ishaan Rao" }).getByText("Leave").click();
  await expect(form.getByText("6 of 6 marked · 4 present · 1 absent · 1 on leave")).toBeVisible();
  await expect(form.getByText("Mark attendance for every student (6 left).")).toHaveCount(0);
  await form.getByRole("checkbox", { name: "Data modeling" }).check();
  await form.getByRole("checkbox", { name: "PostgreSQL" }).check();
  await form.getByLabel("Class notes").fill("Normalised the enrolment tables together.");

  await form.getByRole("button", { name: "Review class session" }).click();
  const review = form.getByRole("region", { name: "Review before submitting" });
  await expect(review).toBeFocused();
  await expect(review).toContainText("Friday 16 October 2026, 6:30 pm to 8:30 pm");
  await expect(review).toContainText("4 present, 1 absent, 1 on leave");
  await expect(review).toContainText("SQL & PostgreSQL · Data modeling");
  await review.getByRole("button", { name: "Submit and lock" }).click();

  const confirmation = page.locator("[data-session-confirmation]");
  await expect(confirmation).toBeFocused();
  await expect(confirmation).toContainText("4 of 6 present. Covered: PostgreSQL, Data modeling.");
  const record = page.getByRole("region", { name: "Session record" });
  await expect(record.getByRole("listitem").first()).toContainText("Friday 16 October 2026 · 6:30 pm to 8:30 pm");
  await expect(record.getByRole("listitem").first()).toContainText("Submitted and locked");
  await expect(page.getByText("Attendance not submitted for Fri 2 Oct and Fri 9 Oct.", { exact: false })).toBeVisible();
  // The form moves on to the next class still waiting for entry: the backdated one.
  await expect(page.getByLabel("Class date")).toHaveValue("2026-10-09");

  // The record survives a reload in this tab, and a second entry for the same class is refused.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Class sessions" })).toBeVisible();
  await page.getByLabel("Class date").selectOption("2026-10-16");
  await entry(page).getByRole("button", { name: "Mark everyone present" }).click();
  await entry(page).getByRole("checkbox", { name: "Indexing" }).check();
  await entry(page).getByRole("button", { name: "Review class session" }).click();
  await expect(entry(page).getByRole("alert")).toHaveText("A class session for this batch, date and start time has already been submitted.");
  await expect(entry(page).getByRole("region", { name: "Review before submitting" })).toHaveCount(0);
});

test("a completed course can be sent for admin approval only at 100% attendance and syllabus", async ({ page }) => {
  await openPanel(page);
  await page.getByRole("tab", { name: /RCT-WE-2026-01/ }).click();
  const progress = page.locator('section[aria-labelledby="progress-title"]');
  await expect(progress.getByRole("row", { name: /Arjun Nair/ })).toContainText("Not eligible · attendance and syllabus incomplete");

  const form = entry(page);
  await form.getByRole("button", { name: "Mark everyone present" }).click();
  await form.getByRole("checkbox", { name: "Lazy loading" }).check();
  await form.getByRole("checkbox", { name: "Error boundaries" }).check();
  await form.getByRole("button", { name: "Review class session" }).click();
  await form.getByRole("button", { name: "Submit and lock" }).click();
  await expect(page.getByRole("progressbar", { name: "Syllabus progress (batch)" })).toHaveAttribute("aria-valuenow", "100");

  await expect(progress.getByRole("row", { name: /Nikhil Das/ })).toContainText("Not eligible · attendance incomplete");
  await progress.getByRole("button", { name: "Submit Arjun for admin approval" }).click();
  await expect(progress.getByRole("status")).toHaveText("Arjun Nair's course was sent to admin for approval.");
  await expect(progress.getByRole("row", { name: /Arjun Nair/ })).toContainText("Awaiting admin approval");
  await expect(progress.getByRole("button", { name: "Submit Kavya for admin approval" })).toBeVisible();
});

test("trainer panel passes an automated accessibility scan, including the review step", async ({ page }) => {
  await openPanel(page);
  const tags = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
  expect((await new AxeBuilder({ page }).withTags(tags).analyze()).violations).toEqual([]);
  const form = entry(page);
  await form.getByRole("button", { name: "Mark everyone present" }).click();
  await form.getByRole("checkbox", { name: "Indexing" }).check();
  await form.getByRole("button", { name: "Review class session" }).click();
  await expect(form.getByRole("region", { name: "Review before submitting" })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(tags).analyze()).violations).toEqual([]);
});
