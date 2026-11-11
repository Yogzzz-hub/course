import { formatPaise } from "./money";
import type {
  InvoiceRecord,
  PaymentRecord,
  PayrollRunRecord,
  TrainerPayoutRecord,
} from "./types";

function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, " ");
}

function pdfCurrency(paise: number): string {
  // Pure ASCII-safe INR label for Helvetica standard PDF font (no missing glyph box)
  const neg = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const formatted = formatPaise(abs, "INR").replace(/[^\d.,]/g, "");
  return `${neg}INR ${formatted}`;
}

function pdfDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

/**
 * Pure, dependency-free valid PDF 1.4 binary builder with exact xref offsets.
 * Safe in Node.js, Edge runtimes, Vite dev middleware, and browser blobs.
 */
export function buildSimplePdfBytes(params: {
  title: string;
  subtitle: string;
  badgeText?: string;
  watermark?: string;
  rows: ReadonlyArray<{ label: string; value: string; bold?: boolean }>;
  tableHeaders?: readonly string[];
  tableRows?: ReadonlyArray<readonly string[]>;
  footerNote: string;
}): Uint8Array {
  const ops: string[] = [];

  // Burgundy header bar (#6D1A2B -> 0.427 0.102 0.169)
  ops.push("q");
  ops.push("0.427 0.102 0.169 rg");
  ops.push("40 732 515 70 re f");
  ops.push("Q");

  // Gold accent strip (#C9A24B -> 0.788 0.635 0.294)
  ops.push("q");
  ops.push("0.788 0.635 0.294 rg");
  ops.push("40 728 515 4 re f");
  ops.push("Q");

  // Header text in White
  ops.push("BT /F2 16 Tf 0.98 0.97 0.95 rg 54 776 Td (APEX GLOBAL ACADEMY) Tj ET");
  ops.push(
    `BT /F1 9 Tf 0.96 0.92 0.81 rg 54 758 Td (${escapePdfText(params.subtitle)}) Tj ET`
  );
  ops.push(
    `BT /F2 12 Tf 1 1 1 rg 54 742 Td (${escapePdfText(params.title)}) Tj ET`
  );
  if (params.badgeText) {
    ops.push(
      `BT /F2 10 Tf 1 1 1 rg 410 776 Td (${escapePdfText(params.badgeText)}) Tj ET`
    );
  }

  let y = 702;

  // Metadata / summary key-values
  for (const row of params.rows) {
    ops.push(
      `BT /F1 9 Tf 0.42 0.38 0.41 rg 46 ${y} Td (${escapePdfText(row.label)}:) Tj ET`
    );
    ops.push(
      `BT ${row.bold ? "/F2" : "/F1"} 10 Tf 0.145 0.098 0.137 rg 200 ${y} Td (${escapePdfText(row.value)}) Tj ET`
    );
    y -= 18;
  }

  // Optional line items table
  if (params.tableHeaders && params.tableRows && params.tableRows.length > 0) {
    y -= 10;
    ops.push("q 0.96 0.94 0.91 rg 40 " + (y - 6) + " 515 22 re f Q");
    const colOffsets = [48, 285, 365, 445];
    params.tableHeaders.forEach((h, i) => {
      const x = colOffsets[i] ?? 48 + i * 110;
      ops.push(
        `BT /F2 9 Tf 0.145 0.098 0.137 rg ${x} ${y} Td (${escapePdfText(h)}) Tj ET`
      );
    });
    y -= 24;

    for (const tr of params.tableRows) {
      if (y < 90) break;
      tr.forEach((cell, i) => {
        const x = colOffsets[i] ?? 48 + i * 110;
        ops.push(
          `BT /F1 9 Tf 0.145 0.098 0.137 rg ${x} ${y} Td (${escapePdfText(cell.slice(0, 42))}) Tj ET`
        );
      });
      y -= 17;
    }
  }

  if (params.watermark) {
    ops.push(
      `BT /F2 42 Tf 0.706 0.137 0.094 rg 210 380 Td (${escapePdfText(params.watermark)}) Tj ET`
    );
  }

  // Footer rule & text
  ops.push("q 0.91 0.88 0.85 RG 1 w 40 68 m 555 68 l S Q");
  ops.push(
    `BT /F1 8 Tf 0.42 0.38 0.41 rg 44 52 Td (${escapePdfText(params.footerNote)}) Tj ET`
  );

  const streamContent = ops.join("\n");
  const encoder = new TextEncoder();
  const streamBytesLength = encoder.encode(streamContent).length;

  const objects: string[] = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${streamBytesLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
  ];

  const header = "%PDF-1.4\n";
  let body = header;
  const offsets: number[] = [];

  for (const obj of objects) {
    offsets.push(encoder.encode(body).length);
    body += obj;
  }

  const xrefOffset = encoder.encode(body).length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += `${String(off).padStart(10, "0")} 00000 n \n`;
  }

  const trailer =
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`;

  return encoder.encode(body + xref + trailer);
}

export function generateInvoicePdfBytes(invoice: InvoiceRecord): Uint8Array {
  return buildSimplePdfBytes({
    title: `OFFICIAL TUITION INVOICE: ${invoice.invoiceNumber}`,
    subtitle: "FINANCE & STUDENT ACCOUNTS PORTAL",
    badgeText: `STATUS: ${invoice.status}`,
    watermark: invoice.status === "VOID" ? "VOID" : undefined,
    rows: [
      { label: "Invoice Number", value: invoice.invoiceNumber, bold: true },
      { label: "Student", value: `${invoice.studentName} (${invoice.registrationNumber})` },
      { label: "Student Email", value: invoice.studentEmail },
      { label: "Programme / Track", value: `${invoice.trackTitle} (${invoice.trackCode})` },
      { label: "Batch", value: invoice.batchCode },
      { label: "Issue Date", value: pdfDate(invoice.issueDate) },
      { label: "Due Date", value: pdfDate(invoice.dueDate) },
      { label: "Gross Amount", value: pdfCurrency(invoice.grossAmountPaise) },
      { label: "Discount Applied", value: pdfCurrency(invoice.discountAmountPaise) },
      { label: "Tax", value: pdfCurrency(invoice.taxAmountPaise) },
      { label: "Net Total Due", value: pdfCurrency(invoice.netTotalPaise), bold: true },
      { label: "Amount Paid", value: pdfCurrency(invoice.paidAmountPaise) },
    ],
    tableHeaders: ["Item Description", "Qty", "Unit Price", "Line Total"],
    tableRows: invoice.lines.map((l) => [
      l.description,
      String(l.quantity),
      pdfCurrency(l.unitPricePaise),
      pdfCurrency(l.totalPaise),
    ]),
    footerNote:
      "Apex Global Academy Financier Ledger Document. Verify status and balance in portal.",
  });
}

export function generateReceiptPdfBytes(payment: PaymentRecord): Uint8Array {
  return buildSimplePdfBytes({
    title: `PAYMENT RECEIPT: ${payment.receiptNumber}`,
    subtitle: "VERIFIED TUITION COLLECTION RECEIPT",
    badgeText: payment.verificationStatus,
    watermark: payment.verificationStatus === "REVERSED" ? "REVERSED" : undefined,
    rows: [
      { label: "Receipt Number", value: payment.receiptNumber, bold: true },
      { label: "Transaction Ref", value: payment.transactionNumber },
      { label: "Payment Reference", value: payment.externalReference },
      { label: "Payment Method", value: payment.paymentMethod },
      { label: "Payment Date", value: pdfDate(payment.paymentDate) },
      { label: "Student", value: `${payment.studentName} (${payment.registrationNumber})` },
      { label: "Track & Batch", value: `${payment.trackTitle} / ${payment.batchCode}` },
      { label: "Amount Paid", value: pdfCurrency(payment.amountPaise), bold: true },
      { label: "Refunded Amount", value: pdfCurrency(payment.refundedPaise) },
      { label: "Remaining Balance", value: pdfCurrency(payment.balanceRemainingAfterPaise), bold: true },
    ],
    tableHeaders: ["Instalment #", "Due Date", "Allocated", "Txn Ref"],
    tableRows: payment.allocations.map((a) => [
      `Instalment ${a.installmentNumber}`,
      pdfDate(a.dueDate),
      pdfCurrency(a.allocatedPaise),
      payment.externalReference,
    ]),
    footerNote:
      "System-generated official receipt. Stored against balanced double-entry journal posting.",
  });
}

export function generatePayslipPdfBytes(
  run: PayrollRunRecord,
  payout: TrainerPayoutRecord
): Uint8Array {
  return buildSimplePdfBytes({
    title: `TRAINER PAYSLIP: ${payout.payslipNumber}`,
    subtitle: `PAYROLL RUN ${run.runNumber} (${run.periodName})`,
    badgeText: `RUN STATUS: ${run.status}`,
    rows: [
      { label: "Payslip Number", value: payout.payslipNumber, bold: true },
      { label: "Trainer", value: `${payout.trainerName} (${payout.employeeCode})`, bold: true },
      { label: "Pay Period", value: `${pdfDate(run.startDate)} to ${pdfDate(run.endDate)}` },
      { label: "Compensation Policy", value: `${payout.policyType} @ ${pdfCurrency(payout.applicableRatePaise)}` },
      { label: "Held Classes / Minutes", value: `${payout.eligibleSessionsCount} classes / ${payout.verifiedMinutes} mins` },
      { label: "Base Pay", value: pdfCurrency(payout.baseAmountPaise) },
      { label: "Approved Bonuses", value: pdfCurrency(payout.bonusPaise) },
      { label: "Deductions / Withholding", value: pdfCurrency(payout.deductionPaise) },
      { label: "Net Payable", value: pdfCurrency(payout.totalPayablePaise), bold: true },
    ],
    tableHeaders: ["Batch Code", "Sessions", "Minutes", "Batch Cost"],
    tableRows: payout.batchBreakdowns.map((b) => [
      `${b.batchCode} (${b.trackCode})`,
      String(b.sessionsCount),
      String(b.verifiedMinutes),
      pdfCurrency(b.totalCostPaise),
    ]),
    footerNote:
      "Confidential trainer compensation statement generated from verified non-cancelled sessions.",
  });
}
