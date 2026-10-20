import { prisma } from "./prisma";
import PDFDocument from "pdfkit";
import { formatCurrency, formatDate } from "./utils";

export async function generateInvoicePdfBuffer(invoiceId: string): Promise<Buffer> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      lines: true,
      studentProfile: {
        include: { user: true },
      },
      feeAgreement: {
        include: {
          admission: {
            include: { course: true, targetBatch: true },
          },
        },
      },
    },
  });

  if (!invoice) {
    throw new Error("Invoice record not found");
  }

  const student = invoice.studentProfile;
  const course = invoice.feeAgreement.admission.course;
  const batch = invoice.feeAgreement.admission.targetBatch;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const buffers: Buffer[] = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const width = doc.page.width;

    // Header Branding Banner
    doc.rect(40, 40, width - 80, 75).fill("#6D1A2B");

    doc
      .fillColor("#FFFBF5")
      .font("Helvetica-Bold")
      .fontSize(20)
      .text("APEX GLOBAL ACADEMY", 60, 55);

    doc
      .fillColor("#F6EBCF")
      .font("Helvetica")
      .fontSize(9)
      .text("OFFICIAL TUITION INVOICE & FEE STATEMENT", 60, 80);

    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(`INVOICE: ${invoice.invoiceNumber}`, width - 260, 55, {
        width: 200,
        align: "right",
      });

    doc
      .fillColor("#F6EBCF")
      .font("Helvetica")
      .fontSize(9)
      .text(`Date: ${formatDate(invoice.issueDate)} | Due: ${formatDate(invoice.dueDate)}`, width - 260, 75, {
        width: 200,
        align: "right",
      });

    // Details Grid
    doc.rect(40, 135, width - 80, 85).lineWidth(1).stroke("#E5E7EB");

    doc.fillColor("#2A0F16").font("Helvetica-Bold").fontSize(10).text("BILLED TO", 55, 148);
    doc.fillColor("#555555").font("Helvetica").fontSize(9);
    doc.text(`Student: ${student.user.name}`, 55, 165);
    doc.text(`Registration #: ${student.registrationNumber}`, 55, 178);
    doc.text(`Email: ${student.user.email}`, 55, 191);

    doc.fillColor("#2A0F16").font("Helvetica-Bold").fontSize(10).text("ACADEMIC ENROLLMENT", width / 2 + 20, 148);
    doc.fillColor("#555555").font("Helvetica").fontSize(9);
    doc.text(`Program: ${course.title}`, width / 2 + 20, 165);
    doc.text(`Cohort Code: ${batch?.code || "Unassigned"}`, width / 2 + 20, 178);
    doc.text(`Payment Status: ${invoice.status}`, width / 2 + 20, 191);

    // Line items table
    const tableTop = 240;
    doc.rect(40, tableTop, width - 80, 26).fill("#F6EBCF");

    doc.fillColor("#2A0F16").font("Helvetica-Bold").fontSize(9);
    doc.text("ITEM DESCRIPTION", 55, tableTop + 8);
    doc.text("QTY", 320, tableTop + 8);
    doc.text("RATE", 380, tableTop + 8);
    doc.text("AMOUNT", width - 140, tableTop + 8, { width: 80, align: "right" });

    let currentY = tableTop + 34;

    const lines = invoice.lines.length > 0 ? invoice.lines : [
      {
        description: `Tuition Fee: ${course.title} (${course.code})`,
        quantity: 1,
        unitPrice: invoice.grossAmount,
        total: invoice.grossAmount,
      },
    ];

    for (const item of lines) {
      doc.fillColor("#333333").font("Helvetica").fontSize(9);
      doc.text(item.description, 55, currentY);
      doc.text(item.quantity.toString(), 320, currentY);
      doc.text(formatCurrency(item.unitPrice, invoice.currency), 380, currentY);
      doc.font("Helvetica-Bold").text(formatCurrency(item.total, invoice.currency), width - 140, currentY, {
        width: 80,
        align: "right",
      });

      currentY += 22;
      doc.moveTo(40, currentY).lineTo(width - 40, currentY).lineWidth(0.5).stroke("#EEEEEE");
      currentY += 8;
    }

    // Totals Box
    const totalsY = currentY + 15;
    doc.rect(width - 240, totalsY, 200, 95).fill("#FAFAFA");
    doc.rect(width - 240, totalsY, 200, 95).lineWidth(1).stroke("#E5E7EB");

    doc.fillColor("#666666").font("Helvetica").fontSize(9);
    doc.text("Gross Tuition Charges:", width - 230, totalsY + 12);
    doc.text("Approved Scholarships / Discounts:", width - 230, totalsY + 28);
    doc.text("Applicable Taxes:", width - 230, totalsY + 44);
    doc.text("Net Total Amount Due:", width - 230, totalsY + 68);

    doc.fillColor("#2A0F16").font("Helvetica").fontSize(9);
    doc.text(formatCurrency(invoice.grossAmount, invoice.currency), width - 110, totalsY + 12, { width: 60, align: "right" });
    doc.text(`- ${formatCurrency(invoice.discountAmount, invoice.currency)}`, width - 110, totalsY + 28, { width: 60, align: "right" });
    doc.text(formatCurrency(invoice.taxAmount, invoice.currency), width - 110, totalsY + 44, { width: 60, align: "right" });

    doc.fillColor("#6D1A2B").font("Helvetica-Bold").fontSize(11);
    doc.text(formatCurrency(invoice.netTotal, invoice.currency), width - 120, totalsY + 68, { width: 70, align: "right" });

    // Footer
    const footerY = doc.page.height - 70;
    doc.moveTo(40, footerY).lineTo(width - 40, footerY).lineWidth(1).stroke("#E5E7EB");

    doc.fillColor("#888888").font("Helvetica").fontSize(8);
    doc.text(
      "Payment terms: Tuition dues must be remitted by the scheduled installment due date. For inquiries, contact accounts@apexacademy.edu.",
      40,
      footerY + 10,
      { width: width - 80, align: "center" }
    );

    if (invoice.status === "VOID" || invoice.status === "CANCELLED") {
      doc
        .opacity(0.35)
        .fontSize(60)
        .fillColor("#DC2626")
        .font("Helvetica-Bold")
        .text("VOID", 0, 300, {
          align: "center",
        })
        .opacity(1.0);
    }

    doc.end();
  });
}
