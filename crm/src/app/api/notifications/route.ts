import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({
        where: { userId: session.userId, isRead: false },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error: any) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();

    if (body.all) {
      await prisma.notification.updateMany({
        where: { userId: session.userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return NextResponse.json({ success: true, message: "All notifications marked as read." });
    }

    if (body.id) {
      await prisma.notification.updateMany({
        where: { id: body.id, userId: session.userId },
        data: { isRead: true, readAt: new Date() },
      });
      return NextResponse.json({ success: true, message: "Notification marked as read." });
    }

    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  } catch (error: any) {
    console.error("Notifications PATCH error:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
