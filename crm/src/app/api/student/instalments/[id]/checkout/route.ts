import { NextRequest, NextResponse } from "next/server";
import {
  createStudentPanelInstalmentOrder,
  handleStudentPanelError,
  requireStudentSession,
} from "@/lib/student-panel";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { studentProfileId } = await requireStudentSession();
    const { id } = await params;
    const order = await createStudentPanelInstalmentOrder(studentProfileId, id);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return handleStudentPanelError(error, "Failed to initiate instalment checkout");
  }
}
