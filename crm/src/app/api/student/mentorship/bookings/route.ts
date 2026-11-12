import { NextRequest, NextResponse } from "next/server";
import {
  bookStudentPanelMentorshipSlot,
  handleStudentPanelError,
  requireStudentSession,
} from "@/lib/student-panel";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { session, studentProfileId } = await requireStudentSession();
    const body = (await request.json().catch(() => ({}))) as { slotId?: string };
    const mentorship = await bookStudentPanelMentorshipSlot(
      studentProfileId,
      session.userId,
      String(body.slotId || "")
    );
    return NextResponse.json(mentorship, { status: 201 });
  } catch (error) {
    return handleStudentPanelError(error, "Failed to book mentorship session");
  }
}
