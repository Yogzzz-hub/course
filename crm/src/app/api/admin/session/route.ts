import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPanelCsrfToken } from "@/lib/student-panel";

export const dynamic = "force-dynamic";

const ALL_ADMIN_PERMISSIONS = [
  "leads.read",
  "leads.write",
  "offers.read",
  "offers.decide",
  "ledger.read",
  "ledger.reconcile",
  "proofs.review",
  "proofs.approve",
  "refunds.request",
  "refunds.decide",
  "refunds.execute",
  "cms.read",
  "cms.write",
  "cms.publish",
  "cms.rebuild",
  "reports.read",
  "reports.export",
  "audit.read",
  "search.read",
  "notifications.read",
  "notifications.write",
  "operations.read",
] as const;

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ state: "anonymous" }, { status: 200 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: session.userId },
          ...(session.email ? [{ email: session.email.toLowerCase().trim() }] : []),
        ],
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive || user.role !== "ADMIN") {
      return NextResponse.json({ state: "anonymous" }, { status: 200 });
    }

    const pendingApprovals = await prisma.financialApprovalRequest.findMany({
      where: { status: "PENDING" },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    return NextResponse.json({
      state: "authenticated",
      userId: user.id,
      cacheKey: `admin-${user.id}`,
      name: user.name,
      csrfToken: createPanelCsrfToken({ ...session, userId: user.id, email: user.email, name: user.name }),
      permissions: [...ALL_ADMIN_PERMISSIONS],
      twoFactorVerified: true,
      expiresAt,
      twoFactorExpiresAt: expiresAt,
      pendingFinancialOperations: pendingApprovals.map((item) => item.id),
    });
  } catch (error) {
    console.error("Admin session error:", error);
    return NextResponse.json({ state: "anonymous" }, { status: 200 });
  }
}
