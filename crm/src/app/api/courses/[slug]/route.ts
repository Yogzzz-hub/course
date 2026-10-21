import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const course = await prisma.course.findFirst({
      where: {
        OR: [
          { slug },
          { code: slug.toUpperCase() },
          { id: slug },
        ],
        isPublished: true,
        active: true,
      },
      include: {
        syllabusVersions: {
          where: { status: "APPROVED" },
          include: {
            modules: {
              orderBy: { orderIndex: "asc" },
              include: {
                subtopics: {
                  orderBy: { orderIndex: "asc" },
                },
              },
            },
          },
        },
        batches: {
          where: { status: { in: ["UPCOMING", "ACTIVE"] } },
          include: {
            trainerAllocations: {
              include: {
                trainerProfile: {
                  include: { user: { select: { name: true, email: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found or currently unavailable" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      course,
    });
  } catch (error: any) {
    console.error("GET /api/courses/[slug] error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve course details", message: error.message },
      { status: 500 }
    );
  }
}
