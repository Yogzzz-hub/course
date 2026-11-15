import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const asOfIso = now.toISOString();

    const [students, invoices, notifications] = await Promise.all([
      prisma.studentProfile.findMany({
        include: {
          user: true,
          admissions: {
            include: {
              course: true,
              targetBatch: true,
            },
          },
        },
      }),
      prisma.invoice.findMany({
        where: {
          status: { notIn: ["VOID", "DRAFT"] },
        },
        include: {
          studentProfile: {
            include: {
              user: true,
              admissions: {
                include: {
                  course: true,
                  targetBatch: true,
                },
              },
            },
          },
        },
      }),
      prisma.notificationDeliveryLog.findMany({
        orderBy: { sentAt: "desc" },
        take: 50,
      }),
    ]);

    const bucketTotals: Record<"0-30" | "31-60" | "61-90" | "90+", { count: number; amounts: number[] }> = {
      "0-30": { count: 0, amounts: [] },
      "31-60": { count: 0, amounts: [] },
      "61-90": { count: 0, amounts: [] },
      "90+": { count: 0, amounts: [] },
    };

    const perStudent = new Map<string, any>();

    for (const stu of students) {
      const admission = stu.admissions[0];
      const stuReminders = notifications
        .filter((n) => n.recipientEmail === stu.user.email)
        .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

      perStudent.set(stu.id, {
        studentProfileId: stu.id,
        studentName: stu.user.name,
        studentEmail: stu.user.email,
        registrationNumber: stu.registrationNumber,
        batchCode: admission?.targetBatch?.code || "BATCH-DEFAULT",
        trackTitle: admission?.course?.title || "Technical Engineering",
        totalOutstandingPaise: 0,
        bucket0To30Paise: 0,
        bucket31To60Paise: 0,
        bucket61To90Paise: 0,
        bucket90PlusPaise: 0,
        maxDaysOverdue: 0,
        overdueInvoiceCount: 0,
        lastReminderAt: stuReminders[0]?.sentAt ? new Date(stuReminders[0].sentAt).toISOString() : null,
        lastNote: null,
      });
    }

    for (const inv of invoices) {
      const isPaid = inv.status === "PAID";
      const paidPaise = isPaid ? Math.round(inv.netTotal * 100) : 0;
      const netTotalPaise = Math.round(inv.netTotal * 100);
      const unpaid = Math.max(0, netTotalPaise - paidPaise);
      if (unpaid <= 0) continue;

      const detail = perStudent.get(inv.studentProfileId);
      if (!detail) continue;

      detail.totalOutstandingPaise += unpaid;

      const dueTime = new Date(inv.dueDate).getTime();
      const nowTime = now.getTime();
      const overdueDays = Math.max(0, Math.floor((nowTime - dueTime) / 86_400_000));
      if (overdueDays <= 0) continue;

      detail.overdueInvoiceCount += 1;
      detail.maxDaysOverdue = Math.max(detail.maxDaysOverdue, overdueDays);

      if (overdueDays <= 30) {
        bucketTotals["0-30"].count += 1;
        bucketTotals["0-30"].amounts.push(unpaid);
        detail.bucket0To30Paise += unpaid;
      } else if (overdueDays <= 60) {
        bucketTotals["31-60"].count += 1;
        bucketTotals["31-60"].amounts.push(unpaid);
        detail.bucket31To60Paise += unpaid;
      } else if (overdueDays <= 90) {
        bucketTotals["61-90"].count += 1;
        bucketTotals["61-90"].amounts.push(unpaid);
        detail.bucket61To90Paise += unpaid;
      } else {
        bucketTotals["90+"].count += 1;
        bucketTotals["90+"].amounts.push(unpaid);
        detail.bucket90PlusPaise += unpaid;
      }
    }

    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

    const buckets = [
      {
        bucket: "0-30",
        label: "0–30 days overdue",
        invoiceCount: bucketTotals["0-30"].count,
        amountPaise: sum(bucketTotals["0-30"].amounts),
      },
      {
        bucket: "31-60",
        label: "31–60 days overdue",
        invoiceCount: bucketTotals["31-60"].count,
        amountPaise: sum(bucketTotals["31-60"].amounts),
      },
      {
        bucket: "61-90",
        label: "61–90 days overdue",
        invoiceCount: bucketTotals["61-90"].count,
        amountPaise: sum(bucketTotals["61-90"].amounts),
      },
      {
        bucket: "90+",
        label: "90+ days overdue",
        invoiceCount: bucketTotals["90+"].count,
        amountPaise: sum(bucketTotals["90+"].amounts),
      },
    ];

    const studentList = Array.from(perStudent.values())
      .filter((s) => s.totalOutstandingPaise > 0)
      .sort((a, b) => b.maxDaysOverdue - a.maxDaysOverdue || b.totalOutstandingPaise - a.totalOutstandingPaise);

    const totalOverduePaise = buckets.reduce((s, b) => s + b.amountPaise, 0);

    return NextResponse.json({
      ageing: {
        asOfDate: asOfIso,
        buckets,
        totalOverduePaise,
        students: studentList,
      },
      notes: [],
      notifications: notifications.map((n) => ({
        id: n.id,
        recipientEmail: n.recipientEmail,
        kind: n.kind,
        sentAt: n.sentAt,
      })),
    });
  } catch (error: any) {
    console.error("[Financier Collections API Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch collections view", details: error.message },
      { status: 500 }
    );
  }
}
