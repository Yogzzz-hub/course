import {
  addPaise,
  assertPositivePaise,
  distributePaiseByWeight,
  multiplyPaise,
  subtractPaise,
  sumPaise,
} from "./money";
import type {
  AdjustmentType,
  CompensationPolicyType,
  HeldClassSessionRecord,
  PayrollAdjustmentRecord,
  PayrollRunStatus,
  TrainerBatchBreakdownRecord,
} from "./types";

export class PayrollInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PayrollInvariantError";
  }
}

export const PAYROLL_STATUS_TRANSITIONS: Record<PayrollRunStatus, readonly PayrollRunStatus[]> = {
  DRAFT: ["REVIEW"],
  REVIEW: ["APPROVED", "DRAFT"],
  APPROVED: ["PAID"],
  PAID: [],
};

export function assertValidPayrollTransition(
  current: PayrollRunStatus,
  next: PayrollRunStatus
): void {
  if (!PAYROLL_STATUS_TRANSITIONS[current].includes(next)) {
    throw new PayrollInvariantError(
      `Invalid payroll status transition from ${current} to ${next}.`
    );
  }
}

export function isEligibleHeldSession(session: HeldClassSessionRecord): boolean {
  return session.isLocked !== false && session.status === "HELD";
}

export interface TrainerPayrollComputation {
  eligibleSessionsCount: number;
  verifiedMinutes: number;
  baseAmountPaise: number;
  bonusPaise: number;
  deductionPaise: number;
  totalPayablePaise: number;
  batchBreakdowns: TrainerBatchBreakdownRecord[];
}

/**
 * Computes trainer compensation strictly in integer paise from held locked sessions per batch,
 * plus approved bonuses/deductions, attributing full payroll cost accurately across batches.
 */
export function calculateTrainerBatchPayrollPaise(params: {
  policyType: CompensationPolicyType;
  applicableRatePaise: number;
  sessions: readonly HeldClassSessionRecord[];
  adjustments?: readonly PayrollAdjustmentRecord[];
}): TrainerPayrollComputation {
  const rate = assertPositivePaise(params.applicableRatePaise, "applicableRatePaise");
  const eligible = params.sessions.filter(isEligibleHeldSession);

  // Group sessions by batch
  const byBatch = new Map<
    string,
    {
      batchId: string;
      batchCode: string;
      trackCode: string;
      trackTitle: string;
      sessionsCount: number;
      verifiedMinutes: number;
      baseAmountPaise: number;
    }
  >();

  let totalMinutes = 0;

  for (const s of eligible) {
    const minutes = Math.max(0, Math.round(s.durationMinutes));
    totalMinutes += minutes;
    let entry = byBatch.get(s.batchId);
    if (!entry) {
      entry = {
        batchId: s.batchId,
        batchCode: s.batchCode,
        trackCode: s.trackCode,
        trackTitle: s.trackTitle,
        sessionsCount: 0,
        verifiedMinutes: 0,
        baseAmountPaise: 0,
      };
      byBatch.set(s.batchId, entry);
    }
    entry.sessionsCount += 1;
    entry.verifiedMinutes += minutes;
  }

  let baseAmountPaise = 0;
  if (params.policyType === "PER_SESSION") {
    for (const b of byBatch.values()) {
      b.baseAmountPaise = multiplyPaise(rate, b.sessionsCount);
    }
    baseAmountPaise = sumPaise(
      Array.from(byBatch.values()).map((b) => b.baseAmountPaise),
      "perSessionBase"
    );
  } else if (params.policyType === "PER_HOUR") {
    // Integer math: totalMinutes * ratePaise / 60 per batch + reconcilable exact total
    baseAmountPaise = Number((BigInt(totalMinutes) * BigInt(rate) + 30n) / 60n);
    const weights = Array.from(byBatch.values()).map((b) => b.verifiedMinutes);
    const shares = distributePaiseByWeight(baseAmountPaise, weights);
    let idx = 0;
    for (const b of byBatch.values()) {
      b.baseAmountPaise = shares[idx++] || 0;
    }
  } else {
    // MONTHLY_SALARY distributed proportionally across batches by held minutes (or sessions)
    baseAmountPaise = rate;
    const batchesArr = Array.from(byBatch.values());
    const weights = batchesArr.map((b) => (b.verifiedMinutes > 0 ? b.verifiedMinutes : b.sessionsCount));
    const shares = distributePaiseByWeight(baseAmountPaise, weights);
    batchesArr.forEach((b, i) => {
      b.baseAmountPaise = shares[i] || 0;
    });
  }

  const approvedAdj = (params.adjustments ?? []).filter((a) => a.status === "APPROVED");
  const bonusList: number[] = [];
  const deductionList: number[] = [];

  for (const adj of approvedAdj) {
    assertPositivePaise(adj.amountPaise, `adjustment(${adj.id}).amountPaise`);
    if (adj.type === "BONUS" || adj.type === "SUBSTITUTION_FEE") {
      bonusList.push(adj.amountPaise);
    } else if (adj.type === "DEDUCTION" || adj.type === "TAX_WITHHOLDING") {
      deductionList.push(adj.amountPaise);
    }
  }

  const bonusPaise = sumPaise(bonusList, "payrollBonus");
  const deductionPaise = sumPaise(deductionList, "payrollDeduction");
  const rawPayable = subtractPaise(addPaise(baseAmountPaise, bonusPaise), deductionPaise);
  const totalPayablePaise = Math.max(0, rawPayable);
  const netAdjustmentDelta = subtractPaise(totalPayablePaise, baseAmountPaise);

  const batchList = Array.from(byBatch.values());
  const adjWeights = batchList.map((b) => b.baseAmountPaise || b.sessionsCount || 1);
  const signedIsNeg = netAdjustmentDelta < 0;
  const absShares = distributePaiseByWeight(Math.abs(netAdjustmentDelta), adjWeights);

  const batchBreakdowns: TrainerBatchBreakdownRecord[] = batchList.map((b, i) => {
    const signedAdj = signedIsNeg ? -(absShares[i] || 0) : absShares[i] || 0;
    return {
      ...b,
      allocatedAdjustmentPaise: signedAdj,
      totalCostPaise: Math.max(0, addPaise(b.baseAmountPaise, signedAdj)),
    };
  });

  return {
    eligibleSessionsCount: eligible.length,
    verifiedMinutes: totalMinutes,
    baseAmountPaise,
    bonusPaise,
    deductionPaise,
    totalPayablePaise,
    batchBreakdowns,
  };
}

export function validatePayrollAdjustmentInput(params: {
  type: AdjustmentType;
  amountPaise: number;
  reason: string;
  requesterId: string;
  approverId?: string | null;
}) {
  assertPositivePaise(params.amountPaise, "adjustment.amountPaise");
  if (!params.reason || params.reason.trim().length < 5) {
    throw new PayrollInvariantError("Payroll adjustments require a reason of at least 5 characters.");
  }
  if (params.approverId && params.approverId === params.requesterId) {
    throw new PayrollInvariantError(
      "Dual-control violation: payroll adjustment approver must differ from the requester."
    );
  }
}
