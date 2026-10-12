import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  enrolledSession,
  future,
  prospectSession,
  studentAssignment,
  studentDashboard,
  studentMentorship,
  studentPayments,
  studentPlan,
} from "../student-fixtures";
import type {
  PaymentOrder,
  StudentSession,
} from "../../src/components/student-panel/contracts";

async function mockStudentApi(
  page: Page,
  options: {
    mode?: "prospect" | "enrolled";
    anonymous?: boolean;
    noPlan?: boolean;
    malformed?: boolean;
    failCheckout?: boolean;
    failSubmission?: boolean;
    slotConflict?: boolean;
    uncertainBooking?: boolean;
    emptySlots?: boolean;
    noEntitlement?: boolean;
    dashboardError?: boolean;
  } = {},
) {
  let session: StudentSession | null = options.anonymous
    ? null
    : structuredClone(
        options.mode === "enrolled" ? enrolledSession : prospectSession,
      );
  let assignment = structuredClone(studentAssignment);
  let mentorship = structuredClone(studentMentorship);
  const dashboard = structuredClone(studentDashboard);
  const payments = structuredClone(studentPayments);
  if (options.noEntitlement)
    mentorship.entitlement = { total: 3, used: 2, reserved: 1 };
  let expired = false,
    checkoutCalls = 0,
    submissionCalls = 0,
    bookingCalls = 0;
  const checkoutKeys: string[] = [],
    submissionKeys: string[] = [];
  const bookingKeys: string[] = [];
  let submittedMultipart = "";
  const order: PaymentOrder = {
    id: "order-1",
    status: "pending",
    amountMinor: 2500000,
    currency: "INR",
    checkoutUrl: "https://checkout.example.test/pay/1",
    expiresAt: future(1),
    receiptUrl: null,
  };
  const slot = {
    id: "mentor-slot-1",
    startsAt: future(2),
    endsAt: new Date(Date.parse(future(2)) + 1800000).toISOString(),
    mentor: "Maya",
  };
  await page.route("**/api/student/**", async (route) => {
    const request = route.request();
    const endpoint = new URL(request.url()).pathname.replace(
      "/api/student",
      "",
    );
    if (expired) return route.fulfill({ status: 401, json: {} });
    if (endpoint === "/session") return route.fulfill({ json: { session } });
    if (endpoint === "/learning-plan")
      return route.fulfill({
        json: options.noPlan ? null : options.malformed ? {} : studentPlan,
      });
    if (endpoint === "/sessions")
      return route.fulfill({
        json: {
          sessions: [
            {
              id: "counselling-1",
              title: "Programme counselling",
              startsAt: future(1),
              status: "booked",
              joinUrl: "https://meet.example.test/counselling",
            },
          ],
        },
      });
    if (endpoint === "/dashboard")
      return route.fulfill(
        options.dashboardError
          ? { status: 503, json: {} }
          : { json: dashboard },
      );
    if (endpoint === "/payments") return route.fulfill({ json: payments });
    if (endpoint === "/checkout") {
      checkoutCalls++;
      checkoutKeys.push(request.headers()["idempotency-key"]);
      expect(request.headers()["x-csrf-token"]).toBe("test-csrf");
      expect(request.postDataJSON()).toMatchObject({
        termsVersion: studentPlan.terms.version,
        consent: true,
        planVersion: studentPlan.version,
      });
      if (options.failCheckout && checkoutCalls === 1)
        return route.fulfill({ status: 502, json: {} });
      if (session?.mode === "prospect")
        session = {
          ...session,
          leadStatus: "payment_pending",
          pendingOrderId: order.id,
        };
      return route.fulfill({ json: order });
    }
    if (endpoint === "/orders/order-1") return route.fulfill({ json: order });
    if (endpoint === "/instalments/instalment-1/checkout") {
      payments.instalments[0].status = "processing";
      payments.instalments[0].pendingOrderId = order.id;
      return route.fulfill({ json: order });
    }
    if (endpoint === "/assignments")
      return route.fulfill({ json: { assignments: [assignment] } });
    if (endpoint === "/assignments/assignment-1/submissions") {
      submissionCalls++;
      submissionKeys.push(request.headers()["idempotency-key"]);
      submittedMultipart = request.postData() || "";
      if (options.failSubmission && submissionCalls === 1)
        return route.fulfill({ status: 502, json: {} });
      assignment = {
        ...assignment,
        attempts: [
          {
            id: "attempt-1",
            number: 1,
            submittedAt: new Date().toISOString(),
            status: "submitted",
            repositoryUrl: "https://github.com/asha/task-api",
            liveUrl: null,
            attachmentName: "project.pdf",
            feedback: null,
            scores: [],
          },
        ],
      };
      return route.fulfill({ json: assignment });
    }
    if (endpoint === "/mentorship") return route.fulfill({ json: mentorship });
    if (endpoint === "/mentorship/slots")
      return route.fulfill({
        json: { slots: options.emptySlots ? [] : [slot] },
      });
    if (endpoint === "/mentorship/bookings") {
      bookingCalls++;
      bookingKeys.push(request.headers()["idempotency-key"]);
      if (options.uncertainBooking && bookingCalls === 1)
        return route.fulfill({ status: 502, json: {} });
      if (options.slotConflict && bookingCalls === 1)
        return route.fulfill({ status: 409, json: {} });
      mentorship = {
        ...mentorship,
        entitlement: {
          ...mentorship.entitlement,
          reserved: mentorship.entitlement.reserved + 1,
        },
        bookings: [
          {
            id: "mentorship-1",
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            mentor: slot.mentor,
            status: "booked",
            joinUrl: "https://meet.example.test/mentorship",
          },
        ],
      };
      return route.fulfill({ json: mentorship });
    }
    if (endpoint === "/onboarding/profile/complete") {
      dashboard.onboarding[0].completed = true;
      return route.fulfill({ json: dashboard });
    }
    if (endpoint === "/logout") {
      session = null;
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  return {
    checkoutKeys,
    submissionKeys,
    bookingKeys,
    get checkoutCalls() {
      return checkoutCalls;
    },
    get submissionCalls() {
      return submissionCalls;
    },
    get submittedMultipart() {
      return submittedMultipart;
    },
    get bookingCalls() {
      return bookingCalls;
    },
    expire() {
      expired = true;
    },
    verify() {
      order.status = "verified";
      order.receiptUrl = "https://receipts.example.test/order-1";
      session = structuredClone(enrolledSession);
      payments.instalments[0].status = "paid";
      payments.instalments[0].pendingOrderId = null;
    },
    pending() {
      if (session?.mode === "prospect")
        session = {
          ...session,
          pendingOrderId: order.id,
          leadStatus: "payment_pending",
        };
    },
  };
}
function desktopNav(page: Page) {
  return page.getByRole("navigation", {
    name: "Workspace navigation",
    exact: true,
  });
}
async function fillCheckout(page: Page) {
  await page
    .getByLabel("Billing address", { exact: true })
    .fill("123 Academy Road");
  await page.getByLabel("City", { exact: true }).fill("Bengaluru");
  await page.getByLabel("Postal code", { exact: true }).fill("560001");
  await page
    .getByRole("checkbox", { name: /I agree to the enrolment terms/ })
    .check();
}
async function openMentorship(page: Page) {
  await desktopNav(page)
    .getByRole("button", { name: "Mentorship & attendance", exact: true })
    .click();
}

test("unauthenticated panel requires sign-in and remains noindex", async ({
  page,
}) => {
  await mockStudentApi(page, { anonymous: true });
  await page.goto("/student-panel");
  await expect(
    page.getByRole("heading", { name: "Welcome to your student workspace." }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  await expect(
    page.getByRole("link", { name: "Sign in securely" }),
  ).toHaveAttribute("href", "/auth/sign-in?returnTo=%2Fstudent-panel");
});

test("private prerender contains no student data and the authenticated loading state is accessible", async ({
  page,
  request,
}) => {
  const html = await (await request.get("/student-panel")).text();
  expect(html).not.toContain("asha@example.test");
  expect(html).not.toContain(studentPlan.summary);
  expect(html).toContain("noindex, nofollow");
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await mockStudentApi(page);
  await page.route("**/api/student/session", async (route) => {
    await gate;
    await route.fulfill({ json: { session: prospectSession } });
  });
  await page.goto("/student-panel");
  await expect(page.getByRole("status")).toContainText(
    "Loading your workspace",
  );
  release();
  await expect(
    page.getByText("Prospect workspace", { exact: true }),
  ).toBeVisible();
});

test("enrolled instalment checkout reconciles the verified payment and receipt", async ({
  page,
}) => {
  const api = await mockStudentApi(page, { mode: "enrolled" });
  await page.goto("/student-panel");
  await desktopNav(page)
    .getByRole("button", { name: "Payments", exact: true })
    .click();
  await page.getByRole("button", { name: "Pay instalment" }).click();
  await expect(
    page.getByRole("heading", { name: "Awaiting payment confirmation" }),
  ).toBeVisible();
  await page.reload();
  await desktopNav(page)
    .getByRole("button", { name: "Payments", exact: true })
    .click();
  await page.getByRole("button", { name: "View payment status" }).click();
  await expect(
    page.getByRole("heading", { name: "Awaiting payment confirmation" }),
  ).toBeVisible();
  api.verify();
  await page.getByRole("button", { name: "Check payment status" }).click();
  await expect(
    page.getByRole("heading", { name: "Payment verified" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "View receipt" })).toBeVisible();
  await page.getByRole("button", { name: "Back to payments" }).click();
  await expect(page.getByText("paid", { exact: true })).toBeVisible();
});
test("prospect workspace shows next step, comparisons and exact package fees", async ({
  page,
}) => {
  await mockStudentApi(page);
  await page.goto("/student-panel");
  await expect(
    page.getByText("Prospect workspace", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review my plan" }).click();
  await expect(
    page.getByRole("heading", { name: "Python Full-Stack" }),
  ).toBeVisible();
  await expect(
    page.getByText("₹74,999.00", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("radio", { name: /Standard/ }).check();
  await expect(
    page.getByRole("heading", { name: "Standard · Fee breakdown" }),
  ).toBeVisible();
  await expect(page.getByText("₹20,000.00", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Review terms/ })).toContainText(
    "2026-10",
  );
});
test("checkout validates billing and consent before creating an order", async ({
  page,
}) => {
  const api = await mockStudentApi(page);
  await page.goto("/student-panel");
  await desktopNav(page)
    .getByRole("button", { name: "Payments", exact: true })
    .click();
  await page.getByRole("button", { name: /Create order/ }).click();
  await expect(
    page.getByLabel("Billing address", { exact: true }),
  ).toBeFocused();
  expect(api.checkoutCalls).toBe(0);
  await fillCheckout(page);
  await page.getByRole("button", { name: /Create order/ }).click();
  await expect(
    page.getByRole("heading", { name: "Awaiting payment confirmation" }),
  ).toBeVisible();
  expect(api.checkoutCalls).toBe(1);
  await page
    .getByRole("button", { name: "Continue to payment provider" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "payment provider is configured",
  );
});
test("ambiguous checkout retries the same idempotency key with locked billing", async ({
  page,
}) => {
  const api = await mockStudentApi(page, { failCheckout: true });
  await page.goto("/student-panel");
  await desktopNav(page)
    .getByRole("button", { name: "Payments", exact: true })
    .click();
  await fillCheckout(page);
  await page.getByRole("button", { name: /Create order/ }).click();
  await expect(page.getByRole("alert")).toContainText("result is uncertain");
  await expect(
    page.getByLabel("Billing address", { exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Retry order safely" }).click();
  await expect(
    page.getByRole("heading", { name: "Awaiting payment confirmation" }),
  ).toBeVisible();
  expect(api.checkoutKeys).toHaveLength(2);
  expect(api.checkoutKeys[0]).toBe(api.checkoutKeys[1]);
});
test("gateway return claims cannot enrol; verified server payment switches mode automatically", async ({
  page,
}) => {
  const api = await mockStudentApi(page);
  api.pending();
  await page.goto("/student-panel?paid=true&status=success");
  await expect(
    page.getByText("Prospect workspace", { exact: true }),
  ).toBeVisible();
  await desktopNav(page)
    .getByRole("button", { name: "Payments", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Awaiting payment confirmation" }),
  ).toBeVisible();
  api.verify();
  await expect(
    page.getByText("Enrolled workspace", { exact: true }),
  ).toBeVisible({ timeout: 12000 });
  await expect(
    page.getByRole("link", { name: "Join live class" }),
  ).toBeVisible();
});
test("enrolled dashboard shows progress, deadlines, instalments and server-updated onboarding", async ({
  page,
}) => {
  await mockStudentApi(page, { mode: "enrolled" });
  await page.goto("/student-panel");
  await expect(page.getByText("80% complete")).toBeVisible();
  await expect(
    page.getByText("Build a task API", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Upcoming instalment ·/)).toBeVisible();
  await page
    .getByRole("button", { name: "Mark Complete your profile complete" })
    .click();
  await expect(page.getByText("2/2", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Mark .* complete/ }),
  ).toHaveCount(0);
});
test("assignment upload validates URLs then submits multipart work with an attempt record", async ({
  page,
}) => {
  const api = await mockStudentApi(page, { mode: "enrolled" });
  await page.goto("/student-panel");
  await desktopNav(page)
    .getByRole("button", { name: "Assignments & projects" })
    .click();
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByRole("alert")).toContainText("Add a repository");
  await page
    .getByLabel("Repository URL", { exact: true })
    .fill("http://github.com/asha/task-api");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByRole("alert")).toContainText("HTTPS");
  await page
    .getByLabel("Repository URL", { exact: true })
    .fill("https://github.com/asha/task-api");
  await page.getByLabel("File attachment").setInputFiles({
    name: "project.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 test"),
  });
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByRole("heading", { name: "Attempt 1" })).toBeVisible();
  expect(api.submissionCalls).toBe(1);
  expect(api.submittedMultipart).toContain("project.pdf");
  expect(api.submittedMultipart).toContain("https://github.com/asha/task-api");
});
test("uncertain assignment submission freezes fields and safely recovers the same attempt", async ({
  page,
}) => {
  const api = await mockStudentApi(page, {
    mode: "enrolled",
    failSubmission: true,
  });
  await page.goto("/student-panel");
  await desktopNav(page)
    .getByRole("button", { name: "Assignments & projects" })
    .click();
  await page
    .getByLabel("Repository URL", { exact: true })
    .fill("https://github.com/asha/task-api");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByRole("alert")).toContainText("result is uncertain");
  await expect(
    page.getByLabel("Repository URL", { exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Retry submission safely" }).click();
  await expect(page.getByRole("heading", { name: "Attempt 1" })).toBeVisible();
  expect(api.submissionKeys[0]).toBe(api.submissionKeys[1]);
});
test("mentorship atomically updates entitlement and displays per-class attendance", async ({
  page,
}) => {
  const api = await mockStudentApi(page, { mode: "enrolled" });
  await page.goto("/student-panel");
  await openMentorship(page);
  await expect(page.getByText("3", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "present", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("group", { name: "Available mentorship times" })
    .getByRole("button")
    .first()
    .click();
  await page
    .getByRole("button", { name: "Confirm mentorship booking" })
    .click();
  await expect(
    page.getByRole("link", { name: "Join mentorship session" }),
  ).toBeVisible();
  await expect(page.getByText("2", { exact: true })).toBeVisible();
  expect(api.bookingCalls).toBe(1);
});
test("mentor slot conflicts preserve entitlement and allow a refreshed selection", async ({
  page,
}) => {
  const api = await mockStudentApi(page, {
    mode: "enrolled",
    slotConflict: true,
  });
  await page.goto("/student-panel");
  await openMentorship(page);
  await page
    .getByRole("group", { name: "Available mentorship times" })
    .getByRole("button")
    .first()
    .click();
  await page
    .getByRole("button", { name: "Confirm mentorship booking" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "slot is no longer available",
  );
  await expect(page.getByText("3", { exact: true })).toBeVisible();
  await page
    .getByRole("group", { name: "Available mentorship times" })
    .getByRole("button")
    .first()
    .click();
  await page
    .getByRole("button", { name: "Confirm mentorship booking" })
    .click();
  await expect(
    page.getByRole("link", { name: "Join mentorship session" }),
  ).toBeVisible();
  expect(api.bookingKeys[0]).not.toBe(api.bookingKeys[1]);
});
test("empty plan and unavailable mentor slots have actionable empty states", async ({
  page,
}) => {
  await mockStudentApi(page, { noPlan: true });
  await page.goto("/student-panel");
  await page.getByRole("button", { name: "Review my plan" }).click();
  await expect(
    page.getByRole("heading", { name: "Your learning plan is on its way" }),
  ).toBeVisible();
  await page.unroute("**/api/student/**");
  await mockStudentApi(page, { mode: "enrolled", emptySlots: true });
  await page.reload();
  await openMentorship(page);
  await expect(
    page.getByRole("heading", { name: "No available sessions" }),
  ).toBeVisible();
});
test("no entitlement prevents mentorship booking", async ({ page }) => {
  await mockStudentApi(page, { mode: "enrolled", noEntitlement: true });
  await page.goto("/student-panel");
  await openMentorship(page);
  await expect(page.getByRole("status")).toContainText("all included sessions");
  await expect(
    page.getByRole("button", { name: "Confirm mentorship booking" }),
  ).toHaveCount(0);
});
test("malformed API responses show a recoverable error", async ({ page }) => {
  await mockStudentApi(page, { malformed: true });
  await page.goto("/student-panel");
  await page.getByRole("button", { name: "Review my plan" }).click();
  await expect(page.getByRole("alert")).toContainText("incomplete information");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});
test("resource authentication failure clears private views and requests sign-in", async ({
  page,
}) => {
  const api = await mockStudentApi(page, { mode: "enrolled" });
  await page.goto("/student-panel");
  await expect(
    page.getByRole("link", { name: "Join live class" }),
  ).toBeVisible();
  api.expire();
  await desktopNav(page)
    .getByRole("button", { name: "Assignments & projects" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your session has expired." }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Workspace navigation", exact: true }),
  ).toHaveCount(0);
});
test("sign-out removes the authenticated workspace", async ({ page }) => {
  await mockStudentApi(page, { mode: "enrolled" });
  await page.goto("/student-panel");
  await desktopNav(page)
    .getByRole("button", { name: "More", exact: true })
    .click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("link", { name: "Sign in securely" }),
  ).toBeVisible();
});
test("both modes support mobile tabs and stay within the viewport", async ({
  page,
}) => {
  for (const mode of ["prospect", "enrolled"] as const) {
    await page.unroute("**/api/student/**");
    await mockStudentApi(page, { mode });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 850 });
      await page.goto("/student-panel");
      const nav =
        width < 1024
          ? page.getByRole("navigation", {
              name: "Mobile workspace navigation",
            })
          : desktopNav(page);
      await expect(nav).toBeVisible();
      for (const name of [
        "Home",
        "Schedule",
        width < 1024
          ? mode === "enrolled"
            ? "Assignments"
            : "Sessions"
          : mode === "enrolled"
            ? "Assignments & projects"
            : "My learning plan",
        "Payments",
        "More",
      ]) {
        await nav.getByRole("button", { name, exact: true }).click();
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBe(true);
      }
      if (width >= 1024) {
        await page.getByRole("button", { name: "Collapse sidebar" }).click();
        await expect(
          page.getByRole("button", { name: "Expand sidebar" }),
        ).toBeVisible();
      }
    }
  }
});
test("prospect checkout and enrolled screens pass accessibility checks", async ({
  page,
}) => {
  await mockStudentApi(page);
  await page.goto("/student-panel");
  await desktopNav(page)
    .getByRole("button", { name: "Payments", exact: true })
    .click();
  await expect(page.getByLabel("Billing name")).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include(".ss-student").analyze())
      .violations,
  ).toEqual([]);
  await page.unroute("**/api/student/**");
  await mockStudentApi(page, { mode: "enrolled" });
  await page.reload();
  await expect(page.getByText("80% complete")).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include(".ss-student").analyze())
      .violations,
  ).toEqual([]);
  await openMentorship(page);
  await expect(page.getByRole("table")).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).include(".ss-student").analyze())
      .violations,
  ).toEqual([]);
});

test("uncertain mentorship booking locks the selection and recovers on retry", async ({
  page,
}) => {
  const api = await mockStudentApi(page, {
    mode: "enrolled",
    uncertainBooking: true,
  });
  await page.goto("/student-panel");
  await openMentorship(page);
  await page
    .getByRole("group", { name: "Available mentorship times" })
    .getByRole("button")
    .first()
    .click();
  await page
    .getByRole("button", { name: "Confirm mentorship booking" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "booking result is uncertain",
  );
  await expect(page.getByLabel("Time zone", { exact: true })).toBeDisabled();
  await page
    .getByRole("button", { name: "Retry mentorship booking safely" })
    .click();
  await expect(
    page.getByRole("link", { name: "Join mentorship session" }),
  ).toBeVisible();
  expect(api.bookingCalls).toBe(2);
  expect(api.bookingKeys[0]).toBe(api.bookingKeys[1]);
});

test("render errors are isolated and can be reset without losing the workspace", async ({
  page,
}) => {
  await mockStudentApi(page);
  await page.goto("/student-panel");
  await expect(
    page.getByRole("button", { name: "Review my plan" }),
  ).toBeVisible();
  await page.evaluate(() => {
    const original = Intl.NumberFormat;
    (
      window as typeof window & { restoreNumberFormat?: () => void }
    ).restoreNumberFormat = () => {
      Intl.NumberFormat = original;
    };
    Intl.NumberFormat = new Proxy(original, {
      construct() {
        throw new Error("Injected render failure");
      },
    });
  });
  await page.getByRole("button", { name: "Review my plan" }).click();
  await expect(page.getByRole("alert")).toContainText("could not load");
  await expect(desktopNav(page)).toBeVisible();
  await page.evaluate(() =>
    (
      window as typeof window & { restoreNumberFormat?: () => void }
    ).restoreNumberFormat?.(),
  );
  await page.getByRole("button", { name: "Reload this section" }).click();
  await expect(
    page.getByRole("heading", { name: "Python Full-Stack" }),
  ).toBeVisible();
});
