import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PreferencesSchema = z.object({
  emailMarketing: z.boolean().optional(),
  whatsappNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
});

export async function GET() {
  try {
    const session = await requireAuth(["STUDENT"]);

    let pref = await prisma.communicationPreference.findUnique({
      where: { userId: session.userId },
    });

    if (!pref) {
      pref = await prisma.communicationPreference.create({
        data: {
          userId: session.userId,
          emailTransactional: true,
          emailMarketing: false,
          whatsappNotifications: true,
          smsNotifications: true,
        },
      });
    }

    return NextResponse.json({ preferences: pref });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to load preferences" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(["STUDENT"]);
    const body = await req.json();
    const parsed = PreferencesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const updated = await prisma.communicationPreference.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        emailTransactional: true,
        emailMarketing: parsed.data.emailMarketing ?? false,
        whatsappNotifications: parsed.data.whatsappNotifications ?? true,
        smsNotifications: parsed.data.smsNotifications ?? true,
        quietHoursStart: parsed.data.quietHoursStart || "21:00",
        quietHoursEnd: parsed.data.quietHoursEnd || "08:00",
      },
      update: {
        ...(parsed.data.emailMarketing !== undefined && { emailMarketing: parsed.data.emailMarketing }),
        ...(parsed.data.whatsappNotifications !== undefined && { whatsappNotifications: parsed.data.whatsappNotifications }),
        ...(parsed.data.smsNotifications !== undefined && { smsNotifications: parsed.data.smsNotifications }),
        ...(parsed.data.quietHoursStart && { quietHoursStart: parsed.data.quietHoursStart }),
        ...(parsed.data.quietHoursEnd && { quietHoursEnd: parsed.data.quietHoursEnd }),
      },
    });

    return NextResponse.json({
      success: true,
      preferences: updated,
      message: "Communication preferences saved successfully.",
    });
  } catch (error: any) {
    console.error("Preferences PUT error:", error);
    return NextResponse.json({ error: "Failed to update communication preferences" }, { status: 500 });
  }
}
