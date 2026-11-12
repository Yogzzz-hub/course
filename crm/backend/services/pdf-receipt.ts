import { prisma } from "./prisma";
import PDFDocument from "pdfkit";
import { formatCurrency, formatDate } from "./utils";

export async function generateReceiptPdfBuffer(receiptId: string): Promise<Buffer> {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
    include: {
      studentPayment: {
        include: {
          feeAgreement: {
            include: {
              admission: {
                include: { course: true, targetBatch: true },
              },
            },
          },
        },
      },
      studentProfile: {
        include: { user: true },
      },
    },
  });

  if (!receipt) {
    throw new Error("Receipt record not found");
  }

  const payment = receipt.studentPayment;
  const student = receipt.studentProfile;
  const course = payment.feeAgreement?.admission.course;
  const batch = payment.feeAgreement?.admission.targetBatch;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const buffers: Buffer[] = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const width = doc.page.width;

    // Header Branding
    doc.rect(40, 40, width - 80, 70).fill("#6D1A2B");

    doc
      .fillColor("#FFFBF5")
      .font("Helvetica-Bold")
      .fontSize(18)
      .text("APEX GLOBAL ACADEMY", 60, 55);

    doc
      .fillColor("#F6EBCF")
      .font("Helvetica")
      .fontSize(9)
      .text("OFFICIAL TUITION PAYMENT RECEIPT", 60, 78);

    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(`RECEIPT: ${receipt.receiptNumber}`, width - 260, 55, {
        width: 200,
        align: "right",
      });

    doc
      .fillColor("#F6EBCF")
      .font("Helvetica")
      .fontSize(9)
      .text(`Issued: ${formatDate(receipt.receiptDate)}`, width - 260, 75, {
        width: 200,
        align: "right",
      });

    // Student & Program Details Box
    doc.rect(40, 130, width - 80, 95).lineWidth(1).stroke("#E5E7EB");

    doc.fillColor("#2A0F16").font("Helvetica-Bold").fontSize(11).text("STUDENT DETAILS", 55, 145);
    doc.fillColor("#555555").font("Helvetica").fontSize(10);
    doc.text(`Name: ${student.user.name}`, 55, 165);
    doc.text(`Reg #: ${student.registrationNumber}`, 55, 180);
    doc.text(`Email: ${student.user.email}`, 55, 195);

    doc.fillColor("#2A0F16").font("Helvetica-Bold").fontSize(11).text("ENROLLMENT DETAILS", width / 2 + 20, 145);
    doc.fillColor("#555555").font("Helvetica").fontSize(10);
    doc.text(`Course: ${course?.title || "Academic Program"}`, width / 2 + 20, 165);
    doc.text(`Cohort Code: ${batch?.code || "Unassigned"}`, width / 2 + 20, 180);
    doc.text(`Transaction Ref: ${payment.transactionNumber}`, width / 2 + 20, 195);

    // Payment Summary Table
    const tableTop = 250;
    doc.rect(40, tableTop, width - 80, 28).fill("#F6EBCF");

    doc.fillColor("#2A0F16").font("Helvetica-Bold").fontSize(10);
    doc.text("PAYMENT DESCRIPTION", 55, tableTop + 8);
    doc.text("METHOD", 280, tableTop + 8);
    doc.text("CONFIRMED AMOUNT", width - 180, tableTop + 8, { width: 120, align: "right" });

    // Row
    const rowY = tableTop + 38;
    doc.fillColor("#333333").font("Helvetica").fontSize(10);
    doc.text(`Tuition Fee Payment — ${course?.code || "Academy Tuition"}`, 55, rowY);
    doc.text(`${payment.paymentMethod} (${payment.externalReference || "Verified"})`, 280, rowY);
    doc.font("Helvetica-Bold").text(formatCurrency(receipt.totalPaid, payment.currency), width - 180, rowY, {
      width: 120,
      align: "right",
    });

    doc.moveTo(40, rowY + 25).lineTo(width - 40, rowY + 25).lineWidth(0.5).stroke("#DDDDDD");

    // Totals Box
    const totalsY = rowY + 45;
    doc.rect(width - 240, totalsY, 200, 75).fill("#FAFAFA");
    doc.rect(width - 240, totalsY, 200, 75).lineWidth(1).stroke("#E5E7EB");

    doc.fillColor("#666666").font("Helvetica").fontSize(9);
    doc.text("Total Paid This Transaction:", width - 230, totalsY + 12);
    doc.text("Remaining Balance Obligation:", width - 230, totalsY + 30);
    doc.text("Payment Verification Status:", width - 230, totalsY + 48);

    doc.fillColor("#6D1A2B").font("Helvetica-Bold").fontSize(10);
    doc.text(formatCurrency(receipt.totalPaid, payment.currency), width - 120, totalsY + 12, { width: 70, align: "right" });
    doc.text(formatCurrency(receipt.balanceRemaining, payment.currency), width - 120, totalsY + 30, { width: 70, align: "right" });
    doc.fillColor("#059669").text("CONFIRMED", width - 120, totalsY + 48, { width: 70, align: "right" });

    // Footer & Stamp
    const footerY = doc.page.height - 100;
    doc.moveTo(40, footerY).lineTo(width - 40, footerY).lineWidth(1).stroke("#E5E7EB");

    doc.fillColor("#888888").font("Helvetica").fontSize(8);
    doc.text(
      "This is a system-generated, authoritative receipt issued by Apex Global Academy Financial Operations. All payments are subject to official verification and institutional audit.",
      40,
      footerY + 12,
      { width: width - 80, align: "center" }
    );

    if (receipt.isVoid) {
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
