import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const UpdateLeadSchema = z.object({
  status: z
    .enum([
      "NEW",
      "CONTACTED",
      "COUNSELLING_SCHEDULED",
      "INTERESTED",
      "APPLIED",
      "ADMITTED",
      "LOST",
    ])
    .optional(),
  assignedManagerId: z.string().optional().nullable(),
  followUpDate: z.string().optional().nullable(),
  nextAction: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lostReason: z.string().optional().nullable(),
  activityNote: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(["MANAGER", "ADMIN"]);
    const { id } = await params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        courseInterest: true,
        assignedManager: { include: { user: { select: { name: true, email: true } } } },
        activities: { orderBy: { createdAt: "desc" } },
        admissions: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(["MANAGER", "ADMIN"]);
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateLeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const {
      status,
      assignedManagerId,
      followUpDate,
      nextAction,
      notes,
      lostReason,
      activityNote,
    } = parsed.data;

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (status !== undefined) {
      updateData.status = status;
      if (status === "LOST") {
        updateData.isLost = true;
        updateData.lostReason = lostReason || "Not specified";
      } else if (lead.isLost) {
        updateData.isLost = false;
        updateData.lostReason = null;
      }
    }

    if (assignedManagerId !== undefined) updateData.assignedManagerId = assignedManagerId;
    if (followUpDate !== undefined) {
      updateData.followUpDate = followUpDate ? new Date(followUpDate) : null;
    }
    if (nextAction !== undefined) updateData.nextAction = nextAction;
    if (notes !== undefined) updateData.notes = notes;

    // Mutate lead and add activity entry atomically
    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.lead.update({
        where: { id },
        data: updateData,
      });

      let activityText = activityNote;
      let actionType = "UPDATE";

      if (status && status !== lead.status) {
        actionType = "STATUS_CHANGE";
        activityText = `Status transitioned from ${lead.status} to ${status}. ${activityNote || ""}`;
      } else if (!activityText) {
        activityText = "Lead attributes updated.";
      }

      await tx.leadActivity.create({
        data: {
          leadId: id,
          actionType,
          notes: activityText.trim(),
          createdBy: session.name,
        },
      });

      return res;
    });

    await logAuditEvent({
      userId: session.userId,
      action: "LEAD_UPDATED",
      entityType: "Lead",
      entityId: id,
      details: { status: updated.status, followUpDate: updated.followUpDate },
    });

    return NextResponse.json({ success: true, lead: updated });
  } catch (error: any) {
    console.error("Update lead error:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}
