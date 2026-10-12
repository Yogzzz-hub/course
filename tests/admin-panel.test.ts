import { describe, expect, it, vi } from "vitest";
import { createHttpAdminApi } from "../src/components/admin-panel/api";
import {
  adminSessionSchema,
  adminCommandSchema,
  financeSchema,
  offersSchema,
  programmesSchema,
  secureLink,
} from "../src/components/admin-panel/contracts";
import {
  canReviewProof,
  commandPermissions,
  hasPermission,
} from "../src/components/admin-panel/permissions";
import {
  commandFingerprint,
  OperationRegistry,
} from "../src/components/admin-panel/operations";
import {
  parseMinor,
  amountInput,
  money,
} from "../src/components/admin-panel/utils";
import {
  adminFinance,
  adminOffers,
  adminProgrammes,
  adminSession,
} from "./admin-fixtures";
const context = {
  csrfToken: "csrf",
  sessionKey: "private-scope",
  requestId: "request-1",
};
describe("Admin authentication, contracts and permission boundaries", () => {
  it("fails closed without verified and unexpired two-factor authentication", () => {
    expect(
      adminSessionSchema.safeParse({
        ...adminSession,
        twoFactorVerified: false,
      }).success,
    ).toBe(false);
    expect(hasPermission(adminSession, "ledger.read")).toBe(true);
    expect(
      hasPermission({ ...adminSession, permissions: [] }, "ledger.read"),
    ).toBe(false);
    expect(
      hasPermission(
        adminSession,
        "ledger.read",
        Date.parse(adminSession.twoFactorExpiresAt),
      ),
    ).toBe(false);
    expect(hasPermission({ state: "anonymous" }, "leads.read")).toBe(false);
  });
  it("requires independent primary and secondary proof reviewers", () => {
    const proof = adminFinance.proofs[0];
    expect(canReviewProof(proof, proof.submittedBy, "first")).toBe(false);
    expect(canReviewProof(proof, "admin-1", "first")).toBe(true);
    const reviewed = {
      ...proof,
      status: "pending_secondary" as const,
      firstReviewerId: "admin-1",
    };
    expect(canReviewProof(reviewed, "admin-1", "second")).toBe(false);
    expect(canReviewProof(reviewed, "admin-2", "second")).toBe(true);
    expect(canReviewProof(reviewed, proof.submittedBy, "second")).toBe(false);
    expect(
      financeSchema.safeParse({
        ...adminFinance,
        proofs: [{ ...reviewed, firstReviewerId: null }],
      }).success,
    ).toBe(false);
  });
  it("rejects inconsistent discount schemes, fees and independent refund approvals", () => {
    expect(offersSchema.safeParse(adminOffers).success).toBe(true);
    expect(
      offersSchema.safeParse({
        offers: [
          {
            ...adminOffers.offers[0],
            scheme: { kind: "percentage", basisPoints: 500 },
          },
        ],
      }).success,
    ).toBe(false);
    const catalogue = structuredClone(adminProgrammes);
    catalogue.programmes[0].versions[0].packages[0].totalMinor++;
    expect(programmesSchema.safeParse(catalogue).success).toBe(false);
    expect(
      financeSchema.safeParse({
        ...adminFinance,
        refunds: [
          {
            ...adminFinance.refunds[0],
            status: "approved",
            approvedBy: adminFinance.refunds[0].requestedBy,
          },
        ],
      }).success,
    ).toBe(false);
  });
  it("parses currency amounts exactly and rejects excess precision and overflow", () => {
    expect(parseMinor("0.29", "INR")).toBe(29);
    expect(parseMinor("-1000.50", "INR", true)).toBe(-100050);
    expect(parseMinor("123", "JPY")).toBe(123);
    for (const value of [
      "1.001",
      "-1",
      "1,000",
      "1e2",
      "Infinity",
      "9007199254740992",
    ])
      expect(parseMinor(value, "INR")).toBeNull();
    expect(parseMinor("1.1", "JPY")).toBeNull();
    expect(amountInput(Number.MAX_SAFE_INTEGER, "INR")).toBe(
      "90071992547409.91",
    );
    expect(parseMinor(amountInput(Number.MAX_SAFE_INTEGER, "INR"), "INR")).toBe(
      Number.MAX_SAFE_INTEGER,
    );
    expect(money(Number.MAX_SAFE_INTEGER, "INR")).toMatch(/\.91$/);
    expect(money(-29, "INR")).toContain("-₹0.29");
  });
  it("enforces financial recovery and separate pricing publication permissions", () => {
    expect(
      commandPermissions({
        type: "refund.execute",
        refundId: "r",
        expectedVersion: 1,
        reason: "Authorised refund execution",
      }),
    ).toEqual(["ledger.read", "refunds.execute", "operations.read"]);
    expect(
      commandPermissions({
        type: "cms.publish",
        programmeId: "p",
        versionId: "v",
        expectedRevision: 1,
      }),
    ).toContain("cms.rebuild");
    expect(
      adminCommandSchema.safeParse({
        type: "reports.export",
        from: "2026-10-12",
        to: "2026-10-01",
        format: "csv",
      }).success,
    ).toBe(false);
    for (const url of [
      "javascript:alert(1)",
      "//evil.test",
      "/\\evil.test",
      "https://user:password@example.test",
    ])
      expect(secureLink.safeParse(url).success).toBe(false);
  });
});
describe("Admin HTTP adapter and idempotent operations", () => {
  it("sends credentialed CSRF-protected commands and validates the matching receipt", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          requestId: "request-1",
          status: "succeeded",
          resourceId: "r",
          message: "Recorded safely.",
        }),
      ),
    );
    const api = createHttpAdminApi({ fetcher });
    await api.command(
      {
        type: "refund.execute",
        refundId: "r",
        expectedVersion: 1,
        reason: "Authorised refund execution",
      },
      context,
    );
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        "X-CSRF-Token": "csrf",
        "Idempotency-Key": "request-1",
        "X-Admin-Session": "private-scope",
      },
    });
    fetcher.mockResolvedValue(
      new Response(
        JSON.stringify({
          requestId: "different",
          status: "succeeded",
          resourceId: "r",
          message: "Recorded safely.",
        }),
      ),
    );
    await expect(
      api.command(
        {
          type: "refund.execute",
          refundId: "r",
          expectedVersion: 1,
          reason: "Authorised refund execution",
        },
        context,
      ),
    ).rejects.toMatchObject({ code: "contract" });
  });
  it("does not trust malformed reads and rejects insecure configuration", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}"));
    await expect(
      createHttpAdminApi({ fetcher }).session(),
    ).rejects.toMatchObject({ code: "contract" });
    for (const baseUrl of [
      "http://example.test",
      "//evil.test",
      "https://user:pass@example.test",
      "/api/admin?key=secret",
    ])
      expect(() => createHttpAdminApi({ baseUrl })).toThrow();
  });
  it("uses one key for canonical identical commands and blocks another unresolved financial action", async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) || null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    const registry = new OperationRegistry("scope", storage);
    const signature = await commandFingerprint({
      type: "refund.request",
      amountMinor: 29,
    });
    expect(signature).toBe(
      await commandFingerprint({ amountMinor: 29, type: "refund.request" }),
    );
    const requestId = registry.claim(signature);
    expect(registry.claim(signature)).toBe(requestId);
    expect(() => registry.claim("different")).toThrow();
    const restored = new OperationRegistry("scope", storage);
    expect(restored.claim(signature)).toBe(requestId);
    expect(JSON.stringify([...values.values()])).not.toContain("amountMinor");
    restored.resolve(requestId);
    restored.merge([requestId]);
    expect(restored.snapshot()).toEqual([]);
    expect(restored.claim(signature)).not.toBe(requestId);
  });
  it("recovers pending IDs from the server without exposing or inventing their payload", () => {
    const storage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    const registry = new OperationRegistry("scope", storage);
    registry.merge(["pending-server-request"]);
    expect(registry.snapshot()).toEqual([
      { requestId: "pending-server-request", fingerprint: null },
    ]);
    expect(() => registry.claim("new-hash")).toThrow();
    registry.resolve("pending-server-request");
    expect(registry.snapshot()).toEqual([]);
  });
});
