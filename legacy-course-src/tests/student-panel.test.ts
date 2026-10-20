import { describe, expect, it, vi } from "vitest";
import {
  createHostedPaymentGateway,
  createHttpStudentApi,
  StudentApiError,
} from "../src/components/student-panel/api";
import {
  assignmentSchema,
  dashboardSchema,
  learningPlanSchema,
  mentorshipSchema,
  safeLink,
  sessionSchema,
  type PaymentOrder,
} from "../src/components/student-panel/contracts";
import {
  dayKey,
  money,
  nextStep,
  submissionError,
} from "../src/components/student-panel/utils";
import {
  enrolledSession,
  future,
  studentAssignment,
  studentDashboard,
  studentMentorship,
  studentPlan,
} from "./student-fixtures";

describe("Student Panel contract and security boundaries", () => {
  it("rejects checkout orders whose charge differs from the consented quote", async () => {
    const api = createHttpStudentApi({
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              id: "order-1",
              status: "pending",
              amountMinor: 9999999,
              currency: "INR",
              checkoutUrl: null,
              expiresAt: future(1),
              receiptUrl: null,
            }),
          ),
        ),
    });
    await expect(
      api.checkout(
        {
          planId: "plan-1",
          planVersion: "v2",
          packageId: "premium",
          termsVersion: "2026-10",
          consent: true,
          expectedAmountMinor: 2500000,
          currency: "INR",
          billing: {
            name: "Asha Rao",
            email: "asha@example.test",
            address: "123 Academy Road",
            city: "Bengaluru",
            country: "IN",
            postalCode: "560001",
          },
        },
        { csrfToken: "csrf", requestId: "request-1" },
      ),
    ).rejects.toMatchObject({ code: "contract" });
  });
  it("requires verified payment metadata for enrolled sessions", () => {
    expect(sessionSchema.safeParse(enrolledSession).success).toBe(true);
    expect(
      sessionSchema.safeParse({
        ...enrolledSession,
        payment: { status: "pending" },
      }).success,
    ).toBe(false);
    expect(
      sessionSchema.safeParse({ ...enrolledSession, payment: undefined })
        .success,
    ).toBe(false);
  });
  it("rejects inconsistent fees and unknown recommended packages", () => {
    expect(learningPlanSchema.safeParse(studentPlan).success).toBe(true);
    expect(
      learningPlanSchema.safeParse({
        ...studentPlan,
        packages: [{ ...studentPlan.packages[0], totalMinor: 1 }],
      }).success,
    ).toBe(false);
    expect(
      learningPlanSchema.safeParse({
        ...studentPlan,
        recommendedPackageId: "missing",
      }).success,
    ).toBe(false);
  });
  it("rejects unsafe resource links", () => {
    for (const link of [
      "javascript:alert(1)",
      "//evil.test",
      "/\\evil.test",
      "http://example.test",
      "https://user:pass@example.test",
    ])
      expect(safeLink.safeParse(link).success).toBe(false);
    expect(safeLink.safeParse("/contact").success).toBe(true);
  });
  it("rejects impossible module and entitlement counts", () => {
    expect(
      dashboardSchema.safeParse({
        ...studentDashboard,
        modules: [{ id: "x", title: "x", completed: 20, total: 10 }],
      }).success,
    ).toBe(false);
    expect(
      mentorshipSchema.safeParse({
        ...studentMentorship,
        entitlement: { total: 2, used: 2, reserved: 1 },
      }).success,
    ).toBe(false);
  });
  it("rejects rubric scores outside published criteria", () => {
    const attempt = {
      id: "attempt",
      number: 1,
      submittedAt: future(-1),
      status: "graded",
      repositoryUrl: null,
      liveUrl: null,
      attachmentName: "work.pdf",
      feedback: null,
      scores: [{ rubricId: "functionality", points: 61 }],
    };
    expect(
      assignmentSchema.safeParse({ ...studentAssignment, attempts: [attempt] })
        .success,
    ).toBe(false);
  });
  it("formats minor units according to the currency exponent", () => {
    expect(money(2500000, "INR")).toBe("₹25,000.00");
    expect(money(100, "JPY")).toContain("100");
    expect(money(1234, "KWD")).toContain("1.234");
  });
  it("groups slots by the selected timezone across date boundaries", () => {
    expect(dayKey("2026-10-12T20:00:00Z", "Asia/Kolkata")).toBe("2026-10-13");
    expect(dayKey("2026-10-12T20:00:00Z", "America/New_York")).toBe(
      "2026-10-12",
    );
  });
  it("has a specific next step for every prospect status", () => {
    expect(nextStep("new").action).toBe("Book counselling");
    expect(nextStep("counselling_booked").tab).toBe("schedule");
    expect(nextStep("counselling_complete").tab).toBe("work");
    expect(nextStep("plan_ready").tab).toBe("work");
    expect(nextStep("payment_pending").tab).toBe("payments");
  });
  it("validates submission URLs, file size and type", () => {
    expect(submissionError("", "", null)).toContain("Add a repository");
    expect(submissionError("http://github.test", "", null)).toContain("HTTPS");
    expect(submissionError("https://github.test/repo", "", null)).toBeNull();
    expect(
      submissionError(
        "",
        "",
        new File(["test"], "work.exe", { type: "application/octet-stream" }),
      ),
    ).toContain("PDF");
    expect(
      submissionError(
        "",
        "",
        new File(["test"], "work.pdf", { type: "application/pdf" }),
      ),
    ).toBeNull();
  });
  it("only redirects pending unexpired orders to explicitly allowed HTTPS origins", async () => {
    const navigate = vi.fn();
    const gateway = createHostedPaymentGateway(
      ["https://checkout.example.test"],
      navigate,
    );
    const order: PaymentOrder = {
      id: "order-1",
      status: "pending",
      amountMinor: 2500000,
      currency: "INR",
      checkoutUrl: "https://checkout.example.test/pay/1",
      expiresAt: future(1),
      receiptUrl: null,
    };
    await gateway.open(order);
    expect(navigate).toHaveBeenCalledOnce();
    await expect(
      gateway.open({ ...order, checkoutUrl: "https://evil.test/pay" }),
    ).rejects.toThrow();
    await expect(
      gateway.open({ ...order, status: "verified" }),
    ).rejects.toThrow();
    await expect(
      gateway.open({ ...order, expiresAt: future(-1) }),
    ).rejects.toThrow();
    expect(navigate).toHaveBeenCalledOnce();
  });
  it("sends authenticated CSRF-protected idempotent mutations and validates responses", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify(studentMentorship), { status: 200 }),
      );
    const api = createHttpStudentApi({ fetcher });
    await api.bookMentorship("slot-1", {
      csrfToken: "csrf",
      requestId: "request-1",
    });
    const init = fetcher.mock.calls[0][1]!;
    expect(init.credentials).toBe("include");
    expect(init.headers).toMatchObject({
      "X-CSRF-Token": "csrf",
      "Idempotency-Key": "request-1",
    });
    fetcher.mockResolvedValue(new Response("{}", { status: 200 }));
    await expect(api.dashboard()).rejects.toMatchObject({ code: "contract" });
  });
  it("keeps provider and backend error details out of user-facing exceptions", async () => {
    const api = createHttpStudentApi({
      fetcher: vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response("private backend stack", { status: 401 }),
        ),
    });
    await expect(api.session()).rejects.toEqual(new StudentApiError(401));
  });
  it("times out hung requests and rejects malformed API configuration", async () => {
    const fetcher: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) =>
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        ),
      );
    const api = createHttpStudentApi({ fetcher, timeoutMs: 10 });
    await expect(api.session()).rejects.toMatchObject({
      status: 0,
      code: "network",
    });
    expect(() => createHttpStudentApi({ baseUrl: "//evil.test" })).toThrow();
    expect(() =>
      createHttpStudentApi({ baseUrl: "https://user:pass@example.test" }),
    ).toThrow();
  });
});
