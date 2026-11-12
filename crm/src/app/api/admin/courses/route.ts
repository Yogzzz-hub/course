import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const CreateCourseSchema = z.object({
  code: z.string().min(2).toUpperCase(),
  slug: z.string().min(2),
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.string().min(2),
  durationWeeks: z.number().min(1),
  durationHours: z.number().min(1),
  prerequisites: z.string().optional(),
  deliveryMode: z.string().default("Hybrid"),
  isPublished: z.boolean().default(false),
  agreedFeeDefault: z.number().min(0).default(0),
});

export async function GET() {
  try {
    await requireAuth(["ADMIN", "MANAGER"]);

    const courses = await prisma.course.findMany({
      include: {
        syllabusVersions: {
          include: {
            modules: {
              include: { subtopics: true },
            },
          },
        },
        batches: {
          select: {
            id: true,
            code: true,
            status: true,
            _count: { select: { enrollments: true } },
          },
        },
        _count: { select: { admissions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ courses });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["ADMIN"]);
    const body = await req.json();
    const parsed = CreateCourseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const {
      code,
      slug,
      title,
      description,
      category,
      durationWeeks,
      durationHours,
      prerequisites,
      deliveryMode,
      isPublished,
      agreedFeeDefault,
    } = parsed.data;

    // Check code / slug uniqueness
    const exists = await prisma.course.findFirst({
      where: { OR: [{ code }, { slug }] },
    });

    if (exists) {
      return NextResponse.json(
        { error: "A course with this code or URL slug already exists." },
        { status: 409 }
      );
    }

    // Create course with initial version 1 syllabus draft
    const course = await prisma.course.create({
      data: {
        code,
        slug,
        title,
        description,
        category,
        durationWeeks,
        durationHours,
        prerequisites,
        deliveryMode,
        isPublished,
        active: true,
        agreedFeeDefault,
        syllabusVersions: {
          create: {
            versionNumber: 1,
            title: `${title} Standard Curriculum v1.0`,
            status: "DRAFT",
          },
        },
      },
      include: { syllabusVersions: true },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "COURSE_CREATED",
      entityType: "Course",
      entityId: course.id,
      details: { code, title, isPublished },
    });

    return NextResponse.json({ success: true, course });
  } catch (error: any) {
    console.error("Create course error:", error);
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
  }
}
