import { NextRequest, NextResponse } from "next/server";
import {
  getAdminReports,
  handleAdminPanelError,
  requireAdminPanelSession,
} from "@/lib/admin-panel";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdminPanelSession();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    return NextResponse.json(await getAdminReports(from, to));
  } catch (error) {
    return handleAdminPanelError(error, "Failed to load admin reports");
  }
}
