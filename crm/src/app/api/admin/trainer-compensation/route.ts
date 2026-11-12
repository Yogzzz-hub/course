import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { z } from "zod";

const TrainerPolicySchema = z.object({
  trainerProfileId: z.string().min(1, "Trainer profile ID is required"),
  policyType: z.enum(["MONTHLY_SALARY", "PER_SESSION", "PER_HOUR"]),
  baseRate: z.number().min(0, "Base rate must be greater than or equal to 0"),
  currency: z.string().default("INR"),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date (YYYY-MM-DD)"),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  try {
    await requireAuth(["ADMIN"]);

    const [policies, trainers] = await Promise.all([
      prisma.trainerCompensationPolicy.findMany({
        include: {
          trainerProfile: {
            include: { user: { select: { name: true, email: true, phone: true } } },
          },
        },
        orderBy: { effectiveStartDate: "desc" },
      }),
      prisma.trainerProfile.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return NextResponse.json({
      policies: policies.map((p: any) => ({
        id: p.id,
        policyType: p.policyType,
        baseRate: p.baseRate,
        currency: p.currency,
        effectiveFrom: p.effectiveStartDate,
        isActive: p.isActive,
        notes: p.notes,
        trainerProfile: p.trainerProfile,
        rates: [{ id: p.id, rate: p.baseRate, effectiveFrom: p.effectiveStartDate }],
      })),
      trainers,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("Trainer compensation policies GET error:", error);
    return NextResponse.json({ error: "Failed to load trainer compensation" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["ADMIN"]);
    const body = await req.json();
    const parsed = TrainerPolicySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }

    const { trainerProfileId, policyType, baseRate, currency, effectiveFrom, notes } =
      parsed.data;

    const trainer = await prisma.trainerProfile.findUnique({
      where: { id: trainerProfileId },
      include: { user: true },
    });

    if (!trainer) {
      return NextResponse.json({ error: "Trainer profile not found" }, { status: 404 });
    }

    // Deactivate previous active policies for this trainer
    await prisma.trainerCompensationPolicy.updateMany({
      where: { trainerProfileId, isActive: true },
      data: { isActive: false, effectiveEndDate: new Date() },
    });

    // Create new policy
    const policy = await prisma.trainerCompensationPolicy.create({
      data: {
        trainerProfileId,
        policyType,
        baseRate,
        currency,
        effectiveStartDate: new Date(`${effectiveFrom}T00:00:00Z`),
        isActive: true,
        notes,
      },
    });

    await logAuditEvent({
      userId: session.userId,
      action: "TRAINER_POLICY_CONFIGURED",
      entityType: "TrainerCompensationPolicy",
      entityId: policy.id,
      details: {
        trainerName: trainer.user.name,
        policyType,
        baseRate,
        currency,
      },
    });

    return NextResponse.json({
      success: true,
      policy,
      message: `Compensation policy for ${trainer.user.name} configured successfully (${policyType} @ ${currency} ${baseRate}).`,
    });
  } catch (error: any) {
    console.error("Trainer compensation policy POST error:", error);
    return NextResponse.json({ error: "Failed to save trainer compensation policy" }, { status: 500 });
  }
}
