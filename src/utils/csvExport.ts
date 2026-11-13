/**
 * Safe CSV export utility for browser downloads.
 * Prevents CSV formula injection (CWE-1236) by escaping formula-leading characters (=, +, -, @, \t, \r).
 */

export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);
  if (/^[\s]*[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function triggerBrowserDownload(blob: Blob, filename: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export interface CsvColumn<T> {
  header: string;
  accessor: (item: T) => unknown;
}

export function exportToCsv<T>(
  filename: string,
  records: T[],
  columns: CsvColumn<T>[]
): void {
  if (!records || records.length === 0) {
    const headerLine = columns.map((c) => sanitizeCsvCell(c.header)).join(",");
    const blob = new Blob([headerLine], { type: "text/csv;charset=utf-8;" });
    triggerBrowserDownload(blob, filename);
    return;
  }

  const headerLine = columns.map((c) => sanitizeCsvCell(c.header)).join(",");
  const rows = records.map((record) =>
    columns.map((c) => sanitizeCsvCell(c.accessor(record))).join(",")
  );

  const csvString = [headerLine, ...rows].join("\r\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  triggerBrowserDownload(blob, filename);
}

