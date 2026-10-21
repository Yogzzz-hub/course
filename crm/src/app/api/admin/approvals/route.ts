import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const DecisionSchema = z.object({
  type: z.enum([
    "CORRECTION_REQUEST",
    "LEAVE_REQUEST",
    "BACKDATE_AUTHORIZATION",
    "STUDENT_COMPLETION",
  ]),
  id: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewNotes: z.string().optional(),
});

// GET: All pending approval queues
export async function GET() {
  try {
    const session = await requireAuth(["ADMIN", "MANAGER"]);

    // If manager, check if academy settings permit manager approvals
    if (session.role === "MANAGER") {
      const settings = await prisma.academySettings.findUnique({ where: { id: "default" } });
      if (!settings?.allowManagerApprovals) {
        return NextResponse.json(
          { error: "Manager approvals are currently disabled by Admin delegation policy." },
          { status: 403 }
        );
      }
    }

    const [corrections, leaveRequests, backdateAuthorizations, completionDecisions] =
      await Promise.all([
        prisma.correctionRequest.findMany({
          where: { status: "PENDING" },
          include: {
            requestedBy: { select: { name: true, email: true } },
            classSession: {
              include: { batch: { select: { code: true } } },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.leaveRequest.findMany({
          where: { status: "PENDING" },
          include: {
            studentProfile: {
              include: { user: { select: { name: true, email: true } } },
            },
            batch: { select: { code: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.backdateAuthorization.findMany({
          where: { isUsed: false, expiresAt: { gte: new Date() } },
          include: {
            trainerProfile: {
              include: { user: { select: { name: true } } },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.studentCompletionDecision.findMany({
          where: { status: "PENDING" },
          include: {
            studentProfile: {
              include: { user: { select: { name: true, email: true } } },
            },
            batch: { select: { code: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    return NextResponse.json({
      corrections,
      leaveRequests,
      backdateAuthorizations,
      completionDecisions,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to load approval queues" }, { status: 500 });
  }
}

// POST: Execute approval or rejection decision
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["ADMIN", "MANAGER"]);
    const body = await req.json();
    const parsed = DecisionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const { type, id, decision, reviewNotes } = parsed.data;

    // Check manager delegation
    if (session.role === "MANAGER") {
      const settings = await prisma.academySettings.findUnique({ where: { id: "default" } });
      if (!settings?.allowManagerApprovals) {
        return NextResponse.json(
          { error: "Manager approvals are not delegated by the administrator." },
          { status: 403 }
        );
      }
    }

    if (type === "CORRECTION_REQUEST") {
      const corr = await prisma.correctionRequest.findUnique({
        where: { id },
        include: { classSession: true },
      });

      if (!corr || corr.status !== "PENDING") {
        return NextResponse.json({ error: "Pending correction request not found" }, { status: 404 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.correctionRequest.update({
          where: { id },
          data: {
            status: decision,
            reviewedById: session.userId,
            reviewedAt: new Date(),
            reviewNotes: reviewNotes || null,
          },
        });

        // If approved, mutate the protected field on classSession
        if (decision === "APPROVED") {
          const updateData: any = {};
          if (corr.targetField === "notes") {
            updateData.notes = corr.proposedValue;
          } else if (corr.targetField === "actualStartTime") {
            updateData.actualStartTime = corr.proposedValue;
          } else if (corr.targetField === "actualEndTime") {
            updateData.actualEndTime = corr.proposedValue;
          }

          if (Object.keys(updateData).length > 0) {
            await tx.classSession.update({
              where: { id: corr.classSessionId },
              data: updateData,
            });
          }
        }

        await tx.auditEvent.create({
          data: {
            userId: session.userId,
            action: `CORRECTION_${decision}`,
            entityType: "CorrectionRequest",
            entityId: corr.id,
            detailsJson: JSON.stringify({
              targetField: corr.targetField,
              oldValue: corr.oldValue,
              proposedValue: corr.proposedValue,
              decision,
              reviewNotes,
            }),
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: `Correction request has been ${decision.toLowerCase()}.`,
      });
    }

    if (type === "LEAVE_REQUEST") {
      const leave = await prisma.leaveRequest.findUnique({ where: { id } });
      if (!leave || leave.status !== "PENDING") {
        return NextResponse.json({ error: "Pending leave request not found" }, { status: 404 });
      }

      await prisma.leaveRequest.update({
        where: { id },
        data: {
          status: decision,
          reviewedById: session.userId,
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || null,
        },
      });

      await logAuditEvent({
        userId: session.userId,
        action: `LEAVE_REQUEST_${decision}`,
        entityType: "LeaveRequest",
        entityId: leave.id,
        details: { decision, reviewNotes },
      });

      return NextResponse.json({
        success: true,
        message: `Leave request has been ${decision.toLowerCase()}.`,
      });
    }

    if (type === "STUDENT_COMPLETION") {
      const comp = await prisma.studentCompletionDecision.findUnique({ where: { id } });
      if (!comp) {
        return NextResponse.json({ error: "Completion record not found" }, { status: 404 });
      }

      await prisma.studentCompletionDecision.update({
        where: { id },
        data: {
          status: decision,
          decidedById: session.userId,
          decidedAt: new Date(),
          notes: reviewNotes || null,
        },
      });

      await logAuditEvent({
        userId: session.userId,
        action: `STUDENT_COMPLETION_${decision}`,
        entityType: "StudentCompletionDecision",
        entityId: comp.id,
        details: { decision, reviewNotes },
      });

      return NextResponse.json({
        success: true,
        message: `Student academic completion has been ${decision.toLowerCase()}.`,
      });
    }

    return NextResponse.json({ error: "Unsupported approval type" }, { status: 400 });
  } catch (error: any) {
    console.error("Approval decision execution error:", error);
    return NextResponse.json({ error: "Failed to process decision" }, { status: 500 });
  }
}
