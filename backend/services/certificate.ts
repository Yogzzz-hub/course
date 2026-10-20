import { prisma } from "./prisma";
import PDFDocument from "pdfkit";
import crypto from "crypto";

export interface IssueCertificateInput {
  studentProfileId: string;
  courseId: string;
  batchId: string;
  completionDecisionId: string;
  issuedById: string;
  templateId?: string;
}

export async function generateUniqueCertificateNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.certificate.count();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `APEX-CERT-${year}-${(count + 1).toString().padStart(4, "0")}-${randomSuffix}`;
}

export async function issueStudentCertificate(input: IssueCertificateInput) {
  // 1. Verify academic completion decision is APPROVED & isEligible
  const decision = await prisma.studentCompletionDecision.findUnique({
    where: { id: input.completionDecisionId },
    include: {
      studentProfile: { include: { user: true } },
      batch: { include: { course: true } },
    },
  });

  if (!decision) {
    throw new Error("Student completion decision record not found");
  }

  if (decision.status !== "APPROVED" || !decision.isEligible) {
    throw new Error(
      "A student cannot receive a valid certificate without confirmed academic completion approval."
    );
  }

  // 2. Prevent duplicate active certificates for the same completion decision
  const existingCert = await prisma.certificate.findFirst({
    where: {
      completionDecisionId: input.completionDecisionId,
    },
  });

  if (existingCert) {
    return {
      certificate: existingCert,
      isExisting: true,
      message: "An official certificate has already been issued for this academic completion.",
    };
  }

  // 3. Generate credentials
  const certificateNumber = await generateUniqueCertificateNumber();
  const verificationToken = crypto.randomUUID().replace(/-/g, "").toLowerCase();

  // 4. Create Certificate record
  const certificate = await prisma.certificate.create({
    data: {
      certificateNumber,
      studentProfileId: input.studentProfileId,
      courseId: input.courseId,
      batchId: input.batchId,
      completionDecisionId: input.completionDecisionId,
      templateId: input.templateId || null,
      studentName: decision.studentProfile.user.name,
      courseTitle: decision.batch.course.title,
      issueDate: new Date(),
      completionDate: decision.decidedAt || new Date(),
      verificationToken,
      status: "ISSUED",
      issuedById: input.issuedById,
      qrCodeData: `/verify-certificate/${verificationToken}`,
    },
    include: {
      studentProfile: { include: { user: true } },
      course: true,
      batch: true,
    },
  });

  return {
    certificate,
    isExisting: false,
    message: "Certificate successfully awarded and issued.",
  };
}

