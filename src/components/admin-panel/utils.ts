export function money(minor: number, currency: string) {
  const format = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  });
  const digits = format.resolvedOptions().maximumFractionDigits ?? 2;
  const amount = BigInt(minor);
  const scale = 10n ** BigInt(digits);
  const whole = amount / scale;
  const remainder = amount % scale;
  const fraction = (remainder < 0n ? -remainder : remainder)
    .toString()
    .padStart(digits, "0");
  return format
    .formatToParts(amount < 0n && whole === 0n ? -0 : whole)
    .map((part) => (part.type === "fraction" ? fraction : part.value))
    .join("");
}
export function dateTime(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(new Date(value))
    : "Not scheduled";
}
export function currencyDigits(currency: string) {
  return (
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}
export function amountInput(minor: number, currency: string) {
  const digits = currencyDigits(currency);
  const amount = BigInt(minor);
  const absolute = amount < 0n ? -amount : amount;
  const scale = 10n ** BigInt(digits);
  return `${amount < 0n ? "-" : ""}${absolute / scale}${digits ? "." + (absolute % scale).toString().padStart(digits, "0") : ""}`;
}
export function parseMinor(value: string, currency: string, signed = false) {
  if (value.trim().length > 32) return null;
  const digits = currencyDigits(currency);
  const pattern = new RegExp(
    `^${signed ? "-?" : ""}\\d+(?:\\.\\d{1,${Math.max(digits, 1)}})?$`,
  );
  if (!pattern.test(value.trim()) || (!digits && value.includes(".")))
    return null;
  const negative = value.trim().startsWith("-");
  const [whole, fraction = ""] = value.trim().replace(/^-/, "").split(".");
  const minor =
    BigInt(whole) * 10n ** BigInt(digits) +
    BigInt(fraction.padEnd(digits, "0") || "0");
  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(minor) * (negative ? -1 : 1);
}
export function slaLabel(at: string | null, now: number) {
  if (!at) return "No follow-up scheduled";
  const minutes = Math.ceil((Date.parse(at) - now) / 60000);
  if (minutes <= 0) return `Overdue by ${Math.abs(minutes)}m`;
  if (minutes < 60) return `Follow up in ${minutes}m`;
  return `Follow up in ${Math.ceil(minutes / 60)}h`;
}
