/**
 * Strict integer-paise money utilities (zero floating-point arithmetic on money).
 * 1 INR = 100 paise. All financial storage & calculations use safe integers.
 */

export class MoneyInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyInvariantError";
  }
}

export function assertPaise(value: number, label = "amountPaise"): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new MoneyInvariantError(
      `${label} must be a safe integer in paise; received ${String(value)}.`
    );
  }
  return value;
}

export function assertNonNegativePaise(value: number, label = "amountPaise"): number {
  const checked = assertPaise(value, label);
  if (checked < 0) {
    throw new MoneyInvariantError(`${label} cannot be negative (${checked} paise).`);
  }
  return checked;
}

export function assertPositivePaise(value: number, label = "amountPaise"): number {
  const checked = assertPaise(value, label);
  if (checked <= 0) {
    throw new MoneyInvariantError(`${label} must be greater than zero (${checked} paise).`);
  }
  return checked;
}

export function sumPaise(amounts: readonly number[], label = "sumPaise"): number {
  let total = 0n;
  for (const amount of amounts) {
    assertPaise(amount, label);
    total += BigInt(amount);
  }
  if (total > BigInt(Number.MAX_SAFE_INTEGER) || total < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new MoneyInvariantError(`${label} exceeded safe integer paise range.`);
  }
  return Number(total);
}

export function addPaise(a: number, b: number): number {
  return sumPaise([a, b], "addPaise");
}

export function subtractPaise(a: number, b: number): number {
  assertPaise(a, "minuendPaise");
  assertPaise(b, "subtrahendPaise");
  const diff = BigInt(a) - BigInt(b);
  if (diff > BigInt(Number.MAX_SAFE_INTEGER) || diff < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new MoneyInvariantError("subtractPaise exceeded safe integer range.");
  }
  return Number(diff);
}

/**
 * Multiply integer quantity * unit price paise without floats.
 */
export function multiplyPaise(unitPricePaise: number, quantity: number): number {
  assertPaise(unitPricePaise, "unitPricePaise");
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new MoneyInvariantError(`Quantity must be a non-negative integer; received ${quantity}.`);
  }
  const product = BigInt(unitPricePaise) * BigInt(quantity);
  if (product > BigInt(Number.MAX_SAFE_INTEGER) || product < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new MoneyInvariantError("multiplyPaise exceeded safe integer range.");
  }
  return Number(product);
}

/**
 * Exact integer calculation for basis points (e.g. 1000 bps = 10.00%, 1800 bps = 18% GST)
 * with half-up BigInt rounding.
 */
export function applyBasisPointsPaise(basePaise: number, basisPoints: number): number {
  assertNonNegativePaise(basePaise, "basePaise");
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0 || basisPoints > 100_000) {
    throw new MoneyInvariantError(`Invalid basis points: ${basisPoints}.`);
  }
  const result = (BigInt(basePaise) * BigInt(basisPoints) + 5000n) / 10000n;
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new MoneyInvariantError("Basis points calculation exceeded safe integer range.");
  }
  return Number(result);
}

/**
 * Distribute an integer total across positive weights using largest-remainder method
 * so the sum of distributed parts equals totalPaise strictly.
 */
export function distributePaiseByWeight(totalPaise: number, weights: readonly number[]): number[] {
  assertNonNegativePaise(totalPaise, "totalPaise");
  if (weights.length === 0) return [];
  const totalWeight = weights.reduce((acc, w) => acc + Math.max(0, w), 0);
  if (totalWeight <= 0) {
    const equalCount = BigInt(weights.length);
    const base = BigInt(totalPaise) / equalCount;
    let rem = Number(BigInt(totalPaise) % equalCount);
    return weights.map(() => {
      const share = Number(base) + (rem > 0 ? 1 : 0);
      if (rem > 0) rem--;
      return share;
    });
  }

  const bigTotal = BigInt(totalPaise);
  const bigWeightSum = BigInt(totalWeight);
  const parts = weights.map((w, index) => {
    const safeW = BigInt(Math.max(0, w));
    const exactTimesSum = bigTotal * safeW;
    const floorShare = Number(exactTimesSum / bigWeightSum);
    const remainder = exactTimesSum % bigWeightSum;
    return { index, floorShare, remainder };
  });

  const allocatedSum = parts.reduce((acc, p) => acc + p.floorShare, 0);
  let remaining = totalPaise - allocatedSum;

  const sortedByRem = [...parts].sort((a, b) =>
    a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1
  );
  for (let i = 0; i < sortedByRem.length && remaining > 0; i++) {
    sortedByRem[i].floorShare += 1;
    remaining -= 1;
  }

  const output = new Array<number>(weights.length);
  for (const part of parts) {
    output[part.index] = part.floorShare;
  }
  return output;
}

