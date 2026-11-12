import { NextResponse } from "next/server";
import {
  getStudentPanelLearningPlan,
  handleStudentPanelError,
  requireStudentSession,
} from "@/lib/student-panel";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { studentProfileId } = await requireStudentSession();
    const plan = await getStudentPanelLearningPlan(studentProfileId);
    return NextResponse.json(plan);
  } catch (error) {
    return handleStudentPanelError(error, "Failed to load learning plan");
  }
}
