import { NextResponse } from "next/server";
import {
  getStudentPanelMentorship,
  handleStudentPanelError,
  requireStudentSession,
} from "@/lib/student-panel";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { session, studentProfileId } = await requireStudentSession();
    const mentorship = await getStudentPanelMentorship(studentProfileId, session.userId);
    return NextResponse.json(mentorship);
  } catch (error) {
    return handleStudentPanelError(error, "Failed to load mentorship data");
  }
}
