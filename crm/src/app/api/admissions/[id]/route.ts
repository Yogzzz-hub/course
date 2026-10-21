import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const UpdateAdmissionSchema = z.object({
  status: z
    .enum([
      "DRAFT",
      "PENDING_DOCS",
      "PENDING_APPROVAL",
      "APPROVED",
      "ACTIVE",
      "PAUSED",
      "WITHDRAWN",
      "GRADUATED",
      "FINANCIAL_HOLD",
    ])
    .optional(),
  targetBatchId: z.string().optional().nullable(),
  financialHold: z.boolean().optional(),
  notes: z.string().optional(),
  discountAmount: z.number().min(0).optional(),
  discountReason: z.string().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(["MANAGER", "ADMIN", "FINANCIER"]);
    const { id } = await params;

    const admission = await prisma.admission.findUnique({
      where: { id },
      include: {
        course: true,
        targetBatch: true,
        studentProfile: {
          include: {
            user: true,
            enrollments: { include: { batch: true } },
          },
        },
        lead: true,
        feeAgreements: true,
      },
    });

    if (!admission) {
      return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    }

    return NextResponse.json({ admission });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch admission" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(["ADMIN", "MANAGER"]);
    const { id } = await params;
    const body = await req.json();

    const parsed = UpdateAdmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const existing = await prisma.admission.findUnique({
      where: { id },
      include: { studentProfile: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    }

    const dataToUpdate: any = {};
    if (parsed.data.status !== undefined) {
      dataToUpdate.status = parsed.data.status;
      if (parsed.data.status === "APPROVED" || parsed.data.status === "ACTIVE") {
        dataToUpdate.approvedById = session.userId;
        dataToUpdate.approvedAt = new Date();
      }
    }

    if (parsed.data.targetBatchId !== undefined) {
      dataToUpdate.targetBatchId = parsed.data.targetBatchId;
    }

    if (parsed.data.financialHold !== undefined) {
      dataToUpdate.financialHold = parsed.data.financialHold;
    }

    if (parsed.data.notes !== undefined) {
      dataToUpdate.notes = parsed.data.notes;
    }

    if (parsed.data.discountAmount !== undefined) {
      dataToUpdate.discountAmount = parsed.data.discountAmount;
    }

    if (parsed.data.discountReason !== undefined) {
      dataToUpdate.discountReason = parsed.data.discountReason;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const adm = await tx.admission.update({
        where: { id },
        data: dataToUpdate,
        include: {
          course: true,
          targetBatch: true,
          studentProfile: { include: { user: true } },
        },
      });

      // If status is updated to ACTIVE and there's a targetBatch and studentProfile, ensure active enrollment
      if (
        (parsed.data.status === "ACTIVE" || adm.status === "ACTIVE") &&
        adm.targetBatchId &&
        adm.studentProfileId
      ) {
        await tx.studentBatchEnrollment.upsert({
          where: {
            batchId_studentProfileId: {
              batchId: adm.targetBatchId,
              studentProfileId: adm.studentProfileId,
            },
          },
          create: {
            batchId: adm.targetBatchId,
            studentProfileId: adm.studentProfileId,
            status: "ACTIVE",
            effectiveStartDate: new Date(),
          },
          update: {
            status: "ACTIVE",
          },
        });
      }

      return adm;
    });

    await logAuditEvent({
      userId: session.userId,
      action: "ADMISSION_UPDATED",
      entityType: "Admission",
      entityId: id,
      details: {
        previousStatus: existing.status,
        newStatus: updated.status,
        financialHold: updated.financialHold,
        targetBatchId: updated.targetBatchId,
      },
    });

    return NextResponse.json({
      success: true,
      admission: updated,
      message: "Admission successfully updated",
    });
  } catch (error: any) {
    console.error("Admission update error:", error);
    return NextResponse.json({ error: "Failed to update admission" }, { status: 500 });
  }
}
