import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const LeaveSchema = z.object({
  batchId: z.string().min(1, "Batch is required"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date (YYYY-MM-DD)"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date (YYYY-MM-DD)"),
  reason: z.string().min(5, "A descriptive reason is required (min 5 chars)"),
});

export async function GET() {
  try {
    const session = await requireAuth(["STUDENT"]);
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: { studentProfileId: profile.id },
      include: {
        batch: { select: { code: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ leaveRequests });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch leave requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["STUDENT"]);
    const body = await req.json();
    const parsed = LeaveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const { batchId, startDate, endDate, reason } = parsed.data;

    const profile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!profile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    // Verify enrollment
    const enrollment = await prisma.studentBatchEnrollment.findUnique({
      where: {
        batchId_studentProfileId: {
          batchId,
          studentProfileId: profile.id,
        },
      },
    });

    if (!enrollment || enrollment.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "You are not actively enrolled in this batch." },
        { status: 403 }
      );
    }

    const sDate = new Date(`${startDate}T00:00:00Z`);
    const eDate = new Date(`${endDate}T23:59:59Z`);

    if (eDate < sDate) {
      return NextResponse.json(
        { error: "End date cannot precede start date." },
        { status: 400 }
      );
    }

    const request = await prisma.leaveRequest.create({
      data: {
        studentProfileId: profile.id,
        batchId,
        startDate: sDate,
        endDate: eDate,
        reason: reason.trim(),
        status: "PENDING",
      },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "LEAVE_REQUESTED",
      entityType: "LeaveRequest",
      entityId: request.id,
      details: { startDate, endDate, reason },
    });

    return NextResponse.json({
      success: true,
      leaveRequest: request,
      message: "Leave request submitted. Staff review is pending.",
    });
  } catch (error: any) {
    console.error("Leave request error:", error);
    return NextResponse.json({ error: "Failed to submit leave request" }, { status: 500 });
  }
}
