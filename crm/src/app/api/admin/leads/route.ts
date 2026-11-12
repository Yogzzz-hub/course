import { NextResponse } from "next/server";
import {
  getAdminLeads,
  handleAdminPanelError,
  requireAdminPanelSession,
} from "@/lib/admin-panel";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminPanelSession();
    return NextResponse.json(await getAdminLeads());
  } catch (error) {
    return handleAdminPanelError(error, "Failed to load leads");
  }
}
