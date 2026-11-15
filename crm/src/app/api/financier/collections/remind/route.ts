import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentProfileId } = body;
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: { user: true },
    });

    const notif = await prisma.notificationDeliveryLog.create({
      data: {
        recipientEmail: student?.user?.email || "student@apexacademy.edu",
        kind: "FEE_REMINDER",
        status: "SENT",
        provider: "simulated",
        subject: `Fee Reminder — ${student?.user?.name || "Student"}`,
      },
    });

    return NextResponse.json({ notification: notif }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
