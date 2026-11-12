import { formatPaise } from "../../../backend/services/financier/money";

export function formatMoney(paise: number): string {
  return formatPaise(paise);
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(ts));
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(ts));
}

export function statusBadgeClass(status: string): string {
  const s = status.toUpperCase();
  if (
    s === "PAID" ||
    s === "CONFIRMED" ||
    s === "APPROVED" ||
    s === "EXECUTED" ||
    s === "SENT"
  ) {
    if (s === "SENT" || s === "APPROVED") return "fin-badge fin-badge-teal";
    return "fin-badge fin-badge-success";
  }
  if (
    s === "OVERDUE" ||
    s === "VOID" ||
    s === "REJECTED" ||
    s === "FAILED" ||
    s === "REVERSED"
  ) {
    return "fin-badge fin-badge-danger";
  }
  if (
    s === "REVIEW" ||
    s === "PENDING" ||
    s === "REQUESTED" ||
    s === "PARTIALLY_PAID" ||
    s === "PARTIALLY_REFUNDED"
  ) {
    return "fin-badge fin-badge-gold";
  }
  return "fin-badge fin-badge-neutral";
}

export function invoiceBadgeClass(status: string): string {
  switch (status.toUpperCase()) {
    case "PAID":
      return "fin-badge fin-badge-success";
    case "SENT":
      return "fin-badge fin-badge-teal";
    case "OVERDUE":
      return "fin-badge fin-badge-danger";
    case "VOID":
      return "fin-badge fin-badge-neutral";
    case "DRAFT":
    default:
      return "fin-badge fin-badge-gold";
  }
}
