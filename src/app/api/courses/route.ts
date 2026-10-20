import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const category = searchParams.get("category");
    const mode = searchParams.get("mode");

    const whereClause: any = {
      isPublished: true,
      active: true,
    };

    if (q) {
      whereClause.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { code: { contains: q } },
      ];
    }

    if (category && category !== "ALL") {
      whereClause.category = category;
    }

    if (mode && mode !== "ALL") {
      whereClause.deliveryMode = { contains: mode };
    }

    const [courses, allCategories] = await Promise.all([
      prisma.course.findMany({
        where: whereClause,
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
            take: 1,
          },
          batches: {
            where: { status: { in: ["UPCOMING", "ACTIVE"] } },
            select: {
              id: true,
              code: true,
              scheduleType: true,
              startDate: true,
              status: true,
              capacity: true,
            },
          },
        },
        orderBy: { code: "asc" },
      }),
      prisma.course.findMany({
        where: { isPublished: true, active: true },
        select: { category: true },
        distinct: ["category"],
      }),
    ]);

    const categories = [
      "ALL",
      ...Array.from(new Set(allCategories.map((c) => c.category).filter(Boolean))),
    ];

    return NextResponse.json({
      success: true,
      total: courses.length,
      categories,
      courses,
    });
  } catch (error: any) {
    console.error("GET /api/courses error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve courses list", message: error.message },
      { status: 500 }
    );
  }
}