/**
 * Parse decimal rupee input string (e.g. "45000" or "45000.50") strictly into integer paise.
 * Rejects floating noise, excess fractional digits, scientific notation, commas.
 */
export function parseRupeesToPaise(input: string, signed = false): number | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 32) return null;
  const pattern = new RegExp(`^${signed ? "-?" : ""}\\d+(?:\\.\\d{1,2})?$`);
  if (!pattern.test(trimmed)) return null;
  const negative = trimmed.startsWith("-");
  const [whole, fraction = ""] = trimmed.replace(/^-/, "").split(".");
  const paise = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (paise > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  const numeric = Number(paise);
  return negative ? (numeric === 0 ? 0 : -numeric) : numeric;
}

/**
 * Format integer paise as Indian Rupees without converting through IEEE floats for arithmetic.
 */
export function formatPaise(paise: number, currency: "INR" = "INR"): string {
  assertPaise(paise, "formatPaise");
  const format = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const amount = BigInt(paise);
  const whole = amount / 100n;
  const remainder = amount % 100n;
  const fraction = (remainder < 0n ? -remainder : remainder).toString().padStart(2, "0");
  return format
    .formatToParts(amount < 0n && whole === 0n ? -0 : whole)
    .map((part) => (part.type === "fraction" ? fraction : part.value))
    .join("");
}

export function formatPaiseToInputRupees(paise: number): string {
  assertPaise(paise, "formatPaiseToInputRupees");
  const amount = BigInt(paise);
  const abs = amount < 0n ? -amount : amount;
  return `${amount < 0n ? "-" : ""}${abs / 100n}.${(abs % 100n).toString().padStart(2, "0")}`;
}

export interface InstallmentAllocationTarget {
  id: string;
  installmentNumber: number;
  dueDate: string;
  remainingBalancePaise: number;
}

export interface PaiseAllocationResult {
  installmentId: string;
  installmentNumber: number;
  dueDate: string;
  allocatedPaise: number;
  newRemainingBalancePaise: number;
}

/**
 * Deterministically allocate a payment (in integer paise) to the OLDEST unpaid instalment first:
 * orders by dueDate ascending, then installmentNumber ascending.
 */
export function allocatePaymentPaiseOldestFirst(
  paymentPaise: number,
  installments: readonly InstallmentAllocationTarget[]
): PaiseAllocationResult[] {
  let unallocated = assertPositivePaise(paymentPaise, "paymentPaise");
  const sorted = [...installments].sort((a, b) => {
    const timeDiff = Date.parse(a.dueDate) - Date.parse(b.dueDate);
    if (!Number.isNaN(timeDiff) && timeDiff !== 0) return timeDiff;
    return a.installmentNumber - b.installmentNumber;
  });

  const allocations: PaiseAllocationResult[] = [];
  for (const inst of sorted) {
    assertNonNegativePaise(inst.remainingBalancePaise, `installment(${inst.id}).remainingBalancePaise`);
    if (unallocated <= 0) break;
    if (inst.remainingBalancePaise <= 0) continue;

    const toAllocate = Math.min(unallocated, inst.remainingBalancePaise);
    const newRemaining = subtractPaise(inst.remainingBalancePaise, toAllocate);
    allocations.push({
      installmentId: inst.id,
      installmentNumber: inst.installmentNumber,
      dueDate: inst.dueDate,
      allocatedPaise: toAllocate,
      newRemainingBalancePaise: newRemaining,
    });
    unallocated = subtractPaise(unallocated, toAllocate);
  }

  return allocations;
}
