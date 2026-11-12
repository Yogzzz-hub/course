import { NextResponse } from "next/server";
import {
  getAdminOffers,
  handleAdminPanelError,
  requireAdminPanelSession,
} from "@/lib/admin-panel";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminPanelSession();
    return NextResponse.json(await getAdminOffers());
  } catch (error) {
    return handleAdminPanelError(error, "Failed to load discount offers");
  }
}
