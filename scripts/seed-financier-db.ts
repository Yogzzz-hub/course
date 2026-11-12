import pg from 'pg';
import { createInitialFinancierState } from '../src/data/financierMock.ts';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:mkccsql@127.0.0.1:5432/academy',
});

export async function seedFinancierDb(force = false) {
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT count(*) FROM "Course"');
    if (parseInt(existing.rows[0].count, 10) > 0 && !force) {
      console.log('Database already has Course records. Skipping seed.');
      return;
    }

    console.log('Seeding PostgreSQL database with academy & financier dataset...');
    await client.query('BEGIN');

    const seed = createInitialFinancierState('2026-11-11T10:00:00.000Z');

    // 1. Users
    const allUsers = [
      ...seed.actors.map(a => ({
        id: a.id,
        name: a.name,
        email: a.email,
        role: a.role,
      })),
      ...seed.trainers.map(t => ({
        id: t.userId,
        name: t.name,
        email: t.email,
        role: 'TRAINER',
      })),
      ...seed.students.map(s => ({
        id: s.userId,
        name: s.name,
        email: s.email,
        role: 'STUDENT',
      })),
    ];

    for (const u of allUsers) {
      const existingUser = await client.query('SELECT id FROM "User" WHERE "email" = $1', [u.email]);
      if (existingUser.rows.length > 0) {
        await client.query(
          'UPDATE "User" SET "id" = $1, "name" = $2, "role" = $3::"Role", "isActive" = true WHERE "email" = $4',
          [u.id, u.name, u.role, u.email]
        );
      } else {
        await client.query(
          `INSERT INTO "User" ("id", "name", "email", "role", "passwordHash", "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4::"Role", 'pbkdf2_sha256_seeded_hash', true, NOW(), NOW())
           ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "email" = EXCLUDED."email", "role" = EXCLUDED."role"`,
          [u.id, u.name, u.email, u.role]
        );
      }
    }

    // 2. Courses
    const courseMap = new Map(); // trackCode -> courseId
    for (const track of seed.tracks) {
      const courseId = `crs-${track.code.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      courseMap.set(track.code, courseId);
      await client.query(
        `INSERT INTO "Course" ("id", "code", "slug", "title", "description", "category", "durationWeeks", "durationHours", "agreedFeeDefault", "active", "isPublished", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, 'Software Engineering', 24, 240, $6, true, true, NOW(), NOW())
         ON CONFLICT ("id") DO UPDATE SET "title" = EXCLUDED."title", "agreedFeeDefault" = EXCLUDED."agreedFeeDefault"`,
        [
          courseId,
          track.code,
          track.code.toLowerCase(),
          track.title,
          `${track.title} Professional Track`,
          track.defaultFeePaise / 100,
        ]
      );

      // SyllabusVersion
      const syllabusId = `syl-${track.code.toLowerCase()}-v1`;
      await client.query(
        `INSERT INTO "SyllabusVersion" ("id", "courseId", "versionNumber", "title", "status", "createdAt", "updatedAt")
         VALUES ($1, $2, 1, $3, 'APPROVED', NOW(), NOW())
         ON CONFLICT ("id") DO NOTHING`,
        [syllabusId, courseId, `${track.title} Curriculum v1`]
      );
    }

    // 3. Batches
    for (const batch of seed.batches) {
      const courseId = courseMap.get(batch.trackCode);
      const syllabusId = `syl-${batch.trackCode.toLowerCase()}-v1`;
      await client.query(
        `INSERT INTO "Batch" ("id", "code", "courseId", "syllabusVersionId", "capacity", "scheduleType", "status", "startDate", "expectedEndDate", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 25, 'WEEKDAYS'::"ScheduleType", $5::"BatchStatus", $6, $7, NOW(), NOW())
         ON CONFLICT ("id") DO UPDATE SET "code" = EXCLUDED."code", "status" = EXCLUDED."status"`,
        [
          batch.id,
          batch.code,
          courseId,
          syllabusId,
          batch.status,
          batch.startDate,
          batch.startDate,
        ]
      );
    }

    // 4. TrainerProfiles
    for (const trn of seed.trainers) {
      await client.query(
        `INSERT INTO "TrainerProfile" ("id", "userId", "employeeCode", "specialization", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'Faculty Lead', NOW(), NOW())
         ON CONFLICT ("id") DO UPDATE SET "employeeCode" = EXCLUDED."employeeCode"`,
        [trn.id, trn.userId, trn.employeeCode]
      );
    }

    // 5. StudentProfiles & Admissions & FeeAgreements
    for (const stu of seed.students) {
      await client.query(
        `INSERT INTO "StudentProfile" ("id", "userId", "registrationNumber", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, NOW(), NOW())
         ON CONFLICT ("id") DO UPDATE SET "registrationNumber" = EXCLUDED."registrationNumber"`,
        [stu.id, stu.userId, stu.registrationNumber]
      );

      const admissionId = `adm-${stu.id}`;
      const courseId = courseMap.get(stu.trackCode);
      const admissionStatus = stu.financialHold ? 'FINANCIAL_HOLD' : 'ACTIVE';
      await client.query(
        `INSERT INTO "Admission" ("id", "registrationNumber", "studentProfileId", "courseId", "targetBatchId", "agreedFee", "discountAmount", "schedulePreference", "status", "financialHold", "createdById", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'WEEKDAYS'::"ScheduleType", $8::"AdmissionStatus", $9, 'usr-financier', NOW(), NOW())
         ON CONFLICT ("id") DO UPDATE SET "agreedFee" = EXCLUDED."agreedFee", "financialHold" = EXCLUDED."financialHold", "status" = EXCLUDED."status"`,
        [
          admissionId,
          stu.registrationNumber,
          stu.id,
          courseId,
          stu.batchId,
          stu.netPayablePaise / 100,
          stu.approvedDiscountPaise / 100,
          admissionStatus,
          stu.financialHold,
        ]
      );

      // StudentBatchEnrollment
      await client.query(
        `INSERT INTO "StudentBatchEnrollment" ("id", "batchId", "studentProfileId", "effectiveStartDate", "status", "allocatedAt")
         VALUES ($1, $2, $3, NOW(), 'ACTIVE', NOW())
         ON CONFLICT ("id") DO NOTHING`,
        [`sbe-${stu.id}`, stu.batchId, stu.id]
      );

      // FeeAgreement
      await client.query(
        `INSERT INTO "FeeAgreement" ("id", "admissionId", "studentProfileId", "courseFee", "totalAgreedFee", "discountAmount", "taxAmount", "currency", "installmentsCount", "status", "isApproved", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, 0, 'INR', 3, 'APPROVED', true, NOW(), NOW())
         ON CONFLICT ("id") DO UPDATE SET "courseFee" = EXCLUDED."courseFee", "totalAgreedFee" = EXCLUDED."totalAgreedFee", "discountAmount" = EXCLUDED."discountAmount"`,
        [
          stu.feeAgreementId,
          admissionId,
          stu.id,
          stu.courseFeePaise / 100,
          stu.netPayablePaise / 100,
          stu.approvedDiscountPaise / 100,
        ]
      );
    }

    // 6. FeeInstallments
    for (const inst of seed.installments) {
      await client.query(
        `INSERT INTO "FeeInstallment" ("id", "feeAgreementId", "studentProfileId", "installmentNumber", "dueDate", "amountDue", "amountPaid", "remainingBalance", "status", "lastPaymentDate", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         ON CONFLICT ("id") DO UPDATE SET "amountDue" = EXCLUDED."amountDue", "amountPaid" = EXCLUDED."amountPaid", "remainingBalance" = EXCLUDED."remainingBalance", "status" = EXCLUDED."status"`,
        [
          inst.id,
          inst.feeAgreementId,
          inst.studentProfileId,
          inst.installmentNumber,
          inst.dueDate,
          inst.amountDuePaise / 100,
          inst.amountPaidPaise / 100,
          inst.remainingBalancePaise / 100,
          inst.status,
          inst.lastPaymentDate,
        ]
      );
    }

    // 7. Invoices & InvoiceLines
    for (const inv of seed.invoices) {
      await client.query(
        `INSERT INTO "Invoice" ("id", "invoiceNumber", "feeAgreementId", "studentProfileId", "issueDate", "dueDate", "grossAmount", "discountAmount", "taxAmount", "netTotal", "currency", "status", "notes", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, 'INR', $10, $11, NOW(), NOW())
         ON CONFLICT ("id") DO UPDATE SET "status" = EXCLUDED."status", "grossAmount" = EXCLUDED."grossAmount", "discountAmount" = EXCLUDED."discountAmount", "netTotal" = EXCLUDED."netTotal"`,
        [
          inv.id,
          inv.invoiceNumber,
          inv.feeAgreementId,
          inv.studentProfileId,
          inv.issueDate,
          inv.dueDate,
          inv.grossAmountPaise / 100,
          inv.discountAmountPaise / 100,
          inv.netTotalPaise / 100,
          inv.status,
          inv.notes || '',
        ]
      );

      for (const line of (inv.lines || [])) {
        await client.query(
          `INSERT INTO "InvoiceLine" ("id", "invoiceId", "description", "quantity", "unitPrice", "total")
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT ("id") DO UPDATE SET "unitPrice" = EXCLUDED."unitPrice", "total" = EXCLUDED."total"`,
          [
            line.id,
            inv.id,
            line.description,
            line.quantity,
            line.unitPricePaise / 100,
            line.totalPaise / 100,
          ]
        );
      }
    }

    // 8. StudentPayments & PaymentAllocations
    for (const pay of seed.payments) {
      await client.query(
        `INSERT INTO "StudentPayment" ("id", "transactionNumber", "studentProfileId", "feeAgreementId", "amount", "currency", "paymentMethod", "paymentDate", "externalReference", "verificationStatus", "collectedById", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, 'INR', $6, $7, $8, 'VERIFIED', $9, NOW(), NOW())
         ON CONFLICT ("id") DO UPDATE SET "amount" = EXCLUDED."amount", "verificationStatus" = EXCLUDED."verificationStatus"`,
        [
          pay.id,
          pay.receiptNumber,
          pay.studentProfileId,
          pay.feeAgreementId,
          pay.amountPaise / 100,
          pay.paymentMethod,
          pay.paymentDate,
          pay.externalReference,
          pay.collectedById,
        ]
      );

      for (const alloc of (pay.allocations || [])) {
        await client.query(
          `INSERT INTO "PaymentAllocation" ("id", "paymentId", "installmentId", "allocatedAmount", "allocatedAt")
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT ("id") DO NOTHING`,
          [
            alloc.id || `alloc-${pay.id}-${alloc.installmentId}`,
            pay.id,
            alloc.installmentId,
            alloc.allocatedPaise / 100,
          ]
        );
      }
    }

    // 9. FinancialLedgerEntries
    for (const je of seed.journalEntries) {
      let lineIndex = 1;
      for (const line of je.lines) {
        const uniqueEntryNumber = `${line.entryNumber}-${lineIndex++}`;
        await client.query(
          `INSERT INTO "FinancialLedgerEntry" ("id", "entryNumber", "entryDate", "transactionType", "direction", "amount", "currency", "accountCode", "referenceType", "referenceId", "studentProfileId", "notes", "createdById", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, 'INR', $7, $8, $9, $10, $11, $12, NOW())
           ON CONFLICT ("id") DO NOTHING`,
          [
            line.id,
            uniqueEntryNumber,
            line.entryDate,
            line.transactionType,
            line.direction,
            line.amountPaise / 100,
            line.accountCode,
            line.referenceType,
            line.referenceId,
            line.studentProfileId,
            line.notes,
            line.createdById,
          ]
        );
      }
    }

    // 10. FinancialApprovalRequest (Discounts)
    for (const disc of seed.discounts) {
      await client.query(
        `INSERT INTO "FinancialApprovalRequest" ("id", "requestType", "entityType", "entityId", "requestedAmount", "reason", "status", "requestedById", "reviewedById", "reviewedAt", "reviewNotes", "createdAt", "updatedAt")
         VALUES ($1, 'DISCOUNT', 'STUDENT', $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
         ON CONFLICT ("id") DO UPDATE SET "status" = EXCLUDED."status"`,
        [
          disc.id,
          disc.studentProfileId,
          disc.amountPaise / 100,
          disc.reason,
          disc.status,
          disc.requestedById,
          disc.approvedById,
          disc.decidedAt,
          disc.decisionNotes,
        ]
      );
    }

    // 11. RefundRequests & Refunds
    for (const ref of seed.refunds) {
      const reqId = `refr-${ref.id}`;
      await client.query(
        `INSERT INTO "RefundRequest" ("id", "studentPaymentId", "studentProfileId", "requestedAmount", "reason", "status", "requestedById", "reviewedById", "reviewedAt", "reviewNotes", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         ON CONFLICT ("id") DO UPDATE SET "status" = EXCLUDED."status"`,
        [
          reqId,
          ref.paymentId,
          ref.studentProfileId,
          ref.amountPaise / 100,
          ref.reason,
          ref.status,
          ref.requestedById,
          ref.approvedById,
          ref.approvedAt,
          null,
        ]
      );

      if (ref.status === 'EXECUTED' && ref.executedById) {
        await client.query(
          `INSERT INTO "Refund" ("id", "refundRequestId", "studentPaymentId", "amount", "refundMethod", "externalReference", "status", "executedById", "executedAt", "ledgerEntryId", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, 'COMPLETED', $7, $8, $9, NOW())
           ON CONFLICT ("id") DO NOTHING`,
          [
            ref.id,
            reqId,
            ref.paymentId,
            ref.amountPaise / 100,
            ref.refundMethod,
            ref.externalReference,
            ref.executedById,
            ref.executedAt || new Date().toISOString(),
            ref.ledgerEntryId,
          ]
        );
      }
    }

    // 12. PayrollPeriods & TrainerPayouts & Adjustments
    for (const pr of seed.payrollRuns) {
      await client.query(
        `INSERT INTO "PayrollPeriod" ("id", "periodName", "startDate", "endDate", "status", "approvedById", "approvedAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         ON CONFLICT ("id") DO UPDATE SET "status" = EXCLUDED."status"`,
        [
          pr.id,
          `${pr.runNumber} - ${pr.periodName}`,
          pr.startDate,
          pr.endDate,
          pr.status,
          pr.approvedById,
          pr.approvedAt,
        ]
      );

      for (const payout of pr.payouts) {
        await client.query(
          `INSERT INTO "TrainerPayout" ("id", "payrollPeriodId", "trainerProfileId", "compensationPolicyType", "applicableRate", "eligibleSessionsCount", "verifiedHours", "baseAmount", "bonusAmount", "deductionAmount", "totalPayable", "adminApprovalStatus", "adminApprovedById", "adminApprovedAt", "paymentStatus", "paidAmount", "paidAt", "paymentReference", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
           ON CONFLICT ("id") DO UPDATE SET "totalPayable" = EXCLUDED."totalPayable", "paymentStatus" = EXCLUDED."paymentStatus"`,
          [
            payout.id,
            pr.id,
            payout.trainerProfileId,
            payout.policyType,
            payout.applicableRatePaise / 100,
            payout.eligibleSessionsCount,
            payout.verifiedMinutes / 60,
            payout.baseAmountPaise / 100,
            payout.bonusPaise / 100,
            payout.deductionPaise / 100,
            payout.totalPayablePaise / 100,
            pr.status === 'APPROVED' || pr.status === 'PAID' ? 'APPROVED' : 'PENDING',
            pr.approvedById,
            pr.approvedAt,
            payout.paidAt ? 'PAID' : 'DRAFT',
            payout.paidAt ? payout.totalPayablePaise / 100 : 0,
            payout.paidAt,
            payout.payslipNumber,
          ]
        );

        for (const adj of payout.adjustments) {
          await client.query(
            `INSERT INTO "PayoutAdjustment" ("id", "trainerPayoutId", "type", "amount", "reason", "approvedById", "createdAt")
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT ("id") DO NOTHING`,
            [
              adj.id,
              payout.id,
              adj.type,
              adj.amountPaise / 100,
              adj.reason,
              adj.approvedById || 'usr-admin',
            ]
          );
        }
      }
    }

    // 13. AuditEvents
    for (const aud of seed.auditLogs) {
      await client.query(
        `INSERT INTO "AuditEvent" ("id", "userId", "action", "entityType", "entityId", "detailsJson", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT ("id") DO NOTHING`,
        [
          aud.id,
          aud.actorId,
          aud.action,
          aud.entityType,
          aud.entityId,
          JSON.stringify({
            actorName: aud.actorName,
            actorRole: aud.actorRole,
            reason: aud.reason,
            requestId: aud.requestId,
            before: aud.before,
            after: aud.after,
          }),
          aud.timestamp,
        ]
      );
    }

    // 14. NotificationDeliveryLogs
    for (const notif of seed.notifications) {
      await client.query(
        `INSERT INTO "NotificationDeliveryLog" ("id", "recipientId", "recipientContact", "channel", "eventType", "renderedSubject", "renderedBody", "status", "provider", "providerMessageId", "createdAt")
         VALUES ($1, $2, $3, 'EMAIL', $4, $5, 'Seeded fee notification body', $6, $7, $8, $9)
         ON CONFLICT ("id") DO NOTHING`,
        [
          notif.id,
          notif.studentProfileId,
          notif.recipientEmail,
          notif.kind,
          notif.subject,
          notif.status,
          notif.provider,
          notif.providerId,
          notif.sentAt,
        ]
      );
    }

    await client.query('COMMIT');
    console.log('Successfully seeded PostgreSQL academy database with full financier data!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to seed PostgreSQL database:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1]?.endsWith('seed-financier-db.mjs')) {
  seedFinancierDb(process.argv.includes('--force'))
    .then(() => pool.end())
    .catch(() => {
      pool.end();
      process.exit(1);
    });
}
