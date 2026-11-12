import { NextRequest, NextResponse } from "next/server";
import {
  getStudentPanelOrder,
  handleStudentPanelError,
  requireStudentSession,
} from "@/lib/student-panel";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { studentProfileId } = await requireStudentSession();
    const { id } = await params;
    const order = await getStudentPanelOrder(studentProfileId, id);
    return NextResponse.json(order);
  } catch (error) {
    return handleStudentPanelError(error, "Failed to fetch payment order");
  }
}
