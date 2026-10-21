import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const SettingsSchema = z.object({
  academyName: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(6),
  address: z.string().min(5),
  attendanceThresholdPercent: z.number().min(50).max(100),
  attendanceDenominatorPolicy: z.enum(["HELD_TO_DATE", "SCHEDULED"]),
  leaveAffectsDenominator: z.boolean(),
  allowManagerApprovals: z.boolean(),
});

export async function GET() {
  try {
    await requireAuth(["ADMIN", "MANAGER"]);

    let settings = await prisma.academySettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.academySettings.create({
        data: { id: "default" },
      });
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(["ADMIN"]);
    const body = await req.json();
    const parsed = SettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const updated = await prisma.academySettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        ...parsed.data,
      },
      update: parsed.data,
    });

    await logAuditEvent({
      userId: session.userId,
      action: "ACADEMY_SETTINGS_UPDATED",
      entityType: "AcademySettings",
      entityId: "default",
      details: parsed.data,
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    console.error("Settings update error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
