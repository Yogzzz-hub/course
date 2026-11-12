import { NextRequest, NextResponse } from "next/server";
import {
  getAdminSearch,
  handleAdminPanelError,
  requireAdminPanelSession,
} from "@/lib/admin-panel";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdminPanelSession();
    const q = new URL(req.url).searchParams.get("q") || "";
    return NextResponse.json(await getAdminSearch(q));
  } catch (error) {
    return handleAdminPanelError(error, "Failed to search admin resources");
  }
}
