import { describe, expect, it } from "vitest";
import {
  createAdminPreviewApi,
  createDevFallbackAdminApi,
} from "../src/dev/admin-preview-api";
import {
  adminSessionSchema,
  financeSchema,
  leadsSchema,
  offersSchema,
  programmesSchema,
  reportsSchema,
} from "../src/components/admin-panel/contracts";

describe("Admin dev preview fallback and mock API", () => {
  it("provides valid authenticated session and passes contract schemas", async () => {
    const api = createAdminPreviewApi();
    const session = await api.session();
    expect(adminSessionSchema.safeParse(session).success).toBe(true);
    expect(session.state).toBe("authenticated");
    if (session.state === "authenticated") {
      expect(session.twoFactorVerified).toBe(true);
    }

    const leads = await api.read("leads", {});
    expect(leadsSchema.safeParse(leads).success).toBe(true);
    expect(leads.leads.length).toBeGreaterThan(0);

    const offers = await api.read("offers", {});
    expect(offersSchema.safeParse(offers).success).toBe(true);

    const finance = await api.read("finance", {});
    expect(financeSchema.safeParse(finance).success).toBe(true);

    const programmes = await api.read("programmes", {});
    expect(programmesSchema.safeParse(programmes).success).toBe(true);

    const reports = await api.read("reports", {});
    expect(reportsSchema.safeParse(reports).success).toBe(true);
  });

  it("handles live interactive commands for offers and leads", async () => {
    const api = createAdminPreviewApi();
    const ctx = {
      csrfToken: "csrf-test",
      requestId: "req-1",
      sessionKey: "session-1",
    };

    const decideRes = await api.command(
      {
        type: "offer.decide",
        offerId: "offer-1",
        decision: "approved",
        reason: "Valid scholarship approved by admin.",
        expectedVersion: 1,
      },
      ctx,
    );
    expect(decideRes.status).toBe("succeeded");

    const moveRes = await api.command(
      {
        type: "lead.move",
        leadId: "lead-1",
        stage: "counselled",
        expectedVersion: 1,
      },
      ctx,
    );
    expect(moveRes.status).toBe("succeeded");
  });

  it("gracefully falls back when live API fails", async () => {
    const failingApi = {
      session: async () => {
        throw new Error("503 Backend unavailable");
      },
      verifyTwoFactor: async () => {
        throw new Error("503 Backend unavailable");
      },
      read: async () => {
        throw new Error("503 Backend unavailable");
      },
      command: async () => {
        throw new Error("503 Backend unavailable");
      },
      logout: async () => {},
    };

    const fallbackApi = createDevFallbackAdminApi(failingApi);
    const session = await fallbackApi.session();
    expect(session.state).toBe("authenticated");
    const leads = await fallbackApi.read("leads", {});
    expect(leads.leads.length).toBeGreaterThan(0);
  });
});

