import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logAuditEvent } from "@/lib/audit";

const EnquirySchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please provide a valid email address"),
  phone: z.string().min(8, "Please enter a valid phone number with area code"),
  courseInterestId: z.string().optional().nullable(),
  schedulePreference: z.enum(["WEEKDAYS", "WEEKENDS", "FLEXIBLE"]).default("FLEXIBLE"),
  message: z.string().max(1000).optional(),
  source: z.string().default("Website Enquiry"),
  consentGiven: z.boolean().refine((val) => val === true, "Consent is required to submit an enquiry"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = EnquirySchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const {
      fullName,
      email,
      phone,
      courseInterestId,
      schedulePreference,
      message,
      source,
      consentGiven,
    } = parsed.data;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    // Check for existing manager to assign lead automatically (round-robin or default)
    const defaultManager = await prisma.managerProfile.findFirst();

    // Check duplicate lead created in the last 15 minutes to prevent spam/double-click
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentDuplicate = await prisma.lead.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { phone: normalizedPhone },
        ],
        createdAt: { gte: fifteenMinutesAgo },
      },
    });

    if (recentDuplicate) {
      return NextResponse.json({
        success: true,
        leadId: recentDuplicate.id,
        isExisting: true,
        message: "Your enquiry was recently recorded. Our admissions team has already been notified.",
      });
    }

    // Persist real Lead in SQLite database
    const lead = await prisma.lead.create({
      data: {
        fullName: fullName.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        courseInterestId: courseInterestId || null,
        schedulePreference,
        status: "NEW",
        source,
        message: message?.trim() || null,
        consentGiven,
        assignedManagerId: defaultManager?.id || null,
        activities: {
          create: {
            actionType: "LEAD_CREATED",
            notes: `Enquiry submitted online for ${schedulePreference} schedule. Message: "${message || 'None'}"`,
            createdBy: "Public Web Form",
          },
        },
      },
      include: {
        courseInterest: {
          select: { title: true, code: true },
        },
      },
    });

    // Create real-time In-App Notification for Admin and Manager accounts
    try {
      const staffUsers = await prisma.user.findMany({
        where: {
          role: { in: ["ADMIN", "MANAGER"] },
          isActive: true,
        },
        select: { id: true },
      });

      const progTitle = lead.courseInterest?.title || "Executive Engineering";
      for (const staff of staffUsers) {
        await prisma.notification.create({
          data: {
            userId: staff.id,
            title: `New Student Applicant: ${lead.fullName}`,
            message: `${lead.fullName} (${lead.email}) submitted an application for ${progTitle}. Phone: ${lead.phone}.`,
            category: "ACADEMIC",
            linkUrl: "/admin/admissions",
            isRead: false,
          },
        });
      }
    } catch (notifErr) {
      console.warn("Failed to create staff notification:", notifErr);
    }

    await logAuditEvent({
      action: "PUBLIC_ENQUIRY_SUBMITTED",
      entityType: "Lead",
      entityId: lead.id,
      details: {
        email: lead.email,
        course: lead.courseInterest?.title || "General",
        schedule: lead.schedulePreference,
      },
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
    });

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      message: "Thank you for reaching out! Your enquiry has been received by our admissions team.",
    });
  } catch (error) {
    console.error("Enquiry submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit enquiry. Please try again." },
      { status: 500 }
    );
  }
}
