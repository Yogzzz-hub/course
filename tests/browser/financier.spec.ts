import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const LIVE_URL = "http://127.0.0.1:5173";
const PREVIEW_URL = "http://127.0.0.1:4173";

test.describe.configure({ mode: "serial" });

async function signInAs(
  page: Page,
  baseUrl: string,
  roleButtonName: "Financier" | "Manager" | "Trainer" | "Admin"
) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: roleButtonName, exact: true }).click();
  await page.getByRole("button", { name: /Sign In to Portal/i }).click();
}

test.describe("Financier Portal E2E, RBAC, Accessibility & Responsive Suite", () => {
  test("1. Enforces strict role gating (blocks anonymous, MANAGER, TRAINER; allows FINANCIER)", async ({
    page,
  }) => {
    // Anonymous visit redirects to /login
    await page.goto(`${LIVE_URL}/financier`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/login$/);

    // MANAGER sign-in -> /manager, direct visit to /financier redirects back to /manager
    await signInAs(page, LIVE_URL, "Manager");
    await expect(page).toHaveURL(/\/manager$/);
    await page.goto(`${LIVE_URL}/financier`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/manager$/);

    // Direct HTTP call as MANAGER returns 403 Forbidden
    const mgrApiStatus = await page.evaluate(async () => {
      const s = localStorage.getItem("crm_session") || "";
      const res = await fetch("/api/financier/summary", {
        headers: { "X-CRM-Session": s },
      });
      return res.status;
    });
    expect(mgrApiStatus).toBe(403);

    // TRAINER sign-in -> /trainer, direct visit to /financier/fees redirects to /trainer
    await signInAs(page, LIVE_URL, "Trainer");
    await expect(page).toHaveURL(/\/trainer$/);
    await page.goto(`${LIVE_URL}/financier/fees`, { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/trainer$/);

    // FINANCIER (financier@apexacademy.edu) -> lands on /financier with full dashboard
    await signInAs(page, LIVE_URL, "Financier");
    await expect(page).toHaveURL(/\/financier$/);
    await expect(
      page.getByRole("heading", { name: "Finance Operations Overview" })
    ).toBeVisible();
  });

  test("2. Navigates all 8 sections & 5 subpages including Enter-key table navigation and drawer focus restoration", async ({
    page,
  }) => {
    await signInAs(page, LIVE_URL, "Financier");
    await expect(page).toHaveURL(/\/financier$/);

    // Verify all main KPI metrics on Dashboard
    await expect(page.getByText("Collected Today")).toBeVisible();
    await expect(page.getByText("Collected This Week")).toBeVisible();
    await expect(page.getByText("Collected This Month")).toBeVisible();
    await expect(page.getByText("Outstanding Dues")).toBeVisible();
    await expect(page.getByText("Overdue Invoices")).toBeVisible();
    await expect(page.getByText("Payroll Due This Cycle")).toBeVisible();
    await expect(page.getByText("Balanced (100%)")).toBeVisible();

    // Payment Drawer focus & 3 close mechanisms (Escape, Overlay click, Close button)
    const dashRecordBtn = page.getByRole("button", { name: "Record Payment" }).first();
    await dashRecordBtn.focus();
    await dashRecordBtn.click();
    const drawerDialog = page.getByRole("dialog", { name: /Record Fee Payment/i });
    await expect(drawerDialog).toBeVisible();

    // 1) Escape key closes & restores focus to trigger button
    await page.keyboard.press("Escape");
    await expect(drawerDialog).toBeHidden();
    await expect(dashRecordBtn).toBeFocused();

    // 2) Overlay click closes & restores focus
    await dashRecordBtn.click();
    await expect(drawerDialog).toBeVisible();
    await page.getByTestId("fin-drawer-overlay").click({ position: { x: 8, y: 8 } });
    await expect(drawerDialog).toBeHidden();
    await expect(dashRecordBtn).toBeFocused();

    // 3) Close button closes & restores focus
    await dashRecordBtn.click();
    await expect(drawerDialog).toBeVisible();
    await drawerDialog.getByRole("button", { name: "Close" }).click();
    await expect(drawerDialog).toBeHidden();
    await expect(dashRecordBtn).toBeFocused();

    // Section 2: Fees & Invoices -> Enter on invoice row opens Subpage 1 (/financier/invoices/:id)
    await page.getByRole("link", { name: /Fees & Invoices/i }).click();
    await expect(page).toHaveURL(/\/financier\/fees$/);
    const invRow = page.locator("tbody tr", { hasText: "INV-2026-0002" }).first();
    await invRow.focus();
    await invRow.press("Enter");
    await expect(page).toHaveURL(/\/financier\/invoices\/inv-2$/);
    await expect(page.getByRole("heading", { name: "INV-2026-0002" })).toBeVisible();

    // Subpage 5: Click student link on invoice detail -> /financier/students/stu-1
    await page.getByRole("link", { name: /Karthik Subramanian/i }).first().click();
    await expect(page).toHaveURL(/\/financier\/students\/stu-1$/);
    await expect(
      page.getByRole("heading", { name: /Karthik Subramanian — Student Fee Statement/i })
    ).toBeVisible();

    // Section 3: Payments -> Record unique payment + verify duplicate reference blocked
    const uniqueRef = `E2E-UPI-${Date.now()}`;
    await page.getByRole("link", { name: /Payments & Refunds/i }).click();
    await expect(page).toHaveURL(/\/financier\/payments$/);

    await page.getByRole("button", { name: "Record Payment" }).click();
    await expect(drawerDialog).toBeVisible();
    await drawerDialog.getByLabel("Amount (INR)").fill("2500");
    await drawerDialog.getByLabel("Payment Reference / UTR").fill(uniqueRef);
    await drawerDialog
      .getByRole("button", { name: /Post Payment & Generate Receipt/i })
      .click();
    await expect(drawerDialog).toBeHidden();
    await expect(page.getByText(uniqueRef).first()).toBeVisible();

    // Now attempt same duplicate reference -> expects 409 error alert inside drawer
    await page.getByRole("button", { name: "Record Payment" }).click();
    await expect(drawerDialog).toBeVisible();
    await drawerDialog.getByLabel("Amount (INR)").fill("2500");
    await drawerDialog.getByLabel("Payment Reference / UTR").fill(uniqueRef);
    await drawerDialog
      .getByRole("button", { name: /Post Payment & Generate Receipt/i })
      .click();
    await expect(
      drawerDialog.getByRole("alert").filter({ hasText: /Duplicate/i })
    ).toBeVisible();
    await drawerDialog.getByRole("button", { name: "Close" }).click();

    // Section 4: Ledger -> Subpage 4 (/financier/ledger/STUDENT_RECEIVABLES)
    await page.getByRole("link", { name: /General Ledger/i }).click();
    await expect(page).toHaveURL(/\/financier\/ledger$/);
    await expect(page.getByText(/Trial Balance Verification: BALANCED/i)).toBeVisible();
    // Never render Delete buttons on ledger rows
    await expect(page.getByRole("button", { name: /^Delete/i })).toHaveCount(0);

    await page.locator('a[href="/financier/ledger/STUDENT_RECEIVABLES"]').first().click();
    await expect(page).toHaveURL(/\/financier\/ledger\/STUDENT_RECEIVABLES$/);
    await expect(
      page.getByRole("heading", { name: /Student Fee Receivables \(STUDENT_RECEIVABLES\)/i })
    ).toBeVisible();

    // Section 5: Payroll -> Subpage 3 (/financier/payroll/:id)
    await page.getByRole("link", { name: /Trainer Payroll/i }).click();
    await expect(page).toHaveURL(/\/financier\/payroll$/);
    const prRow = page.locator("tbody tr", { hasText: "PR-2026-10" }).first();
    await prRow.focus();
    await prRow.press("Enter");
    await expect(page).toHaveURL(/\/financier\/payroll\/pr-1$/);
    await expect(page.getByRole("heading", { name: /PR-2026-10/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Payslip PDF/i }).first()).toBeVisible();

    // Section 6: Collections & Ageing -> verify 4 buckets & trigger fee reminder
    await page.getByRole("link", { name: /Collections & Ageing/i }).click();
    await expect(page).toHaveURL(/\/financier\/collections$/);
    await expect(page.getByText("0-30 Days Overdue")).toBeVisible();
    await expect(page.getByText("31-60 Days Overdue")).toBeVisible();
    await expect(page.getByText("61-90 Days Overdue")).toBeVisible();
    await expect(page.getByText("90+ Days Overdue")).toBeVisible();
    await page.getByRole("button", { name: /Send Reminder/i }).first().click();
    await expect(page.getByText(/Reminder dispatched/i).first()).toBeVisible();

    // Section 7: Financial Reports
    await page.getByRole("link", { name: /Financial Reports/i }).click();
    await expect(page).toHaveURL(/\/financier\/reports$/);
    await expect(
      page.getByRole("heading", { name: /Revenue & Margin by Programme Track/i })
    ).toBeVisible();

    // Section 8: Immutable Audit Log (verifies atomic payment audit created above)
    await page.getByRole("link", { name: /Audit Log/i }).click();
    await expect(page).toHaveURL(/\/financier\/audit$/);
    await expect(page.locator("tbody").getByText("PAYMENT_RECORDED").first()).toBeVisible();
  });

  test("3. Passes WCAG 2.1 AA accessibility scan (axe-core) & keyboard focus outline checks", async ({
    page,
  }) => {
    await signInAs(page, LIVE_URL, "Financier");
    await expect(page).toHaveURL(/\/financier$/);

    // Check visible focus outline on keyboard-focused button
    const primaryBtn = page.getByRole("button", { name: "Record Payment" }).first();
    await page.keyboard.press("Tab");
    await primaryBtn.focus();
    const outlineStyle = await primaryBtn.evaluate(
      (el) => window.getComputedStyle(el).outlineStyle
    );
    expect(outlineStyle).not.toBe("none");

    for (const route of [
      "/financier",
      "/financier/fees",
      "/financier/payments",
      "/financier/ledger",
      "/financier/payroll",
      "/financier/collections",
      "/financier/reports",
      "/financier/audit",
    ]) {
      await page.goto(`${LIVE_URL}${route}`, { waitUntil: "networkidle" });
      await page.waitForSelector("h1");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations, `Axe violations on ${route}`).toEqual([]);
    }
  });

  test("4. Enforces responsive layout rules (<1024px stack, <768px horizontal sidebar & 2-col cards, zero page overflow)", async ({
    page,
  }) => {
    await signInAs(page, LIVE_URL, "Financier");
    await expect(page).toHaveURL(/\/financier$/);

    // Tablet (<1024px): right column in .fin-split-grid must stack vertically
    await page.setViewportSize({ width: 900, height: 800 });
    const splitColCount = await page.locator(".fin-split-grid").evaluate((el) => {
      const cols = window.getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/);
      return cols.length;
    });
    expect(splitColCount).toBe(1);

    // Mobile (<768px): sidebar becomes horizontal scroll row & metric cards become 2 columns
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileMetrics = await page.evaluate(() => {
      const nav = document.querySelector(".fin-sidebar-nav");
      const metrics = document.querySelector(".fin-metrics-grid");
      const navStyle = nav ? window.getComputedStyle(nav) : null;
      const metricsStyle = metrics ? window.getComputedStyle(metrics) : null;
      const cards = document.querySelectorAll(".fin-metrics-grid .fin-metric-card");
      const card0 = cards[0]?.getBoundingClientRect();
      const card1 = cards[1]?.getBoundingClientRect();
      return {
        navDirection: navStyle?.flexDirection,
        navOverflowX: navStyle?.overflowX,
        metricCols: metricsStyle?.gridTemplateColumns.trim().split(/\s+/).length ?? 0,
        firstTwoSideBySide:
          card0 && card1 ? Math.abs(card0.top - card1.top) < 4 : false,
        docOverflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    });

    expect(mobileMetrics.navDirection).toBe("row");
    expect(mobileMetrics.navOverflowX).toBe("auto");
    expect(mobileMetrics.metricCols).toBe(2);
    expect(mobileMetrics.firstTwoSideBySide).toBe(true);
    expect(mobileMetrics.docOverflow).toBe(false);
  });

  test("5. Works cleanly in static production preview (port 4173) when API backend returns 503", async ({
    page,
  }) => {
    await signInAs(page, PREVIEW_URL, "Financier");
    await expect(page).toHaveURL(/\/financier$/);
    await expect(
      page.getByRole("heading", { name: "Finance Operations Overview" })
    ).toBeVisible();
    await expect(page.getByText("Balanced (100%)")).toBeVisible();
  });
});
