import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { z } from "zod";

const CreateAdmissionSchema = z.object({
  leadId: z.string().optional().nullable(),
  fullName: z.string().min(2, "Student name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(8, "Phone number is required"),
  courseId: z.string().min(1, "Course is required"),
  targetBatchId: z.string().optional().nullable(),
  agreedFee: z.number().min(0, "Agreed fee cannot be negative"),
  discountAmount: z.number().min(0).default(0),
  discountReason: z.string().optional().nullable(),
  schedulePreference: z.enum(["WEEKDAYS", "WEEKENDS", "FLEXIBLE"]).default("WEEKDAYS"),
  status: z
    .enum([
      "DRAFT",
      "PENDING_DOCS",
      "PENDING_APPROVAL",
      "APPROVED",
      "ACTIVE",
      "FINANCIAL_HOLD",
    ])
    .default("DRAFT"),
  notes: z.string().optional(),
});

// Helper to generate unique registration number
async function generateUniqueRegistrationNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const count = await prisma.studentProfile.count();
  const nextNum = (count + 1).toString().padStart(4, "0");
  const regNum = `ACA-${currentYear}-${nextNum}`;

  // Verify uniqueness
  const exists = await prisma.studentProfile.findUnique({
    where: { registrationNumber: regNum },
  });
  if (exists) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `ACA-${currentYear}-${randomSuffix}`;
  }
  return regNum;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(["MANAGER", "ADMIN", "FINANCIER"]);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const whereClause: any = {};
    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    const admissions = await prisma.admission.findMany({
      where: whereClause,
      include: {
        course: { select: { title: true, code: true } },
        targetBatch: { select: { code: true, scheduleType: true } },
        studentProfile: {
          include: {
            user: { select: { name: true, email: true, phone: true } },
          },
        },
        lead: { select: { fullName: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ admissions });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch admissions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["MANAGER", "ADMIN"]);
    const body = await req.json();
    const parsed = CreateAdmissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const {
      leadId,
      fullName,
      email,
      phone,
      courseId,
      targetBatchId,
      agreedFee,
      discountAmount,
      discountReason,
      schedulePreference,
      status,
      notes,
    } = parsed.data;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    // Check course exists
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Check target batch capacity if specified
    if (targetBatchId) {
      const batch = await prisma.batch.findUnique({
        where: { id: targetBatchId },
        include: { enrollments: { where: { status: "ACTIVE" } } },
      });
      if (!batch) {
        return NextResponse.json({ error: "Target batch not found" }, { status: 404 });
      }
      if (batch.enrollments.length >= batch.capacity) {
        return NextResponse.json(
          { error: `Target batch ${batch.code} is at full capacity (${batch.capacity} students max).` },
          { status: 400 }
        );
      }
    }

    const registrationNumber = await generateUniqueRegistrationNumber();

    const admission = await prisma.$transaction(async (tx) => {
      let studentProfileId: string | null = null;

      // If status is ACTIVE or APPROVED, ensure User & StudentProfile exist
      if (status === "ACTIVE" || status === "APPROVED") {
        let existingUser = await tx.user.findUnique({
          where: { email: normalizedEmail },
          include: { studentProfile: true },
        });

        if (!existingUser) {
          const defaultPasswordHash = await bcrypt.hash("Student@123456", 10);
          existingUser = await tx.user.create({
            data: {
              email: normalizedEmail,
              phone: normalizedPhone,
              name: fullName.trim(),
              role: "STUDENT",
              passwordHash: defaultPasswordHash,
              studentProfile: {
                create: {
                  registrationNumber,
                },
              },
            },
            include: { studentProfile: true },
          });
        } else if (!existingUser.studentProfile) {
          await tx.studentProfile.create({
            data: {
              userId: existingUser.id,
              registrationNumber,
            },
          });
          const reloaded = await tx.user.findUnique({
            where: { id: existingUser.id },
            include: { studentProfile: true },
          });
          existingUser = reloaded!;
        }

        studentProfileId = existingUser.studentProfile?.id || null;

        // If batch is allocated and status is ACTIVE, create enrollment
        if (targetBatchId && studentProfileId && status === "ACTIVE") {
          await tx.studentBatchEnrollment.upsert({
            where: {
              batchId_studentProfileId: {
                batchId: targetBatchId,
                studentProfileId,
              },
            },
            create: {
              batchId: targetBatchId,
              studentProfileId,
              status: "ACTIVE",
              effectiveStartDate: new Date(),
            },
            update: {
              status: "ACTIVE",
            },
          });
        }
      }

      // Create Admission record
      const adm = await tx.admission.create({
        data: {
          registrationNumber,
          leadId: leadId || null,
          studentProfileId,
          courseId,
          targetBatchId: targetBatchId || null,
          agreedFee,
          discountAmount,
          discountReason: discountReason || null,
          schedulePreference,
          status,
          notes: notes?.trim() || null,
          createdById: session.userId,
          approvedById: status === "ACTIVE" || status === "APPROVED" ? session.userId : null,
          approvedAt: status === "ACTIVE" || status === "APPROVED" ? new Date() : null,
        },
      });

      // Create fee agreement record
      if (studentProfileId) {
        await tx.feeAgreement.create({
          data: {
            admissionId: adm.id,
            studentProfileId,
            totalAgreedFee: Math.max(0, agreedFee - discountAmount),
            installmentsCount: 1,
            agreedTerms: "Official admission agreement recorded in Phase 1 operations.",
            isApproved: true,
            approvedById: session.userId,
          },
        });
      }

      // If originated from lead, update lead status
      if (leadId) {
        await tx.lead.update({
          where: { id: leadId },
          data: {
            status: status === "ACTIVE" ? "ADMITTED" : "APPLIED",
            convertedAdmissionId: adm.id,
          },
        });

        await tx.leadActivity.create({
          data: {
            leadId,
            actionType: "CONVERTED_TO_ADMISSION",
            notes: `Converted to official admission. Registration: ${registrationNumber}, Status: ${status}`,
            createdBy: session.name,
          },
        });
      }

      return adm;
    });

    await logAuditEvent({
      userId: session.userId,
      action: "ADMISSION_CREATED",
      entityType: "Admission",
      entityId: admission.id,
      details: {
        registrationNumber: admission.registrationNumber,
        status: admission.status,
        agreedFee: admission.agreedFee,
      },
    });

    return NextResponse.json({
      success: true,
      admission,
      registrationNumber: admission.registrationNumber,
      message: `Admission successfully created with Registration Number: ${admission.registrationNumber}`,
    });
  } catch (error: any) {
    console.error("Admission creation error:", error);
    return NextResponse.json({ error: "Failed to create admission" }, { status: 500 });
  }
}
