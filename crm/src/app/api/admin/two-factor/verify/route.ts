import { NextRequest, NextResponse } from "next/server";
import {
  buildAuthenticatedAdminSession,
  handleAdminPanelError,
  requireAdminPanelSession,
} from "@/lib/admin-panel";
import { createPanelCsrfToken } from "@/lib/student-panel";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { session, user } = await requireAdminPanelSession();
    const csrf = req.headers.get("x-csrf-token") || "";
    if (csrf && csrf !== createPanelCsrfToken(session)) {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
    }
    return NextResponse.json(await buildAuthenticatedAdminSession(user));
  } catch (error) {
    return handleAdminPanelError(error, "Failed to verify two-factor challenge");
  }
}
