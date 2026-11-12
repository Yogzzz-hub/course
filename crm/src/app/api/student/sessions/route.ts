import { NextResponse } from "next/server";
import {
  getStudentPanelSessions,
  handleStudentPanelError,
  requireStudentSession,
} from "@/lib/student-panel";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { session, studentProfileId } = await requireStudentSession();
    const sessions = await getStudentPanelSessions(studentProfileId, session.userId);
    return NextResponse.json({ sessions });
  } catch (error) {
    return handleStudentPanelError(error, "Failed to load student sessions");
  }
}
