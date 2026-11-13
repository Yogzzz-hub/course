import { NextRequest, NextResponse } from "next/server";
import {
  getAdminLeadTimeline,
  handleAdminPanelError,
  requireAdminPanelSession,
} from "@/lib/admin-panel";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminPanelSession();
    const { id } = await params;
    return NextResponse.json(await getAdminLeadTimeline(id));
  } catch (error) {
    return handleAdminPanelError(error, "Failed to load lead timeline");
  }
}
