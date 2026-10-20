import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(["ADMIN"]);
    const { id } = await params;
    const body = await req.json();

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent admin from disabling their own account
    if (id === session.userId && body.isActive === false) {
      return NextResponse.json(
        { error: "You cannot deactivate your own administrative account." },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        isActive: body.isActive !== undefined ? body.isActive : user.isActive,
      },
    });

    await logAuditEvent({
      userId: session.userId,
      action: updated.isActive ? "USER_REACTIVATED" : "USER_DEACTIVATED",
      entityType: "User",
      entityId: id,
      details: { email: updated.email, role: updated.role },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
