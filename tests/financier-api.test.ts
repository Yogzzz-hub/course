import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dispatchNodeFinancierRequest,
  handleFinancierRequest,
  type NodeReqLike,
  type NodeResLike,
} from "../api/financier/index";
import { createFinancierStore } from "../backend/services/financier/store";
import { createInitialFinancierState } from "../src/data/financierMock";
import { enforceFinancierRateLimit } from "../backend/services/rate-limit";

function makeSessionHeader(role: string, email: string, userId = `usr-${role.toLowerCase()}`) {
  return JSON.stringify({
    authenticated: true,
    userId,
    name: `${role} Test User`,
    email,
    role,
  });
}

function makeReq(
  path: string,
  options: {
    method?: string;
    session?: string | null;
    cookie?: string | null;
    body?: unknown;
  } = {}
): Request {
  const headers = new Headers();
  if (options.session) {
    headers.set("X-CRM-Session", options.session);
  }
  if (options.cookie) {
    headers.set("Cookie", options.cookie);
  }
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  return new Request(`http://127.0.0.1:5173${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

// WCAG 2.1 relative luminance & contrast ratio calculator
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function channelLum(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function contrastRatio(fgHex: string, bgHex: string): number {
  const [r1, g1, b1] = hexToRgb(fgHex);
  const [r2, g2, b2] = hexToRgb(bgHex);
  const l1 = 0.2126 * channelLum(r1) + 0.7152 * channelLum(g1) + 0.0722 * channelLum(b1);
  const l2 = 0.2126 * channelLum(r2) + 0.7152 * channelLum(g2) + 0.0722 * channelLum(b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

describe("Financier HTTP API, Role Auth, Binary Exports & Contrast", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Enforces strict FINANCIER/ADMIN role gating across HTTP endpoints & rejects MANAGER/TRAINER/STUDENT/anonymous", async () => {
    const store = createFinancierStore(createInitialFinancierState("2026-11-11T10:00:00.000Z"));

    // Anonymous -> 401
    const anonRes = await handleFinancierRequest(makeReq("/api/financier/summary"), store);
    expect(anonRes.status).toBe(401);

    // MANAGER -> 403
    const managerRes = await handleFinancierRequest(
      makeReq("/api/financier/summary", {
        session: makeSessionHeader("MANAGER", "manager@apexacademy.edu"),
      }),
      store
    );
    expect(managerRes.status).toBe(403);
    const managerJson = (await managerRes.json()) as { redirectTo: string };
    expect(managerJson.redirectTo).toBe("/manager");

    // TRAINER -> 403
    const trainerRes = await handleFinancierRequest(
      makeReq("/api/financier/invoices", {
        session: makeSessionHeader("TRAINER", "trainer@apexacademy.edu"),
      }),
      store
    );
    expect(trainerRes.status).toBe(403);
    expect(((await trainerRes.json()) as { redirectTo: string }).redirectTo).toBe("/trainer");

    // STUDENT -> 403
    const studentRes = await handleFinancierRequest(
      makeReq("/api/financier/payments", {
        session: makeSessionHeader("STUDENT", "student@apexacademy.edu"),
      }),
      store
    );
    expect(studentRes.status).toBe(403);

    // FINANCIER (via Cookie) -> 200
    const finCookie = `crm_session=${encodeURIComponent(
      makeSessionHeader("FINANCIER", "financier@apexacademy.edu", "usr-financier")
    )}`;
    const finRes = await handleFinancierRequest(
      makeReq("/api/financier/summary", { cookie: finCookie }),
      store
    );
    expect(finRes.status).toBe(200);
    const finJson = (await finRes.json()) as {
      actor: { id: string; role: string };
      dashboard: { trialBalanceOk: boolean };
    };
    expect(finJson.actor.id).toBe("usr-financier");
    expect(finJson.dashboard.trialBalanceOk).toBe(true);

    // ADMIN -> 200
    const adminRes = await handleFinancierRequest(
      makeReq("/api/financier/summary", {
        session: makeSessionHeader("ADMIN", "admin@apexacademy.edu", "usr-admin"),
      }),
      store
    );
    expect(adminRes.status).toBe(200);
  });

  it("2. Validates payloads (400), blocks duplicate payment refs (409), enforces dual-control (403) & writes atomic audit entries", async () => {
    const store = createFinancierStore(createInitialFinancierState("2026-11-11T10:00:00.000Z"));
    const finHeader = makeSessionHeader("FINANCIER", "financier@apexacademy.edu", "usr-financier");
    const adminHeader = makeSessionHeader("ADMIN", "admin@apexacademy.edu", "usr-admin");

    // Bad payment amount (float -> 400 Zod validation error)
    const badPay = await handleFinancierRequest(
      makeReq("/api/financier/payments", {
        method: "POST",
        session: finHeader,
        body: {
          studentProfileId: "stu-1",
          amountPaise: 500.5,
          paymentMethod: "UPI",
          paymentDate: "2026-11-11T10:00:00.000Z",
          externalReference: "UPI-FLOAT-001",
        },
      }),
      store
    );
    expect(badPay.status).toBe(400);

    // Duplicate payment ref -> 409
    const dupPay = await handleFinancierRequest(
      makeReq("/api/financier/payments", {
        method: "POST",
        session: finHeader,
        body: {
          studentProfileId: "stu-1",
          amountPaise: 100_000,
          paymentMethod: "UPI",
          paymentDate: "2026-11-11T10:00:00.000Z",
          externalReference: "UTR-UPI-661904412",
        },
      }),
      store
    );
    expect(dupPay.status).toBe(409);

    // Valid payment -> 201 + audit entry
    const beforeAudits = store.listAuditLogs().length;
    const goodPay = await handleFinancierRequest(
      makeReq("/api/financier/payments", {
        method: "POST",
        session: finHeader,
        body: {
          studentProfileId: "stu-1",
          amountPaise: 1_000_000,
          paymentMethod: "BANK_TRANSFER",
          paymentDate: "2026-11-11T11:30:00.000Z",
          externalReference: "IMPS-API-2026-7781",
        },
      }),
      store
    );
    expect(goodPay.status).toBe(201);
    const createdPay = ((await goodPay.json()) as { payment: { id: string } }).payment;
    expect(store.listAuditLogs().length).toBeGreaterThan(beforeAudits);

    // Request discount by FINANCIER -> self-approval blocked (403) -> ADMIN approves (200)
    const reqDiscRes = await handleFinancierRequest(
      makeReq("/api/financier/discounts", {
        method: "POST",
        session: finHeader,
        body: {
          studentProfileId: "stu-3",
          kind: "FIXED",
          amountPaise: 300_000,
          reason: "Hardship tuition fee waiver committee recommendation",
        },
      }),
      store
    );
    expect(reqDiscRes.status).toBe(201);
    const discId = ((await reqDiscRes.json()) as { discount: { id: string } }).discount.id;

    const selfApprove = await handleFinancierRequest(
      makeReq(`/api/financier/discounts/${discId}/decide`, {
        method: "POST",
        session: finHeader,
        body: {
          decision: "APPROVED",
          decisionNotes: "Self approval attempt should fail cleanly",
        },
      }),
      store
    );
    expect(selfApprove.status).toBe(403);

    const adminApprove = await handleFinancierRequest(
      makeReq(`/api/financier/discounts/${discId}/decide`, {
        method: "POST",
        session: adminHeader,
        body: {
          decision: "APPROVED",
          decisionNotes: "Verified supporting hardship documentation by admin",
        },
      }),
      store
    );
    expect(adminApprove.status).toBe(200);

    // Dual-control on refund (request -> admin approve -> duplicate ref execute rejected -> clean ref execute succeeds)
    const reqRefund = await handleFinancierRequest(
      makeReq("/api/financier/refunds", {
        method: "POST",
        session: finHeader,
        body: {
          paymentId: createdPay.id,
          amountPaise: 250_000,
          refundMethod: "BANK_TRANSFER",
          reason: "Verified duplicate collection adjustment",
        },
      }),
      store
    );
    expect(reqRefund.status).toBe(201);
    const refundId = ((await reqRefund.json()) as { refund: { id: string } }).refund.id;

    expect(
      (
        await handleFinancierRequest(
          makeReq(`/api/financier/refunds/${refundId}/decide`, {
            method: "POST",
            session: finHeader,
            body: { decision: "APPROVED" },
          }),
          store
        )
      ).status
    ).toBe(403);

    expect(
      (
        await handleFinancierRequest(
          makeReq(`/api/financier/refunds/${refundId}/decide`, {
            method: "POST",
            session: adminHeader,
            body: { decision: "APPROVED", reason: "Approved by Admin" },
          }),
          store
        )
      ).status
    ).toBe(200);

    expect(
      (
        await handleFinancierRequest(
          makeReq(`/api/financier/refunds/${refundId}/execute`, {
            method: "POST",
            session: finHeader,
            body: { externalReference: "IMPS-API-2026-7781" },
          }),
          store
        )
      ).status
    ).toBe(409);

    expect(
      (
        await handleFinancierRequest(
          makeReq(`/api/financier/refunds/${refundId}/execute`, {
            method: "POST",
            session: finHeader,
            body: { externalReference: "REFUND-NEFT-88101" },
          }),
          store
        )
      ).status
    ).toBe(200);
  });

  it("3. Streams valid binary PDFs (invoice, receipt, payslip), CSV exports, Brevo reminders & counter-entry reversals", async () => {
    const store = createFinancierStore(createInitialFinancierState("2026-11-11T10:00:00.000Z"));
    const finHeader = makeSessionHeader("FINANCIER", "financier@apexacademy.edu", "usr-financier");

    // PDF downloads via Node dispatcher as well as Web Request handler
    const invPdfRes = await handleFinancierRequest(
      makeReq("/api/financier/invoices/inv-2/pdf", { session: finHeader }),
      store
    );
    expect(invPdfRes.status).toBe(200);
    expect(invPdfRes.headers.get("content-type")).toBe("application/pdf");
    const invText = new TextDecoder().decode(await invPdfRes.arrayBuffer());
    expect(invText.startsWith("%PDF-1.4")).toBe(true);
    expect(invText.trimEnd().endsWith("%%EOF")).toBe(true);

    const rcpPdfRes = await handleFinancierRequest(
      makeReq("/api/financier/payments/pay-1/receipt.pdf", { session: finHeader }),
      store
    );
    expect(rcpPdfRes.status).toBe(200);
    expect(rcpPdfRes.headers.get("content-type")).toBe("application/pdf");

    const payPdfRes = await handleFinancierRequest(
      makeReq("/api/financier/payroll/pr-1/payslips/pr-1-po-1/pdf", { session: finHeader }),
      store
    );
    expect(payPdfRes.status).toBe(200);
    expect(payPdfRes.headers.get("content-type")).toBe("application/pdf");

    // Node middleware dispatch test for binary PDF
    const nodeHeaders: Record<string, string> = {};
    let nodeBody: unknown = "";
    const nodeRes: NodeResLike = {
      statusCode: 0,
      setHeader(name, val) {
        nodeHeaders[name.toLowerCase()] = val;
      },
      end(chunk) {
        nodeBody = chunk ?? "";
      },
    };
    const nodeReq: NodeReqLike = {
      url: "/api/financier/invoices/inv-2/pdf",
      method: "GET",
      headers: { "x-crm-session": finHeader },
    };
    await dispatchNodeFinancierRequest(nodeReq, nodeRes, store);
    expect(nodeRes.statusCode).toBe(200);
    expect(nodeHeaders["content-type"]).toBe("application/pdf");
    expect(Buffer.isBuffer(nodeBody)).toBe(true);
    if (!Buffer.isBuffer(nodeBody)) {
      throw new Error("Expected binary PDF Buffer from Node dispatcher");
    }
    expect(nodeBody.toString("utf8").startsWith("%PDF-1.4")).toBe(true);

    // CSV exports
    for (const csvPath of [
      "/api/financier/ledger/export",
      "/api/financier/reports/export?kind=ageing",
      "/api/financier/reports/export?kind=payroll-vs-revenue",
    ]) {
      const csvRes = await handleFinancierRequest(makeReq(csvPath, { session: finHeader }), store);
      expect(csvRes.status).toBe(200);
      expect(csvRes.headers.get("content-type")).toContain("text/csv");
    }

    // Invoice email send & collection reminder & follow-up note
    expect(
      (
        await handleFinancierRequest(
          makeReq("/api/financier/invoices/inv-2/send", { method: "POST", session: finHeader }),
          store
        )
      ).status
    ).toBe(200);

    expect(
      (
        await handleFinancierRequest(
          makeReq("/api/financier/collections/remind", {
            method: "POST",
            session: finHeader,
            body: { studentProfileId: "stu-5" },
          }),
          store
        )
      ).status
    ).toBe(201);

    expect(
      (
        await handleFinancierRequest(
          makeReq("/api/financier/collections/notes", {
            method: "POST",
            session: finHeader,
            body: {
              studentProfileId: "stu-5",
              channel: "CALL",
              note: "Parent confirmed NEFT transfer scheduled for Friday morning.",
            },
          }),
          store
        )
      ).status
    ).toBe(201);

    // No DELETE endpoint for ledger; counter-entry reversal returns 201
    const delRes = await handleFinancierRequest(
      makeReq("/api/financier/ledger/je-0001", { method: "DELETE", session: finHeader }),
      store
    );
    expect(delRes.status).toBe(404);

    const targetId = store.getLedgerView().entries.find((e) => !e.reversedByEntryId)!.id;
    const revRes = await handleFinancierRequest(
      makeReq(`/api/financier/ledger/reverse/${targetId}`, {
        method: "POST",
        session: finHeader,
        body: { reason: "Correcting batch allocation entry via counter-entry" },
      }),
      store
    );
    expect(revRes.status).toBe(201);

    // Clear rate limiter bucket check doesn't throw during normal read/write
    expect(enforceFinancierRateLimit("test-cleanup", "127.0.0.1", "cleanup", 10).success).toBe(true);
  });

  it("4. Verifies WCAG AA (>= 4.5:1) contrast on all Financier text/background token pairs and flags failing decorative tokens", () => {
    const TOKENS = {
      bgIvory: "#FBF9F5",
      surfaceWhite: "#FFFFFF",
      parchment: "#F5F0E8",
      burgundyPrimary: "#6D1A2B",
      burgundyHover: "#4E0F1E",
      burgundyTint: "#FDF5F6",
      goldAccent: "#C9A24B",
      goldTint: "#F6EBCF",
      goldInkPass: "#6D4B09",
      inkPrimary: "#251923",
      inkMuted: "#6B6268",
      inkLightDecorative: "#9A9197",
      successGreen: "#19674B",
      successBg: "#E7F3EE",
      dangerRed: "#B42318",
      dangerBg: "#FEECEB",
      tealInfo: "#315F70",
      tealBg: "#EAF2F5",
    };

    const passingPairs: Array<[string, string, string]> = [
      ["Deep Ink on White", TOKENS.inkPrimary, TOKENS.surfaceWhite],
      ["Deep Ink on Ivory", TOKENS.inkPrimary, TOKENS.bgIvory],
      ["Deep Ink on Parchment", TOKENS.inkPrimary, TOKENS.parchment],
      ["Muted Charcoal on White", TOKENS.inkMuted, TOKENS.surfaceWhite],
      ["Muted Charcoal on Ivory", TOKENS.inkMuted, TOKENS.bgIvory],
      ["Muted Charcoal on Parchment", TOKENS.inkMuted, TOKENS.parchment],
      ["White on Burgundy Primary", TOKENS.surfaceWhite, TOKENS.burgundyPrimary],
      ["White on Burgundy Hover", TOKENS.surfaceWhite, TOKENS.burgundyHover],
      ["Burgundy Text on Burgundy Tint", TOKENS.burgundyPrimary, TOKENS.burgundyTint],
      ["Gold Dark Ink on Gold Tint", TOKENS.goldInkPass, TOKENS.goldTint],
      ["Gold Dark Ink on White", TOKENS.goldInkPass, TOKENS.surfaceWhite],
      ["Forest Green on Success Bg", TOKENS.successGreen, TOKENS.successBg],
      ["Forest Green on White", TOKENS.successGreen, TOKENS.surfaceWhite],
      ["Restrained Red on Danger Bg", TOKENS.dangerRed, TOKENS.dangerBg],
      ["Restrained Red on White", TOKENS.dangerRed, TOKENS.surfaceWhite],
      ["Petrol Teal on Teal Bg", TOKENS.tealInfo, TOKENS.tealBg],
    ];

    for (const [label, fg, bg] of passingPairs) {
      const ratio = contrastRatio(fg, bg);
      expect(ratio, `${label} (${fg} on ${bg}) got ${ratio}:1`).toBeGreaterThanOrEqual(4.5);
    }

    // Explicitly verify failing legacy palette tokens if used for body text (must ONLY be decorative/highlights)
    expect(contrastRatio(TOKENS.goldAccent, TOKENS.surfaceWhite)).toBeLessThan(4.5);
    expect(contrastRatio(TOKENS.goldAccent, TOKENS.parchment)).toBeLessThan(4.5);
    expect(contrastRatio(TOKENS.inkLightDecorative, TOKENS.surfaceWhite)).toBeLessThan(4.5);
  });
});
