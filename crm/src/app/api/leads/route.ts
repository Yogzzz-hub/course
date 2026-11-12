import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const CreateLeadSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  courseInterestId: z.string().optional().nullable(),
  schedulePreference: z.enum(["WEEKDAYS", "WEEKENDS", "FLEXIBLE"]).default("FLEXIBLE"),
  source: z.string().default("Direct Inquiry"),
  notes: z.string().optional(),
  assignedManagerId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(["MANAGER", "ADMIN"]);
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const q = searchParams.get("q");

    const whereClause: any = {};
    if (status && status !== "ALL") {
      whereClause.status = status;
    }
    if (q) {
      whereClause.OR = [
        { fullName: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where: whereClause,
      include: {
        courseInterest: { select: { id: true, title: true, code: true } },
        assignedManager: { include: { user: { select: { name: true } } } },
        activities: { orderBy: { createdAt: "desc" }, take: 2 },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ leads });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["MANAGER", "ADMIN"]);
    const body = await req.json();
    const parsed = CreateLeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const {
      fullName,
      email,
      phone,
      courseInterestId,
      schedulePreference,
      source,
      notes,
      assignedManagerId,
    } = parsed.data;

    const lead = await prisma.lead.create({
      data: {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        courseInterestId: courseInterestId || null,
        schedulePreference,
        status: "NEW",
        source,
        notes: notes?.trim() || null,
        assignedManagerId: assignedManagerId || null,
        activities: {
          create: {
            actionType: "LEAD_CREATED_MANUAL",
            notes: `Lead entered manually by ${session.name}`,
            createdBy: session.name,
          },
        },
      },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "LEAD_CREATED",
      entityType: "Lead",
      entityId: lead.id,
      details: { email: lead.email, source },
    });

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    console.error("Create lead error:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