// Generate printable vector PDF Buffer for certificate
export async function generateCertificatePdfBuffer(certificateId: string): Promise<Buffer> {
  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: {
      template: true,
      studentProfile: { include: { user: true } },
      course: true,
      batch: true,
    },
  });

  if (!cert) {
    throw new Error("Certificate not found");
  }

  return new Promise((resolve, reject) => {
    // Landscape A4 certificate
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 40,
    });

    const buffers: Buffer[] = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const width = doc.page.width;
    const height = doc.page.height;

    // Outer double border
    doc.rect(20, 20, width - 40, height - 40).lineWidth(4).stroke("#6D1A2B");
    doc.rect(26, 26, width - 52, height - 52).lineWidth(1.5).stroke("#C9A24B");

    // Header Branding
    doc
      .fontSize(22)
      .fillColor("#6D1A2B")
      .font("Helvetica-Bold")
      .text(cert.template?.academyName || "APEX GLOBAL ACADEMY", 0, 65, {
        align: "center",
      });

    doc
      .fontSize(10)
      .fillColor("#C9A24B")
      .font("Helvetica-Bold")
      .text("CENTRE FOR ADVANCED SOFTWARE ENGINEERING & CLOUD ARCHITECTURE", 0, 95, {
        align: "center",
      });

    // Decorative divider line
    doc
      .moveTo(width / 2 - 120, 115)
      .lineTo(width / 2 + 120, 115)
      .lineWidth(2)
      .stroke("#C9A24B");

    // Certificate Title
    doc
      .fontSize(15)
      .fillColor("#2A0F16")
      .font("Helvetica-Bold")
      .text(cert.template?.title || "CERTIFICATE OF PROFESSIONAL COMPETENCY", 0, 145, {
        align: "center",
      });

    // Statement
    doc
      .fontSize(11)
      .fillColor("#555555")
      .font("Helvetica")
      .text("This official credential certifies that", 0, 185, {
        align: "center",
      });

    // Student Full Name
    doc
      .fontSize(28)
      .fillColor("#6D1A2B")
      .font("Helvetica-Bold")
      .text(cert.studentName, 0, 215, {
        align: "center",
      });

    doc
      .moveTo(width / 2 - 180, 252)
      .lineTo(width / 2 + 180, 252)
      .lineWidth(1)
      .stroke("#C9A24B");

    // Completion statement
    doc
      .fontSize(11)
      .fillColor("#333333")
      .font("Helvetica")
      .text(
        "has rigorously fulfilled all curriculum requirements, continuous assessments, and technical practicums for",
        60,
        275,
        {
          align: "center",
          width: width - 120,
        }
      );

    // Course Title
    doc
      .fontSize(18)
      .fillColor("#2A0F16")
      .font("Helvetica-Bold")
      .text(cert.courseTitle, 0, 315, {
        align: "center",
      });

    // Batch & Dates
    const issueDateStr = new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(cert.issueDate);

    doc
      .fontSize(10)
      .fillColor("#666666")
      .font("Helvetica")
      .text(
        `Cohort: ${cert.batch.code}  |  Awarded on: ${issueDateStr}  |  Certificate No: ${cert.certificateNumber}`,
        0,
        355,
        {
          align: "center",
        }
      );

    // Signatures and Seal
    const footerY = height - 120;

    // Left Signature: Academic Director
    doc
      .moveTo(80, footerY)
      .lineTo(260, footerY)
      .lineWidth(1)
      .stroke("#888888");

    doc
      .fontSize(11)
      .fillColor("#2A0F16")
      .font("Helvetica-Bold")
      .text(cert.template?.signerName || "Dr. Victoria Sterling", 80, footerY + 8, {
        width: 180,
        align: "center",
      });

    doc
      .fontSize(9)
      .fillColor("#777777")
      .font("Helvetica")
      .text(cert.template?.signatureTitle || "Academic Director", 80, footerY + 24, {
        width: 180,
        align: "center",
      });

    // Center Seal
    doc
      .circle(width / 2, footerY + 10, 28)
      .lineWidth(2)
      .stroke("#C9A24B");

    doc
      .fontSize(7)
      .fillColor("#6D1A2B")
      .font("Helvetica-Bold")
      .text("OFFICIAL SEAL", width / 2 - 30, footerY + 2, {
        width: 60,
        align: "center",
      });
    doc
      .fontSize(6)
      .fillColor("#C9A24B")
      .font("Helvetica-Bold")
      .text("APEX ACADEMY", width / 2 - 30, footerY + 12, {
        width: 60,
        align: "center",
      });

    // Right Verification Link
    doc
      .moveTo(width - 260, footerY)
      .lineTo(width - 80, footerY)
      .lineWidth(1)
      .stroke("#888888");

    doc
      .fontSize(9)
      .fillColor("#6D1A2B")
      .font("Helvetica-Bold")
      .text("Official Digital Verification", width - 260, footerY + 8, {
        width: 180,
        align: "center",
      });

    doc
      .fontSize(8)
      .fillColor("#555555")
      .font("Courier")
      .text(`Token: ${cert.verificationToken.substring(0, 16)}...`, width - 260, footerY + 22, {
        width: 180,
        align: "center",
      });

    doc
      .fontSize(7)
      .fillColor("#C9A24B")
      .font("Helvetica")
      .text("apexacademy.edu/verify-certificate", width - 260, footerY + 34, {
        width: 180,
        align: "center",
      });

    // Revocation watermark if revoked
    if (cert.status === "REVOKED") {
      doc
        .opacity(0.35)
        .fontSize(55)
        .fillColor("#D32F2F")
        .font("Helvetica-Bold")
        .text("REVOKED", 0, height / 2 - 30, {
          align: "center",
        })
        .opacity(1.0);
    }

    doc.end();
  });
}

export async function verifyCertificatePublicly(token: string) {
  const cert = await prisma.certificate.findUnique({
    where: { verificationToken: token },
    include: {
      studentProfile: { include: { user: { select: { name: true } } } },
      course: { select: { title: true, code: true } },
    },
  });

  if (!cert) {
    return {
      isValid: false,
      status: "INVALID",
      message: "Certificate not found or token invalid.",
    };
  }

  // Record verification event
  await prisma.certificateVerificationEvent.create({
    data: {
      certificateId: cert.id,
      verifiedAt: new Date(),
    },
  });

  const isValid = cert.status === "ISSUED";

  return {
    isValid,
    certificateNumber: cert.certificateNumber,
    studentName: cert.studentName,
    courseTitle: cert.courseTitle,
    issueDate: cert.issueDate,
    status: cert.status,
    academyName: "Apex Global Academy",
    revocationReason: cert.status === "REVOKED" ? cert.revocationReason : undefined,
  };
}
