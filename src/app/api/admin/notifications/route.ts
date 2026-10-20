import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const UpdateTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  code: z.string().min(2, "Template code is required"),
  channel: z.enum(["IN_APP", "EMAIL", "SMS", "WHATSAPP"]),
  subject: z.string().optional().nullable(),
  body: z.string().min(5, "Body template text is required"),
  variables: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    await requireAuth(["ADMIN", "MANAGER"]);

    const [templates, deliveryLogs] = await Promise.all([
      prisma.notificationTemplate.findMany({
        orderBy: { code: "asc" },
      }),
      prisma.notificationDeliveryLog.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      templates: templates.map((t) => ({
        id: t.id,
        name: t.code,
        code: t.code,
        channel: t.channel,
        subject: t.subject,
        body: t.bodyTemplate,
        variables: "",
        isActive: t.isActive,
      })),
      deliveryLogs: deliveryLogs.map((log) => ({
        id: log.id,
        channel: log.channel,
        status: log.status,
        provider: log.provider,
        providerMessageId: log.providerMessageId,
        errorReason: log.errorMessage,
        attemptedAt: log.createdAt,
        recipientName: log.recipientContact,
        recipientRole: "RECIPIENT",
        eventType: log.eventType,
        subject: log.renderedSubject || "—",
      })),
      rules: [],
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("Notifications admin GET error:", error);
    return NextResponse.json({ error: "Failed to load notification settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["ADMIN"]);
    const body = await req.json();
    const parsed = UpdateTemplateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const { id, code, channel, subject, body: templateBody, isActive } = parsed.data;

    let template;
    if (id) {
      template = await prisma.notificationTemplate.update({
        where: { id },
        data: {
          code,
          channel,
          subject,
          bodyTemplate: templateBody,
          isActive,
        },
      });
    } else {
      template = await prisma.notificationTemplate.upsert({
        where: { code },
        update: {
          channel,
          subject,
          bodyTemplate: templateBody,
          isActive,
        },
        create: {
          code,
          channel,
          subject,
          bodyTemplate: templateBody,
          isActive,
        },
      });
    }

    await logAuditEvent({
      userId: session.userId,
      action: id ? "NOTIFICATION_TEMPLATE_UPDATED" : "NOTIFICATION_TEMPLATE_CREATED",
      entityType: "NotificationTemplate",
      entityId: template.id,
      details: { code, channel },
    });

    return NextResponse.json({
      success: true,
      template,
      message: `Template "${code}" saved successfully.`,
    });
  } catch (error: any) {
    console.error("Notifications admin POST error:", error);
    return NextResponse.json({ error: "Failed to save template" }, { status: 500 });
  }
}
