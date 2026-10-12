import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  adminSession,
  adminLeads,
  adminOffers,
  adminFinance,
  adminProgrammes,
  adminReports,
  adminAudit,
  futureAdmin,
} from "../admin-fixtures";
import type {
  AdminCommand,
  AdminSession,
  Operation,
} from "../../src/components/admin-panel/contracts";

async function mockAdmin(
  page: Page,
  options: {
    session?: AdminSession;
    uncertain?: boolean;
    malformed?: boolean;
    denyLeads?: boolean;
    empty?: boolean;
    many?: boolean;
  } = {},
) {
  let session = structuredClone(options.session || adminSession);
  const leads = structuredClone(adminLeads);
  const offers = structuredClone(adminOffers);
  const finance = structuredClone(adminFinance);
  const programmes = structuredClone(adminProgrammes);
  const reports = structuredClone(adminReports);
  const commands: { command: AdminCommand; key: string }[] = [];
  const reads: string[] = [];
  const operations = new Map<string, Operation>();
  let firstUncertain = !!options.uncertain;
  if (options.empty) {
    leads.leads = [];
    offers.offers = [];
    finance.entries = [];
    finance.proofs = [];
    finance.refunds = [];
    programmes.programmes = [];
    reports.funnel = [];
    reports.counsellors = [];
  }
  if (options.many)
    finance.entries = Array.from({ length: 12 }, (_, index) => ({
      ...finance.entries[0],
      id: `payment-${index + 1}`,
      student: `Student ${String(index + 1).padStart(2, "0")}`,
      amountMinor: (index + 1) * 10000,
      refundableMinor: (index + 1) * 10000,
    }));
  await page.route("**/api/admin/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/api/admin", "");
    reads.push(path);
    if (path === "/session")
      return route.fulfill({ json: options.malformed ? {} : session });
    if (path === "/two-factor/verify") {
      expect(request.headers()["x-csrf-token"]).toBe("challenge-csrf");
      expect(request.postDataJSON()).toEqual({
        challengeId: "challenge-1",
        code: "123456",
      });
      session = structuredClone(adminSession);
      return route.fulfill({ json: session });
    }
    if (path === "/logout") {
      session = { state: "anonymous" };
      return route.fulfill({ status: 204 });
    }
    if (path === "/leads")
      return route.fulfill(
        options.denyLeads ? { status: 403, json: {} } : { json: leads },
      );
    if (path.startsWith("/leads/")) return route.fulfill({ json: adminAudit });
    if (path === "/offers") return route.fulfill({ json: offers });
    if (path === "/finance") return route.fulfill({ json: finance });
    if (path === "/programmes") return route.fulfill({ json: programmes });
    if (path === "/reports")
      return route.fulfill({
        json: {
          ...reports,
          from: url.searchParams.get("from"),
          to: url.searchParams.get("to"),
        },
      });
    if (path === "/audit") return route.fulfill({ json: adminAudit });
    if (path === "/operations")
      return route.fulfill({
        json: {
          operations: (url.searchParams.get("ids") || "")
            .split(",")
            .filter(Boolean)
            .map(
              (requestId) =>
                operations.get(requestId) || {
                  requestId,
                  status: "not_found",
                  resourceId: null,
                  message: "No confirmed outcome is available.",
                },
            ),
        },
      });
    if (path.startsWith("/exports/"))
      return route.fulfill({
        json: {
          id: "export-1",
          status: "ready",
          downloadUrl: "/api/admin/exports/export-1/download.csv",
          expiresAt: futureAdmin(),
        },
      });
    if (path === "/search")
      return route.fulfill({
        json: {
          results: [
            {
              id: "lead-1",
              label: "Asha Rao enquiry",
              description: "Python Full Stack lead",
              section: "leads",
            },
            {
              id: "refund-1",
              label: "Restricted payment result",
              description: "Finance details",
              section: "finance",
            },
          ],
        },
      });
    if (path === "/notifications")
      return route.fulfill({
        json: {
          notifications: [
            {
              id: "notification-1",
              title: "New enquiry from Asha",
              at: new Date().toISOString(),
              read: commands.some(
                (item) => item.command.type === "notification.read",
              ),
              section: "leads",
            },
            {
              id: "notification-2",
              title: "Restricted financial alert",
              at: new Date().toISOString(),
              read: false,
              section: "finance",
            },
          ],
        },
      });
    if (path === "/commands") {
      const command = request.postDataJSON() as AdminCommand;
      const key = request.headers()["idempotency-key"];
      expect(key).toMatch(/^[\da-f-]{36}$/);
      expect(request.headers()["x-csrf-token"]).toBe("admin-csrf");
      expect(request.headers()["x-admin-session"]).toBe(
        session.state === "authenticated" ? session.cacheKey : "",
      );
      commands.push({ command, key });
      if (firstUncertain) {
        firstUncertain = false;
        return route.fulfill({ status: 502, json: {} });
      }
      const existing = operations.get(key);
      if (existing) return route.fulfill({ json: existing });
      switch (command.type) {
        case "lead.move": {
          const lead = leads.leads.find((item) => item.id === command.leadId)!;
          expect(command.expectedVersion).toBe(lead.version);
          lead.stage = command.stage;
          lead.version++;
          lead.allowedTransitions = ["scheduled", "lost"];
          break;
        }
        case "offer.decide": {
          const offer = offers.offers.find(
            (item) => item.id === command.offerId,
          )!;
          expect(command.expectedVersion).toBe(offer.version);
          offer.status = command.decision;
          offer.version++;
          break;
        }
        case "proof.review": {
          const proof = finance.proofs.find(
            (item) => item.id === command.proofId,
          )!;
          expect(command.expectedVersion).toBe(proof.version);
          proof.status =
            command.decision === "rejected"
              ? "rejected"
              : command.phase === "first"
                ? "pending_secondary"
                : "verified";
          if (
            command.phase === "first" &&
            command.decision === "approved" &&
            session.state === "authenticated"
          )
            proof.firstReviewerId = session.userId;
          proof.version++;
          break;
        }
        case "refund.request":
          finance.refunds.push({
            id: "refund-new",
            paymentId: command.paymentId,
            version: 1,
            student: "Asha Rao",
            amountMinor: command.amountMinor,
            currency: "INR",
            reason: command.reason,
            requestedBy:
              session.state === "authenticated" ? session.userId : "",
            approvedBy: null,
            status: "requested",
          });
          break;
        case "refund.decide": {
          const refund = finance.refunds.find(
            (item) => item.id === command.refundId,
          )!;
          refund.status = command.decision;
          refund.version++;
          if (
            session.state === "authenticated" &&
            command.decision === "approved"
          )
            refund.approvedBy = session.userId;
          break;
        }
        case "refund.execute": {
          const refund = finance.refunds.find(
            (item) => item.id === command.refundId,
          )!;
          refund.status = "processing";
          refund.version++;
          break;
        }
        case "ledger.reconcile": {
          const entry = finance.entries.find(
            (item) => item.id === command.entryId,
          )!;
          entry.reconciliation = "matched";
          entry.providerReference = command.providerReference;
          entry.version++;
          break;
        }
        case "cms.save": {
          const programme = programmes.programmes.find(
            (item) => item.id === command.programmeId,
          )!;
          expect(command.expectedRevision).toBe(programme.revision);
          programme.versions.push({
            id: "version-3",
            number: 3,
            status: "draft",
            createdAt: new Date().toISOString(),
            packages: command.packages,
          });
          programme.revision++;
          break;
        }
        case "cms.publish": {
          const programme = programmes.programmes.find(
            (item) => item.id === command.programmeId,
          )!;
          expect(command.expectedRevision).toBe(programme.revision);
          programme.versions.forEach((item) => {
            if (item.status === "published") item.status = "archived";
            if (item.id === command.versionId) item.status = "published";
          });
          programme.publishedVersionId = command.versionId;
          programme.buildStatus = "queued";
          programme.revision++;
          break;
        }
        case "cms.rebuild":
          programmes.programmes[0].buildStatus = "queued";
          programmes.programmes[0].revision++;
          break;
        case "reports.export":
          break;
        case "notification.read":
          break;
      }
      const result: Operation = {
        requestId: key,
        status: "succeeded",
        resourceId: command.type === "reports.export" ? "export-1" : null,
        message: "Change confirmed by the server.",
      };
      operations.set(key, result);
      return route.fulfill({ json: result });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  return {
    commands,
    reads,
    setSession: (value: AdminSession) => {
      session = structuredClone(value);
    },
    finance,
    programmes,
    operations,
  };
}
async function open(page: Page, section = "Leads pipeline") {
  await page.goto("/admin-panel");
  await expect(
    page.getByRole("heading", { name: "Leads pipeline", exact: true }),
  ).toBeVisible();
  if (section !== "Leads pipeline") {
    await page
      .getByRole("navigation", { name: "Admin navigation", exact: true })
      .getByRole("button", { name: section, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: section, exact: true }),
    ).toBeVisible();
  }
}

