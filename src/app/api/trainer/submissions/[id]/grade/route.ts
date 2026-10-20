import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { gradeAssignmentSubmission } from "@/lib/assessment";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(["TRAINER", "ADMIN"]);
    const { id: submissionId } = await params;
    const body = await request.json();

    const { marksAwarded, rubricScoresJson, feedback, privateNotes, reasonForRevision } = body;

    if (typeof marksAwarded !== "number") {
      return NextResponse.json(
        { error: "Marks awarded must be a valid number" },
        { status: 400 }
      );
    }

    const grade = await gradeAssignmentSubmission({
      submissionId,
      gradedById: session.userId,
      marksAwarded,
      rubricScoresJson,
      feedback,
      privateNotes,
      reasonForRevision,
    });

    return NextResponse.json({
      success: true,
      message: "Submission evaluated and grade recorded successfully.",
      grade,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to grade submission" },
      { status: error.status || 400 }
    );
  }
}
