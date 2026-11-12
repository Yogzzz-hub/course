import { NextResponse } from "next/server";
import { getStudentPanelSession, handleStudentPanelError } from "@/lib/student-panel";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getStudentPanelSession();
    return NextResponse.json({ session }, { status: 200 });
  } catch (error) {
    return handleStudentPanelError(error, "Failed to read student session");
  }
}
