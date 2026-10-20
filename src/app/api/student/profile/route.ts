import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const ProfileUpdateSchema = z.object({
  phone: z.string().min(8).optional(),
  address: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(["STUDENT"]);
    const body = await req.json();
    const parsed = ProfileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const { phone, address, emergencyContact } = parsed.data;

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
    });

    if (!studentProfile) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    // Update student profile and user phone if provided
    await prisma.$transaction(async (tx) => {
      await tx.studentProfile.update({
        where: { id: studentProfile.id },
        data: {
          address: address !== undefined ? address : studentProfile.address,
          emergencyContact:
            emergencyContact !== undefined ? emergencyContact : studentProfile.emergencyContact,
        },
      });

      if (phone) {
        await tx.user.update({
          where: { id: session.userId },
          data: { phone },
        });
      }

      await tx.auditEvent.create({
        data: {
          userId: session.userId,
          action: "STUDENT_PROFILE_UPDATED",
          entityType: "StudentProfile",
          entityId: studentProfile.id,
          detailsJson: JSON.stringify({ phone, address, emergencyContact }),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Personal contact details updated successfully.",
    });
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
