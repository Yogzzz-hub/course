import { NextResponse } from "next/server";
import {
  getStudentPanelMentorshipSlots,
  handleStudentPanelError,
  requireStudentSession,
} from "@/lib/student-panel";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { session, studentProfileId } = await requireStudentSession();
    const slots = await getStudentPanelMentorshipSlots(studentProfileId, session.userId);
    return NextResponse.json({ slots });
  } catch (error) {
    return handleStudentPanelError(error, "Failed to load mentorship slots");
  }
}
