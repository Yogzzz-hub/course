import { NextRequest, NextResponse } from "next/server";
import {
  handleStudentPanelError,
  requireStudentSession,
  submitStudentPanelAssignment,
} from "@/lib/student-panel";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { studentProfileId } = await requireStudentSession();
    const { id: assignmentId } = await params;

    const contentType = request.headers.get("content-type") || "";
    let repositoryUrl = "";
    let liveUrl = "";
    let attachmentName: string | undefined;
    let attachmentSize = 0;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      repositoryUrl = String(form.get("repositoryUrl") || "");
      liveUrl = String(form.get("liveUrl") || "");
      const file = form.get("attachment");
      if (file && typeof file === "object" && "name" in file && "size" in file) {
        attachmentName = String(file.name);
        attachmentSize = Number(file.size) || 0;
      }
    } else {
      const body = (await request.json().catch(() => ({}))) as {
        repositoryUrl?: string;
        externalLink?: string;
        liveUrl?: string;
        attachmentName?: string;
      };
      repositoryUrl = String(body.repositoryUrl || body.externalLink || "");
      liveUrl = String(body.liveUrl || "");
      attachmentName = body.attachmentName ? String(body.attachmentName) : undefined;
    }

    const updatedAssignment = await submitStudentPanelAssignment({
      assignmentId,
      studentProfileId,
      repositoryUrl,
      liveUrl,
      attachmentName,
      attachmentSize,
    });

    return NextResponse.json(updatedAssignment, { status: 201 });
  } catch (error) {
    return handleStudentPanelError(error, "Failed to submit assignment");
  }
}
