import { NextResponse } from "next/server";
import {
  getStudentPanelAssignments,
  handleStudentPanelError,
  requireStudentSession,
} from "@/lib/student-panel";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { studentProfileId } = await requireStudentSession();
    const assignments = await getStudentPanelAssignments(studentProfileId);
    return NextResponse.json({
      success: true,
      assignments,
    });
  } catch (error) {
    return handleStudentPanelError(error, "Failed to load assignments");
  }
}
