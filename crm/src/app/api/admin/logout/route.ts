import { NextResponse } from "next/server";
import { handleAdminLogout, handleAdminPanelError } from "@/lib/admin-panel";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    return await handleAdminLogout();
  } catch (error) {
    return handleAdminPanelError(error, "Failed to sign out");
  }
}
