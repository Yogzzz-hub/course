import { NextResponse } from "next/server";
import {
  getStudentPanelDashboard,
  handleStudentPanelError,
  requireStudentSession,
} from "@/lib/student-panel";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { session, studentProfileId } = await requireStudentSession();
    const dashboard = await getStudentPanelDashboard(studentProfileId, session.userId);
    return NextResponse.json(dashboard);
  } catch (error) {
    return handleStudentPanelError(error, "Failed to load student dashboard");
  }
}
