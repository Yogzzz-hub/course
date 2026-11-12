import { NextRequest, NextResponse } from "next/server";
import {
  executeAdminCommand,
  handleAdminPanelError,
  requireAdminPanelSession,
} from "@/lib/admin-panel";
import { createPanelCsrfToken } from "@/lib/student-panel";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { session, user } = await requireAdminPanelSession();
    const csrf = req.headers.get("x-csrf-token") || "";
    const expectedCsrf = createPanelCsrfToken(session);
    if (csrf !== expectedCsrf) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }

    const command = (await req.json()) as Record<string, unknown>;
    const requestId = req.headers.get("idempotency-key") || `cmd-${Date.now()}`;
    const ipAddress =
      req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");

    const receipt = await executeAdminCommand(command, requestId, user, ipAddress);
    return NextResponse.json(receipt);
  } catch (error) {
    return handleAdminPanelError(error, "Failed to execute admin command");
  }
}