test("requires two-factor verification before fetching private resources", async ({
  page,
}) => {
  const mock = await mockAdmin(page, {
    session: {
      state: "two_factor_required",
      challengeId: "challenge-1",
      csrfToken: "challenge-csrf",
      maskedEmail: "a***@example.test",
      expiresAt: futureAdmin(),
    },
  });
  await page.goto("/admin-panel");
  await expect(
    page.getByRole("heading", { name: "Verify your admin access" }),
  ).toBeVisible();
  expect(mock.reads).not.toContain("/leads");
  await page.getByLabel("Two-factor verification code").fill("123");
  await expect(
    page.getByRole("button", { name: "Verify and continue" }),
  ).toBeDisabled();
  await page.getByLabel("Two-factor verification code").fill("123456");
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(
    page.getByRole("heading", { name: "Leads pipeline", exact: true }),
  ).toBeVisible();
});
test("anonymous and malformed sessions fail closed and the route stays private", async ({
  page,
}) => {
  const mock = await mockAdmin(page, { session: { state: "anonymous" } });
  await page.goto("/admin-panel");
  await expect(
    page.getByRole("heading", { name: "Sign in to administration" }),
  ).toBeVisible();
  expect(mock.reads).not.toContain("/leads");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  await page.unroute("**/api/admin/**");
  await mockAdmin(page, { malformed: true });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("incomplete information");
  await expect(
    page.getByRole("navigation", { name: "Admin navigation", exact: true }),
  ).toHaveCount(0);
});
test("supports owner filtering, timers, accessible stage moves and audit timelines", async ({
  page,
}) => {
  const mock = await mockAdmin(page);
  await open(page);
  await expect(page.getByText(/Overdue by/)).toBeVisible();
  await page.getByLabel("Filter by owner").selectOption("owner-1");
  await expect(
    page.getByRole("heading", { name: "Noah Singh", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Move Asha Rao").selectOption("contacted");
  await page.getByRole("button", { name: "Update stage", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Contacted leads", exact: true })
      .getByRole("heading", { name: "Asha Rao", exact: true }),
  ).toBeVisible();
  expect(mock.commands[0].command).toMatchObject({
    type: "lead.move",
    expectedVersion: 1,
  });
  await page
    .getByRole("button", { name: "View timeline", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Timeline for Asha Rao" }),
  ).toBeVisible();
  await expect(
    page.getByText("Enquiry verified and assigned to Maya."),
  ).toBeVisible();
});
test("supports drag-and-drop only into an allowed lead stage", async ({
  page,
}) => {
  const mock = await mockAdmin(page);
  await open(page);
  const card = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Asha Rao", exact: true }),
  });
  await card.dragTo(
    page.getByRole("region", { name: "Contacted leads", exact: true }),
  );
  await expect.poll(() => mock.commands.length).toBe(1);
  expect(mock.commands[0].command).toMatchObject({
    type: "lead.move",
    stage: "contacted",
  });
});
test("checks render permissions again after the server revokes access", async ({
  page,
}) => {
  await page.clock.install();
  const mock = await mockAdmin(page);
  await open(page, "Payments & ledger");
  await expect(
    page.getByRole("table", { name: "Financial ledger" }),
  ).toBeVisible();
  mock.setSession({ ...adminSession, permissions: ["leads.read"] });
  await page.clock.fastForward(16000);
  await expect(
    page.getByRole("heading", { name: "Leads pipeline", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Payments & ledger", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Update stage", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("table", { name: "Financial ledger" }),
  ).toHaveCount(0);
});
test("hides private content immediately when two-factor verification expires", async ({
  page,
}) => {
  await page.clock.install();
  await mockAdmin(page, {
    session: {
      ...adminSession,
      twoFactorExpiresAt: new Date(Date.now() + 5000).toISOString(),
    },
  });
  await open(page);
  await page.clock.fastForward(6000);
  await expect(
    page.getByRole("heading", { name: "Your verification has expired" }),
  ).toBeVisible();
  await expect(page.getByText("asha@example.test")).toHaveCount(0);
});
test("a forbidden resource response closes the workspace", async ({ page }) => {
  await mockAdmin(page, { denyLeads: true });
  await page.goto("/admin-panel");
  await expect(
    page.getByRole("heading", { name: "Admin access needs confirmation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Admin navigation", exact: true }),
  ).toHaveCount(0);
});
test("reviews discounts with a required reason and excludes self-approval", async ({
  page,
}) => {
  const mock = await mockAdmin(page);
  await open(page, "Offers & approvals");
  await expect(page.getByRole("table", { name: "Offers" })).toContainText(
    "10%",
  );
  await expect(
    page.getByRole("button", { name: "Approve offer", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Decision reason for Asha Rao")
    .fill("Scholarship evidence has been reviewed.");
  await page
    .getByRole("button", { name: "Approve offer", exact: true })
    .click();
  await expect(page.getByRole("table", { name: "Offers" })).toContainText(
    "approved",
  );
  expect(mock.commands[0].command).toMatchObject({
    type: "offer.decide",
    decision: "approved",
    expectedVersion: 1,
  });
  await page.unroute("**/api/admin/**");
  await mockAdmin(page, {
    session: {
      ...adminSession,
      userId: "counsellor-1",
      cacheKey: "counsellor-session",
    },
  });
  await page.reload();
  await page
    .getByRole("navigation", { name: "Admin navigation", exact: true })
    .getByRole("button", { name: "Offers & approvals", exact: true })
    .click();
  await expect(
    page.getByText("Independent administrator required"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Approve offer", exact: true }),
  ).toHaveCount(0);
});
test("financial retries reuse the original key and frozen payload after an unknown failure", async ({
  page,
}) => {
  const mock = await mockAdmin(page, { uncertain: true });
  await open(page, "Payments & ledger");
  await page
    .getByRole("button", { name: "Request refund", exact: true })
    .click();
  await page.getByLabel("Refund amount (INR)").fill("1000.29");
  await page
    .getByLabel("Reason for Asha Rao", { exact: true })
    .fill("Eligible partial refund after withdrawal.");
  await page
    .getByRole("button", { name: "Submit refund request", exact: true })
    .click();
  await expect(
    page.getByText("Financial request awaiting confirmation", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Refund amount (INR)")).toBeDisabled();
  await page
    .getByRole("button", { name: "Retry original request", exact: true })
    .click();
  await expect.poll(() => mock.commands.length).toBe(2);
  expect(mock.commands[1]).toEqual(mock.commands[0]);
  expect(mock.commands[0].command).toMatchObject({ amountMinor: 100029 });
  await expect(
    page.getByText("Financial request awaiting confirmation", { exact: true }),
  ).toHaveCount(0);
});
test("pending financial operations recover after reload without abandoning unknown outcomes", async ({
  page,
}) => {
  const mock = await mockAdmin(page, { uncertain: true });
  await open(page, "Payments & ledger");
  await page
    .getByRole("button", { name: "Request refund", exact: true })
    .click();
  await page
    .getByLabel("Reason for Asha Rao", { exact: true })
    .fill("Eligible refund after course withdrawal.");
  await page
    .getByRole("button", { name: "Submit refund request", exact: true })
    .click();
  await expect(
    page.getByText("Financial request awaiting confirmation", { exact: true }),
  ).toBeVisible();
  const key = mock.commands[0].key;
  await page.reload();
  await expect(
    page.getByText("Financial request awaiting confirmation", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(`${key}: not_found`, { exact: true }),
  ).toBeVisible();
  mock.operations.set(key, {
    requestId: key,
    status: "failed",
    resourceId: null,
    message: "Request failed before settlement.",
  });
  await page
    .getByRole("button", { name: "Check operation status", exact: true })
    .click();
  await expect(
    page.getByText("Financial request awaiting confirmation", { exact: true }),
  ).toHaveCount(0);
});
test("offline proof verification requires a different secondary administrator", async ({
  page,
}) => {
  const mock = await mockAdmin(page);
  await open(page, "Payments & ledger");
  await page
    .getByRole("button", { name: "Offline proofs", exact: true })
    .click();
  await page
    .getByLabel("Primary review reason for Asha Rao")
    .fill("Bank evidence matches the payment reference.");
  await page
    .getByRole("button", { name: "Approve primary review", exact: true })
    .click();
  await expect(page.getByText("Independent reviewer required")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Verify payment", exact: true }),
  ).toHaveCount(0);
  mock.setSession({
    ...adminSession,
    userId: "admin-3",
    cacheKey: "session-admin-3",
  });
  await page.reload();
  await page
    .getByRole("navigation", { name: "Admin navigation", exact: true })
    .getByRole("button", { name: "Payments & ledger", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Offline proofs", exact: true })
    .click();
  await page
    .getByLabel("Secondary review reason for Asha Rao")
    .fill("Independently checked against bank statement.");
  await page
    .getByRole("button", { name: "Verify payment", exact: true })
    .click();
  await expect(
    page.getByRole("table", { name: "Offline payment proofs" }),
  ).toContainText("Verified");
  expect(mock.commands[1].command).toMatchObject({
    type: "proof.review",
    phase: "second",
    expectedVersion: 2,
  });
});
test("reconciles captured payments and keeps refund approval separate from execution", async ({
  page,
}) => {
  const mock = await mockAdmin(page);
  await open(page, "Payments & ledger");
  await page
    .getByRole("button", { name: "Reconcile payment", exact: true })
    .click();
  await page
    .getByLabel("Provider reference", { exact: true })
    .fill("BANK-MATCH-123");
  await page
    .getByLabel("Reason for Asha Rao", { exact: true })
    .fill("Matched provider settlement and bank ledger.");
  await page
    .getByRole("button", { name: "Confirm reconciliation", exact: true })
    .click();
  await expect(
    page.getByRole("table", { name: "Financial ledger" }),
  ).toContainText("BANK-MATCH-123");
  await page.getByRole("button", { name: "Refunds", exact: true }).click();
  await page
    .getByLabel("Refund decision reason for Asha Rao")
    .fill("Withdrawal policy and entitlement verified.");
  await page
    .getByRole("button", { name: "Approve refund", exact: true })
    .click();
  await page
    .getByLabel("Execution reason for Asha Rao")
    .fill("Execute the independently approved refund.");
  await page
    .getByRole("button", { name: "Execute approved refund", exact: true })
    .click();
  await expect(
    page.getByRole("table", { name: "Refund requests" }),
  ).toContainText("Processing");
  expect(mock.commands.map((item) => item.command.type)).toEqual([
    "ledger.reconcile",
    "refund.decide",
    "refund.execute",
  ]);
});
test("TanStack Table sorts, paginates and filters financial records", async ({
  page,
}) => {
  await mockAdmin(page, { many: true });
  await open(page, "Payments & ledger");
  const table = page.getByRole("table", { name: "Financial ledger" });
  await expect(table.locator("tbody tr")).toHaveCount(10);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(table.locator("tbody tr")).toHaveCount(2);
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await table.getByRole("button", { name: "Amount", exact: true }).click();
  await table.getByRole("button", { name: "Amount", exact: true }).click();
  await expect(table.locator("tbody tr").first()).toContainText("Student 12");
  await page.getByLabel("Filter financial ledger").fill("Student 03");
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(table).toContainText("Student 03");
});
test("creates a validated pricing version and publishes through a rebuild hook", async ({
  page,
}) => {
  const mock = await mockAdmin(page);
  await open(page, "Programmes & pricing");
  await page.getByLabel("Amount 1", { exact: true }).fill("12500.29");
  await page
    .getByRole("button", { name: "Save new draft version", exact: true })
    .click();
  await expect
    .poll(() => mock.programmes.programmes[0].versions.length)
    .toBe(3);
  expect(mock.commands[0].command).toMatchObject({
    type: "cms.save",
    expectedRevision: 1,
    packages: [{ totalMinor: 1250029 }],
  });
  await page.getByLabel("Version history").selectOption("version-3");
  await page
    .getByRole("button", { name: "Publish version 3", exact: true })
    .click();
  await expect(page.getByText(/Website build:/)).toContainText("queued");
  expect(mock.commands[1].command).toMatchObject({
    type: "cms.publish",
    expectedRevision: 2,
  });
  await expect(
    page.getByRole("button", {
      name: "Rebuild published website",
      exact: true,
    }),
  ).toBeDisabled();
});
test("pricing readers cannot edit or publish programme versions", async ({
  page,
}) => {
  await mockAdmin(page, {
    session: { ...adminSession, permissions: ["cms.read"] },
  });
  await page.goto("/admin-panel");
  await expect(
    page.getByRole("heading", { name: "Programmes & pricing", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save new draft version", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Publish version 2", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Included: Mentorship")).toBeVisible();
});

test("preserves a pricing draft and detects a concurrent programme revision", async ({
  page,
}) => {
  await page.clock.install();
  const mock = await mockAdmin(page);
  await open(page, "Programmes & pricing");
  await page.getByLabel("Amount 1", { exact: true }).fill("13500.75");
  mock.programmes.programmes[0].revision++;
  await page.clock.fastForward(6000);
  await expect(
    page.getByText(/Programme revision changed while this draft was open/),
  ).toBeVisible();
  await expect(page.getByLabel("Amount 1", { exact: true })).toHaveValue(
    "13500.75",
  );
  await expect(
    page.getByRole("button", { name: "Save new draft version", exact: true }),
  ).toBeDisabled();
  expect(mock.commands).toHaveLength(0);
  await page
    .getByRole("button", {
      name: "Discard changes and reload draft",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Amount 1", { exact: true })).toHaveValue(
    "12000.00",
  );
  await expect(
    page.getByRole("button", { name: "Save new draft version", exact: true }),
  ).toBeEnabled();
});

test("render errors are isolated and the section can be reset", async ({
  page,
}) => {
  await mockAdmin(page);
  await open(page);
  await page.evaluate(() => {
    const original = Intl.NumberFormat;
    (window as typeof window & { restoreFormat?: () => void }).restoreFormat =
      () => {
        Intl.NumberFormat = original;
      };
    Intl.NumberFormat = new Proxy(original, {
      construct() {
        throw new Error("Injected admin render failure");
      },
    });
  });
  await page
    .getByRole("navigation", { name: "Admin navigation", exact: true })
    .getByRole("button", { name: "Payments & ledger", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("could not be displayed");
  await expect(
    page.getByRole("navigation", { name: "Admin navigation", exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    (
      window as typeof window & { restoreFormat?: () => void }
    ).restoreFormat?.(),
  );
  await page
    .getByRole("button", { name: "Reload section", exact: true })
    .click();
  await expect(
    page.getByRole("table", { name: "Financial ledger" }),
  ).toBeVisible();
});

test("recovers server-listed financial requests even when browser storage is blocked", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("Storage blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("Storage blocked");
    };
  });
  const mock = await mockAdmin(page, {
    session: {
      ...adminSession,
      pendingFinancialOperations: ["server-pending-1"],
    },
  });
  await open(page);
  await expect(
    page.getByText("Financial request awaiting confirmation", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("server-pending-1: not_found", { exact: true }),
  ).toBeVisible();
  mock.operations.set("server-pending-1", {
    requestId: "server-pending-1",
    status: "failed",
    resourceId: null,
    message: "Operation did not settle.",
  });
  mock.setSession(adminSession);
  await page
    .getByRole("button", { name: "Check operation status", exact: true })
    .click();
  await expect(
    page.getByText("Financial request awaiting confirmation", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText(
    "Operation did not settle.",
  );
});
test("reports show authoritative metrics and generate an expiring server export", async ({
  page,
}) => {
  const mock = await mockAdmin(page);
  await open(page, "Reports & analytics");
  await expect(
    page.getByRole("heading", { name: "Full-funnel conversion", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Counsellor performance" }),
  ).toContainText("20.0%");
  await page
    .getByRole("button", { name: "Generate CSV export", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Download report CSV", exact: true }),
  ).toHaveAttribute("href", "/api/admin/exports/export-1/download.csv");
  expect(mock.commands[0].command).toMatchObject({
    type: "reports.export",
    format: "csv",
  });
});
test("search and notifications filter inaccessible sections and audit navigation works", async ({
  page,
}) => {
  const mock = await mockAdmin(page, {
    session: {
      ...adminSession,
      permissions: [
        "leads.read",
        "audit.read",
        "search.read",
        "notifications.read",
        "notifications.write",
      ],
    },
  });
  await open(page);
  await page.getByLabel("Search admin workspace").fill("Asha");
  await expect(
    page.getByRole("region", { name: "Search results" }),
  ).toContainText("Asha Rao enquiry");
  await expect(page.getByText("Restricted payment result")).toHaveCount(0);
  await page.getByLabel("Search admin workspace").press("Escape");
  await page
    .getByRole("button", { name: "Notification center", exact: true })
    .click();
  await expect(page.getByText("Restricted financial alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Mark as read", exact: true }).click();
  await expect.poll(() => mock.commands.length).toBe(1);
  await page
    .getByRole("button", { name: "Close notifications", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Admin navigation", exact: true })
    .getByRole("button", { name: "Audit trail", exact: true })
    .click();
  await expect(page.getByRole("table", { name: "Audit trail" })).toContainText(
    "audit-request-1",
  );
});
test("empty resources expose honest empty states and logout clears the workspace", async ({
  page,
}) => {
  await mockAdmin(page, { empty: true });
  await open(page);
  await expect(page.getByText("No leads match this owner.")).toBeVisible();
  await page
    .getByRole("navigation", { name: "Admin navigation", exact: true })
    .getByRole("button", { name: "Programmes & pricing", exact: true })
    .click();
  await expect(
    page.getByText("No programmes are available in the CMS."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Sign out of admin workspace", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sign in to administration" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Admin navigation", exact: true }),
  ).toHaveCount(0);
});
test("mobile and short desktop layouts remain usable with accessible UI", async ({
  page,
}) => {
  await mockAdmin(page);
  await page.setViewportSize({ width: 390, height: 640 });
  await page.goto("/admin-panel");
  await expect(
    page.getByRole("heading", { name: "Leads pipeline", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", {
      name: "Mobile admin navigation",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("navigation", { name: "Mobile admin navigation", exact: true })
    .getByRole("button", { name: "Payments & ledger", exact: true })
    .click();
  await expect(
    page.getByRole("table", { name: "Financial ledger" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
  await page.screenshot({
    path: "test-results/screenshots/admin-ledger-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 400 });
  await page
    .getByRole("button", { name: "Collapse sidebar", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Expand sidebar", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Admin navigation", exact: true })
    .getByRole("button", { name: "Audit trail", exact: true })
    .click();
  await expect(page.getByRole("table", { name: "Audit trail" })).toBeVisible();
  await page.screenshot({
    path: "test-results/screenshots/admin-audit-short-desktop.png",
    fullPage: true,
  });
});
