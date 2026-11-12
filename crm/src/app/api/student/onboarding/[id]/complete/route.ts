import { NextRequest, NextResponse } from "next/server";
import {
  completeStudentOnboardingStep,
  handleStudentPanelError,
  requireStudentSession,
} from "@/lib/student-panel";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, studentProfileId } = await requireStudentSession();
    const { id } = await params;
    const dashboard = await completeStudentOnboardingStep(
      studentProfileId,
      session.userId,
      id
    );
    return NextResponse.json(dashboard);
  } catch (error) {
    return handleStudentPanelError(error, "Failed to complete onboarding step");
  }
}
