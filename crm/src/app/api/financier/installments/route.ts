import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roundCurrency } from "@/lib/finance";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["FINANCIER", "ADMIN", "MANAGER"]);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const courseId = searchParams.get("courseId");
    const search = searchParams.get("search")?.toLowerCase();

    const now = new Date();

    const installments = await prisma.feeInstallment.findMany({
      include: {
        feeAgreement: {
          include: {
            studentProfile: {
              include: {
                user: { select: { name: true, email: true, phone: true } },
              },
            },
            admission: {
              include: {
                course: true,
                targetBatch: true,
              },
            },
          },
        },
        allocations: {
          include: {
            payment: {
              select: {
                transactionNumber: true,
                paymentDate: true,
                paymentMethod: true,
                verificationStatus: true,
              },
            },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // Compute aging and enrich records
    const enriched = installments.map((inst) => {
      const isOverdue = inst.remainingBalance > 0.01 && new Date(inst.dueDate) < now;
      let computedStatus = inst.status;
      if (isOverdue && inst.status !== "PAID") {
        computedStatus = "OVERDUE";
      }

      let agingBucket = "NOT_YET_DUE";
      let daysOverdue = 0;
      if (isOverdue) {
        const diffMs = now.getTime() - new Date(inst.dueDate).getTime();
        daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (daysOverdue <= 7) agingBucket = "1_7_DAYS";
        else if (daysOverdue <= 30) agingBucket = "8_30_DAYS";
        else if (daysOverdue <= 60) agingBucket = "31_60_DAYS";
        else agingBucket = "61_PLUS_DAYS";
      }

      return {
        id: inst.id,
        installmentNumber: inst.installmentNumber,
        dueDate: inst.dueDate,
        amountDue: inst.amountDue,
        amountPaid: inst.amountPaid,
        remainingBalance: inst.remainingBalance,
        status: computedStatus,
        agingBucket,
        daysOverdue,
        studentName: inst.feeAgreement?.studentProfile?.user?.name || "Student",
        studentEmail: inst.feeAgreement?.studentProfile?.user?.email || "—",
        studentPhone: inst.feeAgreement?.studentProfile?.user?.phone || "—",
        registrationNumber: inst.feeAgreement?.studentProfile?.registrationNumber || "—",
        courseCode: inst.feeAgreement?.admission?.course?.code || "—",
        courseTitle: inst.feeAgreement?.admission?.course?.title || "—",
        batchCode: inst.feeAgreement?.admission?.targetBatch?.code || "—",
        agreementNumber: inst.feeAgreement?.id ? `AGR-${inst.feeAgreement.id.slice(0, 8).toUpperCase()}` : "—",
        allocations: inst.allocations,
      };
    });

    // Apply filtering
    let filtered = enriched;
    if (status && status !== "ALL") {
      filtered = filtered.filter((i) => i.status === status);
    }
    if (courseId && courseId !== "ALL") {
      filtered = filtered.filter((i) => i.courseCode === courseId);
    }
    if (search) {
      filtered = filtered.filter(
        (i) =>
          i.studentName.toLowerCase().includes(search) ||
          i.registrationNumber.toLowerCase().includes(search) ||
          i.studentEmail.toLowerCase().includes(search)
      );
    }

    // Summary aging statistics
    const agingSummary = {
      notYetDue: roundCurrency(
        enriched
          .filter((i) => i.agingBucket === "NOT_YET_DUE" && i.remainingBalance > 0.01)
          .reduce((sum, i) => sum + i.remainingBalance, 0)
      ),
      days1To7: roundCurrency(
        enriched
          .filter((i) => i.agingBucket === "1_7_DAYS")
          .reduce((sum, i) => sum + i.remainingBalance, 0)
      ),
      days8To30: roundCurrency(
        enriched
          .filter((i) => i.agingBucket === "8_30_DAYS")
          .reduce((sum, i) => sum + i.remainingBalance, 0)
      ),
      days31To60: roundCurrency(
        enriched
          .filter((i) => i.agingBucket === "31_60_DAYS")
          .reduce((sum, i) => sum + i.remainingBalance, 0)
      ),
      days61Plus: roundCurrency(
        enriched
          .filter((i) => i.agingBucket === "61_PLUS_DAYS")
          .reduce((sum, i) => sum + i.remainingBalance, 0)
      ),
      totalOutstanding: roundCurrency(
        enriched.reduce((sum, i) => sum + i.remainingBalance, 0)
      ),
      totalOverdue: roundCurrency(
        enriched
          .filter((i) => i.status === "OVERDUE")
          .reduce((sum, i) => sum + i.remainingBalance, 0)
      ),
    };

    return NextResponse.json({
      installments: filtered,
      agingSummary,
      totalCount: filtered.length,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("Installments fetch error:", error);
    return NextResponse.json({ error: "Failed to load fee installments" }, { status: 500 });
  }
}
