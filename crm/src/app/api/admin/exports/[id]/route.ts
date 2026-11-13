import { NextRequest, NextResponse } from "next/server";
import {
  getAdminExport,
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
    return NextResponse.json(await getAdminExport(id));
  } catch (error) {
    return handleAdminPanelError(error, "Failed to load export status");
  }
}
