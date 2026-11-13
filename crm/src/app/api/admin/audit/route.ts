import { NextResponse } from "next/server";
import {
  getAdminAudit,
  handleAdminPanelError,
  requireAdminPanelSession,
} from "@/lib/admin-panel";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminPanelSession();
    return NextResponse.json(await getAdminAudit());
  } catch (error) {
    return handleAdminPanelError(error, "Failed to load audit events");
  }
}
