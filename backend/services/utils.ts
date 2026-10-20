import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

export function formatCurrency(
  amount: number | null | undefined,
  currency: string = "INR"
): string {
  if (amount === null || amount === undefined) {
    return currency === "INR" ? "₹0.00" : "$0.00";
  }
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

/**
 * Sanitizes cell values to prevent CSV / Spreadsheet formula injection attacks (CSV Injection / CWE-1236).
 * Prepend a single quote if the string begins with =, +, -, @, tab, or carriage return.
 */
export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str.replace(/"/g, '""')}`;
  }
  return str.replace(/"/g, '""');
}

/**
 * Generates safely encoded CSV content from an array of records.
 */
export function generateSafeCsv(records: Record<string, any>[]): string {
  if (!records || records.length === 0) return "";
  const headers = Object.keys(records[0]);
  const headerLine = headers.map((h) => `"${sanitizeCsvCell(h)}"`).join(",");
  const rows = records.map((record) =>
    headers
      .map((header) => {
        const val = record[header];
        return `"${sanitizeCsvCell(val)}"`;
      })
      .join(",")
  );
  return [headerLine, ...rows].join("\r\n");
}
