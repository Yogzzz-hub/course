import { NextResponse } from "next/server";
import {
  getAdminOperations,
  handleAdminPanelError,
  requireAdminPanelSession,
} from "@/lib/admin-panel";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminPanelSession();
    return NextResponse.json(await getAdminOperations());
  } catch (error) {
    return handleAdminPanelError(error, "Failed to load operations");
  }
}
