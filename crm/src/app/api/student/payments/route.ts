import { NextResponse } from "next/server";
import {
  getStudentPanelPayments,
  handleStudentPanelError,
  requireStudentSession,
} from "@/lib/student-panel";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { studentProfileId } = await requireStudentSession();
    const payments = await getStudentPanelPayments(studentProfileId);
    return NextResponse.json(payments);
  } catch (error) {
    return handleStudentPanelError(error, "Failed to load student payments");
  }
}
