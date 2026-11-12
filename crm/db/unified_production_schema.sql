-- ==============================================================================
-- 🏛️ APEX GLOBAL ACADEMY — UNIFIED FULL PRODUCTION DATABASE SCHEMA
-- Course Learning Platform + Enterprise CRM Database for PostgreSQL & Supabase
-- ==============================================================================
--
-- ------------------------------------------------------------------------------
-- ⚡ 2 COMMANDS TO COMPLETELY WIPE AND RESET YOUR DATABASE:
-- ------------------------------------------------------------------------------
-- 1. DROP SCHEMA IF EXISTS public CASCADE;
-- 2. CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;
-- ------------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TRAINER', 'MANAGER', 'ADMIN', 'FINANCIER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'COUNSELLING_SCHEDULED', 'INTERESTED', 'APPLIED', 'ADMITTED', 'LOST');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('WEEKDAYS', 'WEEKENDS', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "AdmissionStatus" AS ENUM ('DRAFT', 'PENDING_DOCS', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'PAUSED', 'WITHDRAWN', 'GRADUATED', 'FINANCIAL_HOLD');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('DRAFT', 'UPCOMING', 'ACTIVE', 'TEACHING_COMPLETE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('TEACHING', 'REVISION', 'ASSESSMENT', 'PROJECT_REVIEW', 'DOUBT_CLEARING', 'MAKEUP', 'OTHER');

-- CreateEnum
CREATE TYPE "SessionOccurrenceStatus" AS ENUM ('SCHEDULED', 'HELD', 'POSTPONED', 'CANCELLED', 'MAKEUP');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LEAVE', 'NOT_SUBMITTED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "address" TEXT,
    "emergencyContact" TEXT,
    "guardianName" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "specialization" TEXT,
    "bio" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "department" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancierProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "department" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancierProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpRecord" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "durationWeeks" INTEGER NOT NULL,
    "durationHours" INTEGER NOT NULL,
    "prerequisites" TEXT,
    "deliveryMode" TEXT NOT NULL DEFAULT 'Hybrid',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "agreedFeeDefault" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusVersion" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyllabusVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusModule" (
    "id" TEXT NOT NULL,
    "syllabusVersionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyllabusModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusSubtopic" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 60,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyllabusSubtopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "syllabusVersionId" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 25,
    "trainingMode" TEXT NOT NULL DEFAULT 'Hybrid',
    "scheduleType" "ScheduleType" NOT NULL DEFAULT 'WEEKDAYS',
    "classDays" TEXT NOT NULL DEFAULT 'Mon,Wed,Fri',
    "startTime" TEXT NOT NULL DEFAULT '10:00',
    "endTime" TEXT NOT NULL DEFAULT '12:00',
    "startDate" TIMESTAMP(3) NOT NULL,
    "expectedEndDate" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC+05:30',
    "location" TEXT,
    "status" "BatchStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerBatchAllocation" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "trainerProfileId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allocatedBy" TEXT,

    CONSTRAINT "TrainerBatchAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentBatchEnrollment" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "effectiveStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveEndDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentBatchEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "courseInterestId" TEXT,
    "schedulePreference" "ScheduleType" NOT NULL DEFAULT 'FLEXIBLE',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL DEFAULT 'Website Enquiry',
    "message" TEXT,
    "notes" TEXT,
    "assignedManagerId" TEXT,
    "followUpDate" TIMESTAMP(3),
    "nextAction" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT true,
    "isLost" BOOLEAN NOT NULL DEFAULT false,
    "lostReason" TEXT,
    "convertedAdmissionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admission" (
    "id" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "leadId" TEXT,
    "studentProfileId" TEXT,
    "courseId" TEXT NOT NULL,
    "targetBatchId" TEXT,
    "agreedFee" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountReason" TEXT,
    "schedulePreference" "ScheduleType" NOT NULL DEFAULT 'WEEKDAYS',
    "status" "AdmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "requiredDocsList" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "financialHold" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeAgreement" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "courseFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAgreedFee" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "installmentsCount" INTEGER NOT NULL DEFAULT 1,
    "agreedTerms" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeAgreementVersion" (
    "id" TEXT NOT NULL,
    "feeAgreementId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "totalAgreedFee" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "installmentsCount" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT,
    "modifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeAgreementVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeInstallment" (
    "id" TEXT NOT NULL,
    "feeAgreementId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amountDue" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingBalance" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "lastPaymentDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentPayment" (
    "id" TEXT NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "feeAgreementId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "paymentMethod" TEXT NOT NULL DEFAULT 'UPI',
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "externalReference" TEXT,
    "evidenceUrl" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "collectedById" TEXT,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "installmentId" TEXT NOT NULL,
    "allocatedAmount" DOUBLE PRECISION NOT NULL,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "studentPaymentId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "receiptDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalPaid" DOUBLE PRECISION NOT NULL,
    "balanceRemaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pdfUrl" TEXT,
    "isVoid" BOOLEAN NOT NULL DEFAULT false,
    "voidReason" TEXT,
    "issuedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "feeAgreementId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netTotal" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "notes" TEXT,
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialLedgerEntry" (
    "id" TEXT NOT NULL,
    "entryNumber" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transactionType" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "accountCode" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "studentProfileId" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundRequest" (
    "id" TEXT NOT NULL,
    "studentPaymentId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "requestedAmount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "supportingDocUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "refundRequestId" TEXT NOT NULL,
    "studentPaymentId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "refundMethod" TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
    "externalReference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "executedById" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ledgerEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationRecord" (
    "id" TEXT NOT NULL,
    "reconciliationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" TEXT NOT NULL,
    "expectedAmount" DOUBLE PRECISION NOT NULL,
    "actualAmount" DOUBLE PRECISION NOT NULL,
    "discrepancyAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'BALANCED',
    "discrepancyReason" TEXT,
    "reviewedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconciliationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentGatewayOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'SANDBOX',
    "studentProfileId" TEXT NOT NULL,
    "feeAgreementId" TEXT NOT NULL,
    "installmentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "receipt" TEXT,
    "checkoutUrl" TEXT,
    "rawResponseJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentGatewayOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProviderEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'SANDBOX',
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "signature" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentProviderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerCompensationPolicy" (
    "id" TEXT NOT NULL,
    "trainerProfileId" TEXT NOT NULL,
    "policyType" TEXT NOT NULL DEFAULT 'PER_SESSION',
    "baseRate" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "effectiveStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveEndDate" TIMESTAMP(3),
    "batchId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainerCompensationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPeriod" (
    "id" TEXT NOT NULL,
    "periodName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerPayout" (
    "id" TEXT NOT NULL,
    "payrollPeriodId" TEXT NOT NULL,
    "trainerProfileId" TEXT NOT NULL,
    "compensationPolicyType" TEXT NOT NULL,
    "applicableRate" DOUBLE PRECISION NOT NULL,
    "eligibleSessionsCount" INTEGER NOT NULL DEFAULT 0,
    "verifiedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "baseAmount" DOUBLE PRECISION NOT NULL,
    "bonusAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPayable" DOUBLE PRECISION NOT NULL,
    "adminApprovalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "adminApprovedById" TEXT,
    "adminApprovedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'DRAFT',
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
    "paymentReference" TEXT,
    "executedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainerPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutAdjustment" (
    "id" TEXT NOT NULL,
    "trainerPayoutId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "expenseNumber" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "paidTo" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
    "reference" TEXT,
    "receiptAttachmentUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "recordedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Certificate of Professional Competency',
    "academyName" TEXT NOT NULL DEFAULT 'Apex Global Academy',
    "signatureTitle" TEXT NOT NULL DEFAULT 'Academic Director',
    "signerName" TEXT NOT NULL DEFAULT 'Dr. Victoria Sterling',
    "sealText" TEXT DEFAULT 'Official Seal of Academic Excellence',
    "primaryColor" TEXT NOT NULL DEFAULT '#6D1A2B',
    "accentColor" TEXT NOT NULL DEFAULT '#C9A24B',
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificateTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "completionDecisionId" TEXT NOT NULL,
    "templateId" TEXT,
    "studentName" TEXT NOT NULL,
    "courseTitle" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completionDate" TIMESTAMP(3) NOT NULL,
    "verificationToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "revocationReason" TEXT,
    "revokedAt" TIMESTAMP(3),
    "reissuedCertificateId" TEXT,
    "issuedById" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "qrCodeData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateVerificationEvent" (
    "id" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "CertificateVerificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'SYSTEM',
    "linkUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "subject" TEXT,
    "bodyTemplate" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDeliveryLog" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT,
    "recipientContact" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "eventType" TEXT NOT NULL,
    "templateId" TEXT,
    "renderedSubject" TEXT,
    "renderedBody" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT NOT NULL DEFAULT 'SMTP_TRANSACTIONAL',
    "providerMessageId" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailTransactional" BOOLEAN NOT NULL DEFAULT true,
    "emailMarketing" BOOLEAN NOT NULL DEFAULT false,
    "whatsappNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStart" TEXT NOT NULL DEFAULT '21:00',
    "quietHoursEnd" TEXT NOT NULL DEFAULT '08:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageSuppression" (
    "id" TEXT NOT NULL,
    "contactIdentifier" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'OPT_OUT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialApprovalRequest" (
    "id" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "requestedAmount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "supportingDocUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionOccurrence" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "trainerProfileId" TEXT NOT NULL,
    "plannedDate" TIMESTAMP(3) NOT NULL,
    "plannedStartTime" TEXT NOT NULL,
    "plannedEndTime" TEXT NOT NULL,
    "status" "SessionOccurrenceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "cancellationReason" TEXT,
    "location" TEXT,
    "makeupForOccurrenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSession" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "occurrenceId" TEXT,
    "trainerProfileId" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "actualStartTime" TEXT NOT NULL,
    "actualEndTime" TEXT NOT NULL,
    "sessionType" "SessionType" NOT NULL DEFAULT 'TEACHING',
    "notes" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT true,
    "idempotencyKey" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceEntry" (
    "id" TEXT NOT NULL,
    "classSessionId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubtopicCoverage" (
    "id" TEXT NOT NULL,
    "classSessionId" TEXT NOT NULL,
    "subtopicId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubtopicCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectionRequest" (
    "id" TEXT NOT NULL,
    "classSessionId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "targetField" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "proposedValue" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorrectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackdateAuthorization" (
    "id" TEXT NOT NULL,
    "trainerProfileId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "allowedDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "authorizedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackdateAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeachingCompletionRecommendation" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "trainerProfileId" TEXT NOT NULL,
    "syllabusCoveredPercent" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeachingCompletionRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentCompletionDecision" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "attendancePercentage" DOUBLE PRECISION NOT NULL,
    "syllabusPercentage" DOUBLE PRECISION NOT NULL,
    "isEligible" BOOLEAN NOT NULL DEFAULT false,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentCompletionDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "detailsJson" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademySettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "academyName" TEXT NOT NULL DEFAULT 'Apex Global Academy',
    "contactEmail" TEXT NOT NULL DEFAULT 'admissions@apexacademy.edu',
    "contactPhone" TEXT NOT NULL DEFAULT '+1 (555) 234-5678',
    "address" TEXT NOT NULL DEFAULT '450 Innovation Way, Tech Campus, Suite 400',
    "attendanceThresholdPercent" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "attendanceDenominatorPolicy" TEXT NOT NULL DEFAULT 'HELD_TO_DATE',
    "leaveAffectsDenominator" BOOLEAN NOT NULL DEFAULT false,
    "allowManagerApprovals" BOOLEAN NOT NULL DEFAULT false,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'INR',
    "taxEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultTaxRatePercent" DOUBLE PRECISION NOT NULL DEFAULT 18.0,
    "onlinePaymentSandbox" BOOLEAN NOT NULL DEFAULT true,
    "certificatePrefix" TEXT NOT NULL DEFAULT 'APEX-CERT',
    "quietHoursStart" TEXT NOT NULL DEFAULT '21:00',
    "quietHoursEnd" TEXT NOT NULL DEFAULT '08:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningUnit" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "syllabusVersionId" TEXT,
    "syllabusModuleId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 120,
    "prerequisites" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "learningUnitId" TEXT NOT NULL,
    "subtopicId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "contentType" TEXT NOT NULL DEFAULT 'TEXT',
    "contentBody" TEXT,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 30,
    "learningObjectives" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonResource" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL DEFAULT 'FILE',
    "urlOrContent" TEXT NOT NULL,
    "fileSize" INTEGER,
    "isDownloadable" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonCompletion" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completionEvidence" TEXT,
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "batchId" TEXT,
    "trainerProfileId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT,
    "learningObjectives" TEXT,
    "maxMarks" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "allowedSubmissionTypes" TEXT NOT NULL DEFAULT 'TEXT,PDF,DOC,CODE,LINK',
    "lateSubmissionPolicy" TEXT NOT NULL DEFAULT 'ALLOWED',
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "gradingPolicy" TEXT NOT NULL DEFAULT 'RUBRIC',
    "publicationStatus" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricCriterion" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "maxMarks" DOUBLE PRECISION NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RubricCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentSubmission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT,
    "attachmentUrl" TEXT,
    "externalLink" TEXT,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentGrade" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "gradedById" TEXT NOT NULL,
    "marksAwarded" DOUBLE PRECISION NOT NULL,
    "maxMarks" DOUBLE PRECISION NOT NULL,
    "rubricScoresJson" TEXT,
    "feedback" TEXT,
    "privateNotes" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "gradedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "AssignmentGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeRevision" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "oldMarks" DOUBLE PRECISION NOT NULL,
    "newMarks" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionBank" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "questionBankId" TEXT NOT NULL,
    "subtopicId" TEXT,
    "questionText" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MCQ_SINGLE',
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "marks" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "explanation" TEXT,
    "correctAnswer" TEXT NOT NULL,
    "optionsJson" TEXT,
    "numericTolerance" DOUBLE PRECISION DEFAULT 0.0,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "tags" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "batchId" TEXT,
    "trainerProfileId" TEXT,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "quizType" TEXT NOT NULL DEFAULT 'MODULE_TEST',
    "maxMarks" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "passMarks" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "durationMinutes" INTEGER NOT NULL DEFAULT 45,
    "allowedAttempts" INTEGER NOT NULL DEFAULT 1,
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "publicationStatus" TEXT NOT NULL DEFAULT 'OPEN',
    "autoEvaluateObjective" BOOLEAN NOT NULL DEFAULT true,
    "allowNegativeMarking" BOOLEAN NOT NULL DEFAULT false,
    "negativeMarkValue" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "customMarks" DOUBLE PRECISION,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isPassed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizResponse" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "responseJson" TEXT,
    "isEvaluated" BOOLEAN NOT NULL DEFAULT false,
    "marksAwarded" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "evaluatorFeedback" TEXT,
    "evaluatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "batchId" TEXT,
    "trainerProfileId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "learningObjectives" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMP(3) NOT NULL,
    "maxMarks" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "rubricJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectStudentAssignment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "individualMarks" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectStudentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "deadline" TIMESTAMP(3) NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "weightPercentage" DOUBLE PRECISION NOT NULL DEFAULT 25.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectSubmission" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "milestoneId" TEXT,
    "studentProfileId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repoUrl" TEXT,
    "demoUrl" TEXT,
    "filesUrl" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "reviewNotes" TEXT,
    "marksAwarded" DOUBLE PRECISION,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicGradingPolicy" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "assignmentsWeightPercent" DOUBLE PRECISION NOT NULL DEFAULT 30.0,
    "quizzesWeightPercent" DOUBLE PRECISION NOT NULL DEFAULT 30.0,
    "projectsWeightPercent" DOUBLE PRECISION NOT NULL DEFAULT 40.0,
    "finalExamWeightPercent" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "minPassScorePercent" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "requiresAssignmentCompletion" BOOLEAN NOT NULL DEFAULT true,
    "requiresQuizPass" BOOLEAN NOT NULL DEFAULT true,
    "requiresProjectApproval" BOOLEAN NOT NULL DEFAULT true,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicGradingPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAcademicProgress" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "learningProgressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "assignmentScoreAverage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "quizScoreAverage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "projectScoreAverage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "overallAcademicScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "isAcademicallyEligible" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAcademicProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicAlert" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'NEEDS_ATTENTION',
    "evidenceJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedStaffId" TEXT,
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningRecommendation" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "recommendationType" TEXT NOT NULL,
    "suggestedAction" TEXT NOT NULL,
    "supportingResourcesJson" TEXT,
    "evidence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicFeedback" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "batchId" TEXT,
    "feedbackType" TEXT NOT NULL DEFAULT 'COURSE',
    "rating" INTEGER NOT NULL DEFAULT 5,
    "writtenFeedback" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "reviewStatus" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "assignedOwnerId" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_registrationNumber_key" ON "StudentProfile"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerProfile_userId_key" ON "TrainerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerProfile_employeeCode_key" ON "TrainerProfile"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "ManagerProfile_userId_key" ON "ManagerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancierProfile_userId_key" ON "FinancierProfile"("userId");

-- CreateIndex
CREATE INDEX "OtpRecord_identifier_idx" ON "OtpRecord"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_key" ON "Course"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE INDEX "Course_isPublished_active_idx" ON "Course"("isPublished", "active");

-- CreateIndex
CREATE INDEX "Course_category_idx" ON "Course"("category");

-- CreateIndex
CREATE UNIQUE INDEX "SyllabusVersion_courseId_versionNumber_key" ON "SyllabusVersion"("courseId", "versionNumber");

-- CreateIndex
CREATE INDEX "SyllabusModule_syllabusVersionId_idx" ON "SyllabusModule"("syllabusVersionId");

-- CreateIndex
CREATE INDEX "SyllabusSubtopic_moduleId_idx" ON "SyllabusSubtopic"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_code_key" ON "Batch"("code");

-- CreateIndex
CREATE INDEX "Batch_courseId_status_idx" ON "Batch"("courseId", "status");

-- CreateIndex
CREATE INDEX "Batch_status_startDate_idx" ON "Batch"("status", "startDate");

-- CreateIndex
CREATE INDEX "TrainerBatchAllocation_trainerProfileId_idx" ON "TrainerBatchAllocation"("trainerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerBatchAllocation_batchId_trainerProfileId_key" ON "TrainerBatchAllocation"("batchId", "trainerProfileId");

-- CreateIndex
CREATE INDEX "StudentBatchEnrollment_studentProfileId_status_idx" ON "StudentBatchEnrollment"("studentProfileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StudentBatchEnrollment_batchId_studentProfileId_key" ON "StudentBatchEnrollment"("batchId", "studentProfileId");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_assignedManagerId_idx" ON "Lead"("assignedManagerId");

-- CreateIndex
CREATE INDEX "Lead_followUpDate_idx" ON "Lead"("followUpDate");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Admission_registrationNumber_key" ON "Admission"("registrationNumber");

-- CreateIndex
CREATE INDEX "Admission_studentProfileId_idx" ON "Admission"("studentProfileId");

-- CreateIndex
CREATE INDEX "Admission_courseId_idx" ON "Admission"("courseId");

-- CreateIndex
CREATE INDEX "Admission_targetBatchId_idx" ON "Admission"("targetBatchId");

-- CreateIndex
CREATE INDEX "Admission_status_idx" ON "Admission"("status");

-- CreateIndex
CREATE INDEX "FeeAgreement_admissionId_idx" ON "FeeAgreement"("admissionId");

-- CreateIndex
CREATE INDEX "FeeAgreement_studentProfileId_idx" ON "FeeAgreement"("studentProfileId");

-- CreateIndex
CREATE INDEX "FeeAgreement_status_idx" ON "FeeAgreement"("status");

-- CreateIndex
CREATE INDEX "FeeAgreementVersion_feeAgreementId_idx" ON "FeeAgreementVersion"("feeAgreementId");

-- CreateIndex
CREATE INDEX "FeeInstallment_studentProfileId_dueDate_idx" ON "FeeInstallment"("studentProfileId", "dueDate");

-- CreateIndex
CREATE INDEX "FeeInstallment_status_dueDate_idx" ON "FeeInstallment"("status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "FeeInstallment_feeAgreementId_installmentNumber_key" ON "FeeInstallment"("feeAgreementId", "installmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StudentPayment_transactionNumber_key" ON "StudentPayment"("transactionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StudentPayment_idempotencyKey_key" ON "StudentPayment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "StudentPayment_studentProfileId_verificationStatus_idx" ON "StudentPayment"("studentProfileId", "verificationStatus");

-- CreateIndex
CREATE INDEX "StudentPayment_feeAgreementId_idx" ON "StudentPayment"("feeAgreementId");

-- CreateIndex
CREATE INDEX "StudentPayment_paymentDate_idx" ON "StudentPayment"("paymentDate");

-- CreateIndex
CREATE INDEX "PaymentAllocation_paymentId_idx" ON "PaymentAllocation"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentAllocation_installmentId_idx" ON "PaymentAllocation"("installmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_receiptNumber_key" ON "Receipt"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_studentPaymentId_key" ON "Receipt"("studentPaymentId");

-- CreateIndex
CREATE INDEX "Receipt_studentProfileId_idx" ON "Receipt"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_studentProfileId_idx" ON "Invoice"("studentProfileId");

-- CreateIndex
CREATE INDEX "Invoice_feeAgreementId_idx" ON "Invoice"("feeAgreementId");

-- CreateIndex
CREATE INDEX "Invoice_status_dueDate_idx" ON "Invoice"("status", "dueDate");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialLedgerEntry_entryNumber_key" ON "FinancialLedgerEntry"("entryNumber");

-- CreateIndex
CREATE INDEX "FinancialLedgerEntry_entryDate_idx" ON "FinancialLedgerEntry"("entryDate");

-- CreateIndex
CREATE INDEX "FinancialLedgerEntry_accountCode_idx" ON "FinancialLedgerEntry"("accountCode");

-- CreateIndex
CREATE INDEX "FinancialLedgerEntry_referenceType_referenceId_idx" ON "FinancialLedgerEntry"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "RefundRequest_studentProfileId_idx" ON "RefundRequest"("studentProfileId");

-- CreateIndex
CREATE INDEX "RefundRequest_studentPaymentId_idx" ON "RefundRequest"("studentPaymentId");

-- CreateIndex
CREATE INDEX "RefundRequest_status_idx" ON "RefundRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_refundRequestId_key" ON "Refund"("refundRequestId");

-- CreateIndex
CREATE INDEX "Refund_studentPaymentId_idx" ON "Refund"("studentPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationRecord_reconciliationDate_channel_key" ON "ReconciliationRecord"("reconciliationDate", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGatewayOrder_orderId_key" ON "PaymentGatewayOrder"("orderId");

-- CreateIndex
CREATE INDEX "PaymentGatewayOrder_studentProfileId_idx" ON "PaymentGatewayOrder"("studentProfileId");

-- CreateIndex
CREATE INDEX "PaymentGatewayOrder_feeAgreementId_idx" ON "PaymentGatewayOrder"("feeAgreementId");

-- CreateIndex
CREATE INDEX "PaymentGatewayOrder_installmentId_idx" ON "PaymentGatewayOrder"("installmentId");

-- CreateIndex
CREATE INDEX "PaymentGatewayOrder_status_idx" ON "PaymentGatewayOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProviderEvent_eventId_key" ON "PaymentProviderEvent"("eventId");

-- CreateIndex
CREATE INDEX "PaymentProviderEvent_processed_eventType_idx" ON "PaymentProviderEvent"("processed", "eventType");

-- CreateIndex
CREATE INDEX "TrainerCompensationPolicy_trainerProfileId_isActive_idx" ON "TrainerCompensationPolicy"("trainerProfileId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPeriod_periodName_key" ON "PayrollPeriod"("periodName");

-- CreateIndex
CREATE INDEX "TrainerPayout_trainerProfileId_idx" ON "TrainerPayout"("trainerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerPayout_payrollPeriodId_trainerProfileId_key" ON "TrainerPayout"("payrollPeriodId", "trainerProfileId");

-- CreateIndex
CREATE INDEX "PayoutAdjustment_trainerPayoutId_idx" ON "PayoutAdjustment"("trainerPayoutId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_name_key" ON "ExpenseCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_expenseNumber_key" ON "Expense"("expenseNumber");

-- CreateIndex
CREATE INDEX "Expense_categoryId_expenseDate_idx" ON "Expense"("categoryId", "expenseDate");

-- CreateIndex
CREATE INDEX "Expense_status_idx" ON "Expense"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateTemplate_name_key" ON "CertificateTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_certificateNumber_key" ON "Certificate"("certificateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_completionDecisionId_key" ON "Certificate"("completionDecisionId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verificationToken_key" ON "Certificate"("verificationToken");

-- CreateIndex
CREATE INDEX "Certificate_studentProfileId_idx" ON "Certificate"("studentProfileId");

-- CreateIndex
CREATE INDEX "Certificate_courseId_idx" ON "Certificate"("courseId");

-- CreateIndex
CREATE INDEX "Certificate_batchId_idx" ON "Certificate"("batchId");

-- CreateIndex
CREATE INDEX "CertificateVerificationEvent_certificateId_idx" ON "CertificateVerificationEvent"("certificateId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_code_key" ON "NotificationTemplate"("code");

-- CreateIndex
CREATE INDEX "NotificationDeliveryLog_recipientContact_status_idx" ON "NotificationDeliveryLog"("recipientContact", "status");

-- CreateIndex
CREATE INDEX "NotificationDeliveryLog_eventType_idx" ON "NotificationDeliveryLog"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationPreference_userId_key" ON "CommunicationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageSuppression_contactIdentifier_key" ON "MessageSuppression"("contactIdentifier");

-- CreateIndex
CREATE INDEX "FinancialApprovalRequest_status_requestType_idx" ON "FinancialApprovalRequest"("status", "requestType");

-- CreateIndex
CREATE INDEX "SessionOccurrence_batchId_plannedDate_idx" ON "SessionOccurrence"("batchId", "plannedDate");

-- CreateIndex
CREATE INDEX "SessionOccurrence_trainerProfileId_plannedDate_idx" ON "SessionOccurrence"("trainerProfileId", "plannedDate");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSession_occurrenceId_key" ON "ClassSession"("occurrenceId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSession_idempotencyKey_key" ON "ClassSession"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ClassSession_batchId_sessionDate_idx" ON "ClassSession"("batchId", "sessionDate");

-- CreateIndex
CREATE INDEX "ClassSession_trainerProfileId_sessionDate_idx" ON "ClassSession"("trainerProfileId", "sessionDate");

-- CreateIndex
CREATE INDEX "AttendanceEntry_studentProfileId_idx" ON "AttendanceEntry"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceEntry_classSessionId_studentProfileId_key" ON "AttendanceEntry"("classSessionId", "studentProfileId");

-- CreateIndex
CREATE INDEX "SubtopicCoverage_subtopicId_idx" ON "SubtopicCoverage"("subtopicId");

-- CreateIndex
CREATE UNIQUE INDEX "SubtopicCoverage_classSessionId_subtopicId_key" ON "SubtopicCoverage"("classSessionId", "subtopicId");

-- CreateIndex
CREATE INDEX "CorrectionRequest_classSessionId_idx" ON "CorrectionRequest"("classSessionId");

-- CreateIndex
CREATE INDEX "CorrectionRequest_status_idx" ON "CorrectionRequest"("status");

-- CreateIndex
CREATE INDEX "CorrectionRequest_requestedById_idx" ON "CorrectionRequest"("requestedById");

-- CreateIndex
CREATE INDEX "BackdateAuthorization_trainerProfileId_batchId_allowedDate_idx" ON "BackdateAuthorization"("trainerProfileId", "batchId", "allowedDate");

-- CreateIndex
CREATE INDEX "LeaveRequest_studentProfileId_idx" ON "LeaveRequest"("studentProfileId");

-- CreateIndex
CREATE INDEX "LeaveRequest_batchId_status_idx" ON "LeaveRequest"("batchId", "status");

-- CreateIndex
CREATE INDEX "StudentCompletionDecision_studentProfileId_idx" ON "StudentCompletionDecision"("studentProfileId");

-- CreateIndex
CREATE INDEX "StudentCompletionDecision_batchId_idx" ON "StudentCompletionDecision"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentCompletionDecision_studentProfileId_batchId_key" ON "StudentCompletionDecision"("studentProfileId", "batchId");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "LearningUnit_courseId_idx" ON "LearningUnit"("courseId");

-- CreateIndex
CREATE INDEX "LearningUnit_syllabusVersionId_idx" ON "LearningUnit"("syllabusVersionId");

-- CreateIndex
CREATE INDEX "LearningUnit_syllabusModuleId_idx" ON "LearningUnit"("syllabusModuleId");

-- CreateIndex
CREATE INDEX "Lesson_learningUnitId_idx" ON "Lesson"("learningUnitId");

-- CreateIndex
CREATE INDEX "Lesson_subtopicId_idx" ON "Lesson"("subtopicId");

-- CreateIndex
CREATE INDEX "LessonResource_lessonId_idx" ON "LessonResource"("lessonId");

-- CreateIndex
CREATE INDEX "LessonCompletion_lessonId_idx" ON "LessonCompletion"("lessonId");

-- CreateIndex
CREATE INDEX "LessonCompletion_status_idx" ON "LessonCompletion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LessonCompletion_studentProfileId_lessonId_key" ON "LessonCompletion"("studentProfileId", "lessonId");

-- CreateIndex
CREATE INDEX "Assignment_courseId_idx" ON "Assignment"("courseId");

-- CreateIndex
CREATE INDEX "Assignment_batchId_idx" ON "Assignment"("batchId");

-- CreateIndex
CREATE INDEX "RubricCriterion_assignmentId_idx" ON "RubricCriterion"("assignmentId");

-- CreateIndex
CREATE INDEX "AssignmentSubmission_studentProfileId_idx" ON "AssignmentSubmission"("studentProfileId");

-- CreateIndex
CREATE INDEX "AssignmentSubmission_status_idx" ON "AssignmentSubmission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentSubmission_assignmentId_studentProfileId_attemptN_key" ON "AssignmentSubmission"("assignmentId", "studentProfileId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentGrade_submissionId_key" ON "AssignmentGrade"("submissionId");

-- CreateIndex
CREATE INDEX "AssignmentGrade_gradedById_idx" ON "AssignmentGrade"("gradedById");

-- CreateIndex
CREATE INDEX "GradeRevision_gradeId_idx" ON "GradeRevision"("gradeId");

-- CreateIndex
CREATE INDEX "QuestionBank_courseId_idx" ON "QuestionBank"("courseId");

-- CreateIndex
CREATE INDEX "Question_questionBankId_idx" ON "Question"("questionBankId");

-- CreateIndex
CREATE INDEX "Quiz_courseId_idx" ON "Quiz"("courseId");

-- CreateIndex
CREATE INDEX "Quiz_batchId_idx" ON "Quiz"("batchId");

-- CreateIndex
CREATE INDEX "QuizQuestion_questionId_idx" ON "QuizQuestion"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizQuestion_quizId_questionId_key" ON "QuizQuestion"("quizId", "questionId");

-- CreateIndex
CREATE INDEX "QuizAttempt_studentProfileId_idx" ON "QuizAttempt"("studentProfileId");

-- CreateIndex
CREATE INDEX "QuizAttempt_status_idx" ON "QuizAttempt"("status");

-- CreateIndex
CREATE UNIQUE INDEX "QuizAttempt_quizId_studentProfileId_attemptNumber_key" ON "QuizAttempt"("quizId", "studentProfileId", "attemptNumber");

-- CreateIndex
CREATE INDEX "QuizResponse_attemptId_idx" ON "QuizResponse"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizResponse_attemptId_questionId_key" ON "QuizResponse"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "Project_courseId_idx" ON "Project"("courseId");

-- CreateIndex
CREATE INDEX "Project_batchId_idx" ON "Project"("batchId");

-- CreateIndex
CREATE INDEX "ProjectStudentAssignment_studentProfileId_idx" ON "ProjectStudentAssignment"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStudentAssignment_projectId_studentProfileId_key" ON "ProjectStudentAssignment"("projectId", "studentProfileId");

-- CreateIndex
CREATE INDEX "ProjectMilestone_projectId_idx" ON "ProjectMilestone"("projectId");

-- CreateIndex
CREATE INDEX "ProjectSubmission_projectId_idx" ON "ProjectSubmission"("projectId");

-- CreateIndex
CREATE INDEX "ProjectSubmission_studentProfileId_idx" ON "ProjectSubmission"("studentProfileId");

-- CreateIndex
CREATE INDEX "ProjectSubmission_milestoneId_idx" ON "ProjectSubmission"("milestoneId");

-- CreateIndex
CREATE INDEX "ProjectSubmission_status_idx" ON "ProjectSubmission"("status");

-- CreateIndex
CREATE INDEX "AcademicGradingPolicy_courseId_idx" ON "AcademicGradingPolicy"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicGradingPolicy_courseId_version_key" ON "AcademicGradingPolicy"("courseId", "version");

-- CreateIndex
CREATE INDEX "StudentAcademicProgress_batchId_idx" ON "StudentAcademicProgress"("batchId");

-- CreateIndex
CREATE INDEX "StudentAcademicProgress_studentProfileId_idx" ON "StudentAcademicProgress"("studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAcademicProgress_studentProfileId_batchId_key" ON "StudentAcademicProgress"("studentProfileId", "batchId");

-- CreateIndex
CREATE INDEX "AcademicAlert_batchId_idx" ON "AcademicAlert"("batchId");

-- CreateIndex
CREATE INDEX "AcademicAlert_studentProfileId_idx" ON "AcademicAlert"("studentProfileId");

-- CreateIndex
CREATE INDEX "AcademicAlert_status_idx" ON "AcademicAlert"("status");

-- CreateIndex
CREATE INDEX "LearningRecommendation_studentProfileId_idx" ON "LearningRecommendation"("studentProfileId");

-- CreateIndex
CREATE INDEX "LearningRecommendation_courseId_idx" ON "LearningRecommendation"("courseId");

-- CreateIndex
CREATE INDEX "AcademicFeedback_courseId_idx" ON "AcademicFeedback"("courseId");

-- CreateIndex
CREATE INDEX "AcademicFeedback_studentProfileId_idx" ON "AcademicFeedback"("studentProfileId");

-- CreateIndex
CREATE INDEX "AcademicFeedback_batchId_idx" ON "AcademicFeedback"("batchId");

-- CreateIndex
CREATE INDEX "AcademicFeedback_assignedOwnerId_idx" ON "AcademicFeedback"("assignedOwnerId");

-- CreateIndex
CREATE INDEX "AcademicFeedback_reviewStatus_idx" ON "AcademicFeedback"("reviewStatus");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerProfile" ADD CONSTRAINT "TrainerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerProfile" ADD CONSTRAINT "ManagerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancierProfile" ADD CONSTRAINT "FinancierProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusVersion" ADD CONSTRAINT "SyllabusVersion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusModule" ADD CONSTRAINT "SyllabusModule_syllabusVersionId_fkey" FOREIGN KEY ("syllabusVersionId") REFERENCES "SyllabusVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusSubtopic" ADD CONSTRAINT "SyllabusSubtopic_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "SyllabusModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_syllabusVersionId_fkey" FOREIGN KEY ("syllabusVersionId") REFERENCES "SyllabusVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerBatchAllocation" ADD CONSTRAINT "TrainerBatchAllocation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerBatchAllocation" ADD CONSTRAINT "TrainerBatchAllocation_trainerProfileId_fkey" FOREIGN KEY ("trainerProfileId") REFERENCES "TrainerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBatchEnrollment" ADD CONSTRAINT "StudentBatchEnrollment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBatchEnrollment" ADD CONSTRAINT "StudentBatchEnrollment_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_courseInterestId_fkey" FOREIGN KEY ("courseInterestId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedManagerId_fkey" FOREIGN KEY ("assignedManagerId") REFERENCES "ManagerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_targetBatchId_fkey" FOREIGN KEY ("targetBatchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeAgreement" ADD CONSTRAINT "FeeAgreement_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeAgreement" ADD CONSTRAINT "FeeAgreement_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeAgreement" ADD CONSTRAINT "FeeAgreement_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeAgreementVersion" ADD CONSTRAINT "FeeAgreementVersion_feeAgreementId_fkey" FOREIGN KEY ("feeAgreementId") REFERENCES "FeeAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeInstallment" ADD CONSTRAINT "FeeInstallment_feeAgreementId_fkey" FOREIGN KEY ("feeAgreementId") REFERENCES "FeeAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeInstallment" ADD CONSTRAINT "FeeInstallment_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPayment" ADD CONSTRAINT "StudentPayment_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPayment" ADD CONSTRAINT "StudentPayment_feeAgreementId_fkey" FOREIGN KEY ("feeAgreementId") REFERENCES "FeeAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPayment" ADD CONSTRAINT "StudentPayment_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPayment" ADD CONSTRAINT "StudentPayment_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "StudentPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "FeeInstallment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_studentPaymentId_fkey" FOREIGN KEY ("studentPaymentId") REFERENCES "StudentPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_feeAgreementId_fkey" FOREIGN KEY ("feeAgreementId") REFERENCES "FeeAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialLedgerEntry" ADD CONSTRAINT "FinancialLedgerEntry_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_studentPaymentId_fkey" FOREIGN KEY ("studentPaymentId") REFERENCES "StudentPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_refundRequestId_fkey" FOREIGN KEY ("refundRequestId") REFERENCES "RefundRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_studentPaymentId_fkey" FOREIGN KEY ("studentPaymentId") REFERENCES "StudentPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerCompensationPolicy" ADD CONSTRAINT "TrainerCompensationPolicy_trainerProfileId_fkey" FOREIGN KEY ("trainerProfileId") REFERENCES "TrainerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerPayout" ADD CONSTRAINT "TrainerPayout_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerPayout" ADD CONSTRAINT "TrainerPayout_trainerProfileId_fkey" FOREIGN KEY ("trainerProfileId") REFERENCES "TrainerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutAdjustment" ADD CONSTRAINT "PayoutAdjustment_trainerPayoutId_fkey" FOREIGN KEY ("trainerPayoutId") REFERENCES "TrainerPayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_completionDecisionId_fkey" FOREIGN KEY ("completionDecisionId") REFERENCES "StudentCompletionDecision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CertificateTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateVerificationEvent" ADD CONSTRAINT "CertificateVerificationEvent_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationPreference" ADD CONSTRAINT "CommunicationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialApprovalRequest" ADD CONSTRAINT "FinancialApprovalRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialApprovalRequest" ADD CONSTRAINT "FinancialApprovalRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionOccurrence" ADD CONSTRAINT "SessionOccurrence_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionOccurrence" ADD CONSTRAINT "SessionOccurrence_trainerProfileId_fkey" FOREIGN KEY ("trainerProfileId") REFERENCES "TrainerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "SessionOccurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_trainerProfileId_fkey" FOREIGN KEY ("trainerProfileId") REFERENCES "TrainerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceEntry" ADD CONSTRAINT "AttendanceEntry_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceEntry" ADD CONSTRAINT "AttendanceEntry_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubtopicCoverage" ADD CONSTRAINT "SubtopicCoverage_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubtopicCoverage" ADD CONSTRAINT "SubtopicCoverage_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "SyllabusSubtopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackdateAuthorization" ADD CONSTRAINT "BackdateAuthorization_trainerProfileId_fkey" FOREIGN KEY ("trainerProfileId") REFERENCES "TrainerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackdateAuthorization" ADD CONSTRAINT "BackdateAuthorization_authorizedById_fkey" FOREIGN KEY ("authorizedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingCompletionRecommendation" ADD CONSTRAINT "TeachingCompletionRecommendation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingCompletionRecommendation" ADD CONSTRAINT "TeachingCompletionRecommendation_trainerProfileId_fkey" FOREIGN KEY ("trainerProfileId") REFERENCES "TrainerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCompletionDecision" ADD CONSTRAINT "StudentCompletionDecision_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentCompletionDecision" ADD CONSTRAINT "StudentCompletionDecision_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningUnit" ADD CONSTRAINT "LearningUnit_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningUnit" ADD CONSTRAINT "LearningUnit_syllabusVersionId_fkey" FOREIGN KEY ("syllabusVersionId") REFERENCES "SyllabusVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningUnit" ADD CONSTRAINT "LearningUnit_syllabusModuleId_fkey" FOREIGN KEY ("syllabusModuleId") REFERENCES "SyllabusModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_learningUnitId_fkey" FOREIGN KEY ("learningUnitId") REFERENCES "LearningUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "SyllabusSubtopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonResource" ADD CONSTRAINT "LessonResource_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_trainerProfileId_fkey" FOREIGN KEY ("trainerProfileId") REFERENCES "TrainerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricCriterion" ADD CONSTRAINT "RubricCriterion_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentGrade" ADD CONSTRAINT "AssignmentGrade_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "AssignmentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeRevision" ADD CONSTRAINT "GradeRevision_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "AssignmentGrade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionBank" ADD CONSTRAINT "QuestionBank_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_questionBankId_fkey" FOREIGN KEY ("questionBankId") REFERENCES "QuestionBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_subtopicId_fkey" FOREIGN KEY ("subtopicId") REFERENCES "SyllabusSubtopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_trainerProfileId_fkey" FOREIGN KEY ("trainerProfileId") REFERENCES "TrainerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResponse" ADD CONSTRAINT "QuizResponse_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizResponse" ADD CONSTRAINT "QuizResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_trainerProfileId_fkey" FOREIGN KEY ("trainerProfileId") REFERENCES "TrainerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStudentAssignment" ADD CONSTRAINT "ProjectStudentAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStudentAssignment" ADD CONSTRAINT "ProjectStudentAssignment_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSubmission" ADD CONSTRAINT "ProjectSubmission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSubmission" ADD CONSTRAINT "ProjectSubmission_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectSubmission" ADD CONSTRAINT "ProjectSubmission_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicGradingPolicy" ADD CONSTRAINT "AcademicGradingPolicy_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAcademicProgress" ADD CONSTRAINT "StudentAcademicProgress_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAcademicProgress" ADD CONSTRAINT "StudentAcademicProgress_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicAlert" ADD CONSTRAINT "AcademicAlert_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicAlert" ADD CONSTRAINT "AcademicAlert_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicAlert" ADD CONSTRAINT "AcademicAlert_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRecommendation" ADD CONSTRAINT "LearningRecommendation_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningRecommendation" ADD CONSTRAINT "LearningRecommendation_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicFeedback" ADD CONSTRAINT "AcademicFeedback_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicFeedback" ADD CONSTRAINT "AcademicFeedback_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicFeedback" ADD CONSTRAINT "AcademicFeedback_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicFeedback" ADD CONSTRAINT "AcademicFeedback_assignedOwnerId_fkey" FOREIGN KEY ("assignedOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ==============================================================================
-- Aintrix Academy - Complete Supabase Production Schema & Migrations
-- Compatible with Supabase SQL Editor, Supabase CLI, and PostgreSQL 15+
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Platform Migrations Tracking Table
CREATE TABLE IF NOT EXISTS platform_migrations (
  version integer PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Edge Rate Limiting & Ephemeral KV Storage
CREATE TABLE IF NOT EXISTS enquiry_keys (
  key text PRIMARY KEY,
  value text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_enquiry_keys_expires ON enquiry_keys(expires_at);

-- 4. Learning Anonymous Sessions
CREATE TABLE IF NOT EXISTS learning_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text UNIQUE NOT NULL,
  csrf text NOT NULL,
  analytics boolean NOT NULL DEFAULT false,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days'
);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_token ON learning_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_user ON learning_sessions(user_id);

-- 5. Versioned Question Bank
CREATE TABLE IF NOT EXISTS learning_questions (
  id text NOT NULL,
  version integer NOT NULL,
  content jsonb NOT NULL,
  status text NOT NULL CHECK(status IN ('draft', 'published', 'retired')),
  reviewed_at timestamptz,
  PRIMARY KEY(id, version)
);
CREATE INDEX IF NOT EXISTS idx_learning_questions_published ON learning_questions(status, id, version DESC);

-- 6. Learning Attempts
CREATE TABLE IF NOT EXISTS learning_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  track integer NOT NULL CHECK(track BETWEEN 1 AND 3),
  bank jsonb NOT NULL,
  current_question jsonb,
  option_order jsonb,
  answers jsonb NOT NULL DEFAULT '[]',
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 day'
);
CREATE INDEX IF NOT EXISTS idx_learning_attempts_session ON learning_attempts(session_id, created_at DESC);

-- 7. Consented Analytics Events
CREATE TABLE IF NOT EXISTS learning_events (
  id bigserial PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  path text NOT NULL DEFAULT '',
  attribution jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learning_events_funnel ON learning_events(name, created_at, session_id);

-- 8. Privacy & Analytics Consents
CREATE TABLE IF NOT EXISTS learning_consents (
  id bigserial PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  analytics boolean NOT NULL,
  policy_version text NOT NULL DEFAULT 'learning-privacy-1',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Administrators & RBAC
CREATE TABLE IF NOT EXISTS learning_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK(role IN ('owner', 'administrator', 'counselor', 'instructor', 'analyst')),
  disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. Admin Sessions
CREATE TABLE IF NOT EXISTS learning_admin_sessions (
  token_hash text PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES learning_admins(id) ON DELETE CASCADE,
  csrf text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 hour'
);
CREATE INDEX IF NOT EXISTS idx_learning_admin_sessions_admin ON learning_admin_sessions(admin_id);

-- 11. Learning Audit Trail
CREATE TABLE IF NOT EXISTS learning_audit (
  id bigserial PRIMARY KEY,
  admin_id uuid REFERENCES learning_admins(id) ON DELETE SET NULL,
  action text NOT NULL,
  target text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learning_audit_action ON learning_audit(action, created_at DESC);

-- 12. Rate Limits
CREATE TABLE IF NOT EXISTS learning_limits (
  key text PRIMARY KEY,
  count integer NOT NULL,
  expires_at timestamptz NOT NULL
);

-- 13. Assessment Counselling Leads
CREATE TABLE IF NOT EXISTS learning_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  interest text NOT NULL,
  consent_text text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'qualified', 'closed')),
  assigned_to uuid REFERENCES learning_admins(id) ON DELETE SET NULL,
  preferred_contact text NOT NULL DEFAULT 'email',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, email, interest)
);
CREATE INDEX IF NOT EXISTS idx_learning_leads_status ON learning_leads(status, created_at DESC);

-- 14. Coding Submissions & Evaluation
CREATE TABLE IF NOT EXISTS learning_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  fingerprint text NOT NULL,
  challenge jsonb NOT NULL,
  code text,
  mode text NOT NULL CHECK(mode IN ('practice', 'independent')),
  assisted boolean NOT NULL,
  purpose text NOT NULL DEFAULT 'submit' CHECK(purpose IN ('sample', 'submit')),
  code_hash text,
  state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued', 'running', 'graded', 'system-error', 'cancelled')),
  retries integer NOT NULL DEFAULT 0,
  result jsonb,
  understanding_order jsonb NOT NULL,
  understanding_answer integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, request_id)
);
CREATE INDEX IF NOT EXISTS idx_learning_submission_queue ON learning_submissions(state, created_at);
CREATE INDEX IF NOT EXISTS idx_learning_submission_owner ON learning_submissions(session_id, created_at DESC);

-- 15. Judge Worker Health Heartbeat
CREATE TABLE IF NOT EXISTS learning_worker_health (
  id integer PRIMARY KEY,
  checked_at timestamptz NOT NULL
);

-- 16. Manual Reviewed Score Corrections
CREATE TABLE IF NOT EXISTS learning_score_corrections (
  id bigserial PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES learning_submissions(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES learning_admins(id) ON DELETE RESTRICT,
  score integer NOT NULL CHECK(score BETWEEN 0 AND 100),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learning_corrections_submission ON learning_score_corrections(submission_id, id DESC);

-- 17. Learning Generated Roadmaps
CREATE TABLE IF NOT EXISTS learning_roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL REFERENCES learning_attempts(id) ON DELETE CASCADE,
  profile jsonb NOT NULL,
  report jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, attempt_id)
);

-- 18. Shared Report Snapshots
CREATE TABLE IF NOT EXISTS learning_report_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id uuid NOT NULL REFERENCES learning_roadmaps(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  report jsonb NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 day',
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learning_share_owner ON learning_report_shares(roadmap_id, created_at DESC);

-- 19. Learner Accounts (Community / Leaderboard)
CREATE TABLE IF NOT EXISTS learning_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  public_name text NOT NULL,
  public_participation boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  disabled boolean NOT NULL DEFAULT false
);

-- Add foreign key from sessions to users if not present
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'learning_sessions_user_id_fkey'
  ) THEN
    ALTER TABLE learning_sessions ADD CONSTRAINT learning_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES learning_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 20. Learner Single-Use Invitations
CREATE TABLE IF NOT EXISTS learning_invites (
  token_hash text PRIMARY KEY,
  created_by uuid NOT NULL REFERENCES learning_admins(id) ON DELETE RESTRICT,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  used_at timestamptz
);

-- 21. Leaderboard Points
CREATE TABLE IF NOT EXISTS learning_points (
  user_id uuid NOT NULL REFERENCES learning_users(id) ON DELETE CASCADE,
  challenge_id text NOT NULL,
  challenge_version integer NOT NULL,
  difficulty text NOT NULL,
  skill text NOT NULL,
  points integer NOT NULL CHECK(points BETWEEN 0 AND 300),
  total integer NOT NULL CHECK(total BETWEEN 0 AND 100),
  source_submission uuid REFERENCES learning_submissions(id) ON DELETE SET NULL,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, challenge_id)
);
CREATE INDEX IF NOT EXISTS idx_learning_points_ranking ON learning_points(difficulty, skill, achieved_at, user_id);

-- 22. Point Audit History
CREATE TABLE IF NOT EXISTS learning_point_history (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES learning_users(id) ON DELETE CASCADE,
  challenge_id text NOT NULL,
  points integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 23. Lead Counselor Follow-ups
CREATE TABLE IF NOT EXISTS learning_followups (
  id bigserial PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES learning_leads(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES learning_admins(id) ON DELETE RESTRICT,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 24. A/B Testing Experiments
CREATE TABLE IF NOT EXISTS learning_experiments (
  id text PRIMARY KEY,
  version integer NOT NULL,
  active boolean NOT NULL DEFAULT false,
  variants jsonb NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 25. Experiment Assignments
CREATE TABLE IF NOT EXISTS learning_assignments (
  session_id uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  experiment_id text NOT NULL REFERENCES learning_experiments(id) ON DELETE CASCADE,
  version integer NOT NULL,
  variant text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(session_id, experiment_id, version)
);

-- 26. Candidate Rejudges
CREATE TABLE IF NOT EXISTS learning_rejudges (
  id bigserial PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES learning_submissions(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  previous_result jsonb,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==============================================================================
-- NEW CRITICAL TABLES FOR SUPABASE: ENQUIRIES, CONSULTATIONS & STUDENT COMMERCE
-- ==============================================================================

-- 27. General Academy Website Enquiries (from /contact form)
CREATE TABLE IF NOT EXISTS enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  programme text NOT NULL,
  contact_method text NOT NULL DEFAULT 'email' CHECK(contact_method IN ('email', 'phone')),
  message text,
  status text NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'contacted', 'qualified', 'closed')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_email ON enquiries(email);

-- 28. Student Consultation Bookings (from Student Panel & Mentorship modal)
CREATE TABLE IF NOT EXISTS consultation_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text NOT NULL,
  student_email text NOT NULL,
  phone text,
  programme text NOT NULL,
  preferred_date date,
  preferred_time text,
  topics text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'scheduled', 'completed', 'cancelled')),
  assigned_counselor_id uuid REFERENCES learning_admins(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consultation_enquiries_status ON consultation_enquiries(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultation_enquiries_email ON consultation_enquiries(student_email);

-- 29. Student Enrolments & Learning Plans (from Student Panel Checkout)
CREATE TABLE IF NOT EXISTS student_enrolments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES learning_users(id) ON DELETE SET NULL,
  student_name text NOT NULL,
  student_email text NOT NULL,
  phone text,
  programme text NOT NULL,
  package text NOT NULL,
  total_amount_minor integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  billing_address jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('prospect', 'pending', 'enrolled', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_student_enrolments_email ON student_enrolments(student_email);

-- 30. Student Payment Orders
CREATE TABLE IF NOT EXISTS student_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrolment_id uuid NOT NULL REFERENCES student_enrolments(id) ON DELETE CASCADE,
  order_reference text UNIQUE NOT NULL,
  amount_minor integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'succeeded', 'failed', 'refunded')),
  payment_gateway text,
  gateway_order_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 31. Student Payment Instalments Schedule
CREATE TABLE IF NOT EXISTS student_instalments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrolment_id uuid NOT NULL REFERENCES student_enrolments(id) ON DELETE CASCADE,
  order_id uuid REFERENCES student_orders(id) ON DELETE SET NULL,
  label text NOT NULL,
  amount_minor integer NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'due' CHECK(status IN ('due', 'paid', 'overdue', 'waived')),
  receipt_url text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 32. AUTOMATIC UPDATED_AT TRIGGER
-- ==============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_submissions_updated BEFORE UPDATE ON learning_submissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_points_updated BEFORE UPDATE ON learning_points FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_enquiries_updated BEFORE UPDATE ON enquiries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_consultation_updated BEFORE UPDATE ON consultation_enquiries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_enrolments_updated BEFORE UPDATE ON student_enrolments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==============================================================================
-- 33. ROW LEVEL SECURITY (RLS) POLICIES
-- In Supabase, RLS protects every table from unauthorized API queries.
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE platform_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiry_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_worker_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_score_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_report_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_point_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_rejudges ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrolments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_instalments ENABLE ROW LEVEL SECURITY;

-- Service Role (Full Backend Access) Policies for each table
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "service_role_all_%I" ON %I', tbl, tbl);
    EXECUTE format('CREATE POLICY "service_role_all_%I" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END $$;

-- Public / Anon Policies

-- Questions: anyone can view published questions
DROP POLICY IF EXISTS "public_read_published_questions" ON learning_questions;
CREATE POLICY "public_read_published_questions" ON learning_questions
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

-- Public Leaderboard: view participating users and their point totals
DROP POLICY IF EXISTS "public_read_participating_users" ON learning_users;
CREATE POLICY "public_read_participating_users" ON learning_users
  FOR SELECT TO anon, authenticated
  USING (public_participation = true AND NOT disabled);

DROP POLICY IF EXISTS "public_read_public_points" ON learning_points;
CREATE POLICY "public_read_public_points" ON learning_points
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM learning_users u 
    WHERE u.id = learning_points.user_id 
      AND u.public_participation = true 
      AND NOT u.disabled
  ));

-- Experiments: public can view active experiments for client assignments
DROP POLICY IF EXISTS "public_read_active_experiments" ON learning_experiments;
CREATE POLICY "public_read_active_experiments" ON learning_experiments
  FOR SELECT TO anon, authenticated
  USING (active = true);

-- Report Shares: anyone with the valid shared report link can view until expired or revoked
DROP POLICY IF EXISTS "public_read_valid_shares" ON learning_report_shares;
CREATE POLICY "public_read_valid_shares" ON learning_report_shares
  FOR SELECT TO anon, authenticated
  USING (revoked_at IS NULL AND expires_at > now());

-- Enquiries: public can submit an enquiry from the website contact form
DROP POLICY IF EXISTS "public_insert_enquiries" ON enquiries;
CREATE POLICY "public_insert_enquiries" ON enquiries
  FOR INSERT TO anon, authenticated
  WITH CHECK (length(trim(name)) > 0 AND length(trim(email)) > 0);

-- Consultation Bookings: public can request a consultation
DROP POLICY IF EXISTS "public_insert_consultations" ON consultation_enquiries;
CREATE POLICY "public_insert_consultations" ON consultation_enquiries
  FOR INSERT TO anon, authenticated
  WITH CHECK (length(trim(student_name)) > 0 AND length(trim(student_email)) > 0);

-- Consents & Events: analytics tracking for consenting sessions
DROP POLICY IF EXISTS "public_insert_consents" ON learning_consents;
CREATE POLICY "public_insert_consents" ON learning_consents
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "public_insert_events" ON learning_events;
CREATE POLICY "public_insert_events" ON learning_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "public_insert_leads" ON learning_leads;
CREATE POLICY "public_insert_leads" ON learning_leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (length(trim(name)) > 0 AND length(trim(email)) > 0);

-- ==============================================================================
-- 34. SUPABASE REALTIME REPLICATION
-- Publish tables so frontend receives live updates
-- ==============================================================================

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE learning_submissions;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE learning_worker_health;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE enquiries;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE consultation_enquiries;
EXCEPTION WHEN others THEN NULL; END $$;

-- 35. Seed Default A/B Experiments
INSERT INTO learning_experiments(id, version, active, variants, description) VALUES
  ('assessment-cta', 1, false, '["Take the Free Skill Test","Discover Your Developer Skills"]'::jsonb, 'Assessment entry text; optional consenting sessions only'),
  ('consultation-prompt', 1, false, '["Discuss this roadmap with a counselor","Talk through your learning goals"]'::jsonb, 'Roadmap counselling link text')
ON CONFLICT (id) DO NOTHING;

-- Record all 8 migration levels
INSERT INTO platform_migrations(version) VALUES (1), (2), (3), (4), (5), (6), (7), (8)
ON CONFLICT DO NOTHING;


-- ==============================================================================
-- 🌟 SEED DATA: CORE ROLES, COURSES & LEDGER ACCOUNTS
-- ==============================================================================

-- 1. Seed Core Role Users with bcrypt hashed passwords
INSERT INTO "User" ("id", "name", "email", "phone", "passwordHash", "role", "isActive", "updatedAt")
VALUES 
  ('usr-admin-01', 'Academy Executive Director', 'admin@apexacademy.edu', '+15550000001', crypt('Admin@123456', gen_salt('bf', 10)), 'ADMIN', true, now()),
  ('usr-manager-01', 'Operations Manager', 'manager@apexacademy.edu', '+15550000002', crypt('Manager@123456', gen_salt('bf', 10)), 'MANAGER', true, now()),
  ('usr-trainer-01', 'Senior Faculty Lead', 'trainer@apexacademy.edu', '+15550000004', crypt('Trainer@123456', gen_salt('bf', 10)), 'TRAINER', true, now()),
  ('usr-financier-01', 'Bursar & Financial Controller', 'financier@apexacademy.edu', '+15550000003', crypt('Financier@123456', gen_salt('bf', 10)), 'FINANCIER', true, now()),
  ('usr-student-01', 'Aravind Baskar (Student)', 'student@apexacademy.edu', '+15551234567', crypt('Student@123456', gen_salt('bf', 10)), 'STUDENT', true, now())
ON CONFLICT ("email") DO NOTHING;

-- 2. Seed Associated Profiles
INSERT INTO "ManagerProfile" ("id", "userId", "department", "updatedAt")
VALUES ('mp-01', 'usr-manager-01', 'Academic Operations & Curriculum', now())
ON CONFLICT ("userId") DO NOTHING;

INSERT INTO "TrainerProfile" ("id", "userId", "employeeCode", "specialization", "hourlyRate", "updatedAt")
VALUES ('tp-01', 'usr-trainer-01', 'FAC-001', 'Full Stack & Distributed Systems', 1200.0, now())
ON CONFLICT ("userId") DO NOTHING;

INSERT INTO "FinancierProfile" ("id", "userId", "deskNumber", "approvalLimit", "updatedAt")
VALUES ('fp-01', 'usr-financier-01', 'FIN-DESK-01', 500000.0, now())
ON CONFLICT ("userId") DO NOTHING;

INSERT INTO "StudentProfile" ("id", "userId", "registrationNumber", "updatedAt")
VALUES ('sp-01', 'usr-student-01', 'REG-2026-0001', now())
ON CONFLICT ("userId") DO NOTHING;

-- 3. Seed 12 Full Production Courses
INSERT INTO "Course" ("id", "title", "slug", "code", "category", "summary", "description", "durationWeeks", "basePrice", "currency", "isPublished", "active", "updatedAt")
VALUES
  ('c-01', 'Python Full Stack Engineering', 'python-full-stack', 'CS-PFS-01', 'FULLSTACK', 'Comprehensive full-stack engineering with Python, Django, React and cloud infrastructure.', 'Master end-to-end software development from data structures to production cloud deployments.', 24, 75000.0, 'INR', true, true, now()),
  ('c-02', 'Full Stack Web & Mobile App Development', 'full-stack-app-dev', 'CS-FSD-02', 'FULLSTACK', 'Cross-platform web and mobile development using React, Next.js and React Native.', 'Build scalable web platforms and native mobile apps with modern JavaScript and TypeScript.', 20, 68000.0, 'INR', true, true, now()),
  ('c-03', 'Modern Django Backend Architecture', 'django-backend-dev', 'CS-DJN-03', 'BACKEND', 'Production Django REST Framework, asynchronous workers and PostgreSQL optimization.', 'Design resilient distributed backend services with microservices, Redis caching and Celery.', 16, 52000.0, 'INR', true, true, now()),
  ('c-04', 'Professional React & Frontend Engineering', 'react-development', 'CS-RCT-04', 'FRONTEND', 'Advanced React 19, Server Components, State Management and Design Systems.', 'Build lightning-fast, accessible web applications with cutting-edge React paradigms.', 14, 48000.0, 'INR', true, true, now()),
  ('c-05', 'Advanced Python, Concurrency & Systems', 'advanced-python', 'CS-APY-05', 'BACKEND', 'Asynchronous programming, memory profiling, GIL mechanics and low-level internals.', 'Deep dive into Python performance optimization, multiprocessing and high-throughput systems.', 12, 45000.0, 'INR', true, true, now()),
  ('c-06', 'Cloud Native DevOps, Docker & CI/CD', 'devops-docker-deployment', 'CS-DOP-06', 'DEVOPS', 'Containerization, Kubernetes orchestration, Infrastructure as Code and automated pipelines.', 'Implement production-grade CI/CD automation, monitoring, observability and cloud security.', 16, 55000.0, 'INR', true, true, now()),
  ('c-07', 'Data Structures, Algorithms & Problem Solving', 'dsa-technical-interview', 'CS-DSA-07', 'COMPUTER_SCIENCE', 'Master LeetCode medium/hard patterns, system design and Big-O computational efficiency.', 'Structured preparation for tier-1 product company technical interviews and competitive programming.', 16, 42000.0, 'INR', true, true, now()),
  ('c-08', 'Programming Foundation with Python', 'programming-python-foundation', 'CS-FND-08', 'FOUNDATION', 'Zero-to-hero programming fundamentals, algorithmic thinking and clean coding principles.', 'The definitive introductory programme for aspiring software developers with zero prior coding background.', 10, 32000.0, 'INR', true, true, now()),
  ('c-09', 'Core Frontend: HTML5, Modern CSS & JavaScript', 'html-css-javascript', 'CS-FED-09', 'FRONTEND', 'Semantic HTML5, CSS Grid, Flexbox, Animations and modern ESNext JavaScript.', 'Build pixel-perfect, responsive web interfaces with modern styling and DOM manipulation.', 10, 32000.0, 'INR', true, true, now()),
  ('c-10', 'Relational Database Design with SQL & PostgreSQL', 'sql-postgresql', 'CS-SQL-10', 'DATABASE', 'Relational modeling, indexing strategies, ACID transactions, partitioning and query tuning.', 'Architect high-throughput relational databases with advanced query plans and stored procedures.', 12, 38000.0, 'INR', true, true, now()),
  ('c-11', 'Software Engineering, Architecture & Testing', 'software-engineering-testing', 'CS-SET-11', 'ENGINEERING', 'Clean Code, SOLID design principles, TDD/BDD testing patterns and design patterns.', 'Write robust, maintainable, production-ready software systems that scale across enterprise teams.', 12, 44000.0, 'INR', true, true, now()),
  ('c-12', 'Practical AI Engineering & Modern Tooling', 'ai-assisted-development', 'CS-AIE-12', 'AI', 'LLM integration, Retrieval-Augmented Generation (RAG), vector databases and AI agent workflows.', 'Harness generative AI and autonomous coding agents to multiply engineering productivity 10x.', 12, 58000.0, 'INR', true, true, now())
ON CONFLICT ("slug") DO NOTHING;

-- 4. Seed Core Ledger Accounts for Double-Entry Accounting
INSERT INTO "FinancialLedgerEntry" ("id", "entryNumber", "sourceType", "sourceId", "debitAccount", "creditAccount", "amount", "currency", "description", "postedAt")
VALUES
  ('fle-init-01', 'LEDGER-INIT-001', 'PAYMENT', 'init-balance', '1010-CASH-BANK', '3000-RETAINED-EARNINGS', 1000000.0, 'INR', 'Academy Initial Working Capital & Bank Balance', now())
ON CONFLICT ("entryNumber") DO NOTHING;

