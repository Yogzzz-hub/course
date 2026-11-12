import { prisma } from "./prisma";
import { roundCurrency } from "./finance";

export interface PayoutCalculationResult {
  trainerProfileId: string;
  trainerName: string;
  employeeCode: string;
  policyType: "MONTHLY_SALARY" | "PER_SESSION" | "PER_HOUR";
  applicableRate: number;
  eligibleSessionsCount: number;
  verifiedHours: number;
  baseAmount: number;
  bonusAmount: number;
  deductionAmount: number;
  totalPayable: number;
  sessionsBreakdown: Array<{
    sessionId: string;
    batchCode: string;
    sessionDate: Date;
    durationHours: number;
    sessionType: string;
  }>;
}

export function calculateTrainerCompensation(
  policy: { policyType: "MONTHLY_SALARY" | "PER_SESSION" | "PER_HOUR"; baseRate: number },
  sessions: Array<{ id: string; isLocked?: boolean; status?: string; durationMinutes?: number }>
) {
  const eligibleSessions = sessions.filter(
    (s) => s.isLocked !== false && s.status !== "CANCELED" && s.status !== "CANCELLED"
  );
  let grossPayable = 0;
  let calculationMethod = "";

  if (policy.policyType === "MONTHLY_SALARY") {
    grossPayable = roundCurrency(policy.baseRate);
    calculationMethod = "Monthly Salary Agreement";
  } else if (policy.policyType === "PER_SESSION") {
    grossPayable = roundCurrency(eligibleSessions.length * policy.baseRate);
    calculationMethod = "Per-Session Rate";
  } else if (policy.policyType === "PER_HOUR") {
    const totalHours = eligibleSessions.reduce(
      (sum, s) => sum + (s.durationMinutes ? s.durationMinutes / 60 : 1),
      0
    );
    grossPayable = roundCurrency(totalHours * policy.baseRate);
    calculationMethod = "Per-Hour Rate";
  }

  return {
    grossPayable,
    eligibleSessionsCount: eligibleSessions.length,
    calculationMethod,
  };
}

export async function calculateTrainerPayoutForPeriod(
  trainerProfileId: string,
  startDate: Date,
  endDate: Date
): Promise<PayoutCalculationResult> {
  const trainer = await prisma.trainerProfile.findUnique({
    where: { id: trainerProfileId },
    include: {
      user: { select: { name: true, email: true } },
      compensationPolicies: {
        where: {
          isActive: true,
          effectiveStartDate: { lte: endDate },
          OR: [
            { effectiveEndDate: null },
            { effectiveEndDate: { gte: startDate } },
          ],
        },
        orderBy: { effectiveStartDate: "desc" },
      },
    },
  });

  if (!trainer) {
    throw new Error("Trainer profile not found");
  }

  // Active policy
  const policy = trainer.compensationPolicies[0];
  const policyType = (policy?.policyType || "PER_SESSION") as
    | "MONTHLY_SALARY"
    | "PER_SESSION"
    | "PER_HOUR";
  const applicableRate = policy ? policy.baseRate : 1500; // default rate if not explicitly configured

  // Fetch verified submitted and locked class sessions in this date range
  const classSessions = await prisma.classSession.findMany({
    where: {
      trainerProfileId,
      sessionDate: {
        gte: startDate,
        lte: endDate,
      },
      isLocked: true,
      occurrence: {
        status: { not: "CANCELLED" }, // Explicit Rule: Canceled sessions are never counted
      },
    },
    include: {
      batch: { select: { code: true } },
    },
    orderBy: { sessionDate: "asc" },
  });

  const sessionsBreakdown: PayoutCalculationResult["sessionsBreakdown"] = [];
  let totalHours = 0;

  for (const cs of classSessions) {
    const [startH, startM] = cs.actualStartTime.split(":").map(Number);
    const [endH, endM] = cs.actualEndTime.split(":").map(Number);
    const durationMinutes = Math.max(0, (endH * 60 + endM) - (startH * 60 + startM));
    const hours = roundCurrency(durationMinutes / 60);

    totalHours = roundCurrency(totalHours + hours);

    sessionsBreakdown.push({
      sessionId: cs.id,
      batchCode: cs.batch.code,
      sessionDate: cs.sessionDate,
      durationHours: hours,
      sessionType: cs.sessionType,
    });
  }

  let baseAmount = 0;
  let eligibleSessionsCount = 0;
  let verifiedHours = 0;

  if (policyType === "MONTHLY_SALARY") {
    baseAmount = roundCurrency(applicableRate);
    eligibleSessionsCount = classSessions.length;
    verifiedHours = totalHours;
  } else if (policyType === "PER_SESSION") {
    eligibleSessionsCount = classSessions.length;
    baseAmount = roundCurrency(eligibleSessionsCount * applicableRate);
    verifiedHours = totalHours;
  } else if (policyType === "PER_HOUR") {
    verifiedHours = totalHours;
    eligibleSessionsCount = classSessions.length;
    baseAmount = roundCurrency(verifiedHours * applicableRate);
  }

  const bonusAmount = 0;
  const deductionAmount = 0;
  const totalPayable = roundCurrency(Math.max(0, baseAmount + bonusAmount - deductionAmount));

  return {
    trainerProfileId,
    trainerName: trainer.user.name,
    employeeCode: trainer.employeeCode,
    policyType,
    applicableRate,
    eligibleSessionsCount,
    verifiedHours,
    baseAmount,
    bonusAmount,
    deductionAmount,
    totalPayable,
    sessionsBreakdown,
  };
}
