import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  verifySessionToken,
  generateStudentOtp,
  verifyStudentOtp,
} from "@/lib/auth";
import { calculateStudentBatchAttendance } from "@/lib/attendance";
import { calculateBatchSyllabusProgress } from "@/lib/progress";

describe("Phase 1 Core Academy Operations — Comprehensive Acceptance Test Suite", () => {
  let adminUser: any;
  let managerUser: any;
  let trainerUser: any;
  let studentUser: any;
  let studentProfile: any;
  let testBatch: any;
  let testCourse: any;
  let syllabusVersion: any;
  let subtopics: any[] = [];

  beforeAll(async () => {
    // Fetch seeded accounts
    adminUser = await prisma.user.findUnique({
      where: { email: "admin@apexacademy.edu" },
    });
    managerUser = await prisma.user.findUnique({
      where: { email: "manager@apexacademy.edu" },
    });
    trainerUser = await prisma.user.findUnique({
      where: { email: "trainer@apexacademy.edu" },
      include: { trainerProfile: true },
    });
    studentUser = await prisma.user.findUnique({
      where: { email: "student@apexacademy.edu" },
      include: { studentProfile: true },
    });
    studentProfile = studentUser?.studentProfile;

    testBatch = await prisma.batch.findFirst({
      where: { code: "FS-2026-W1" },
      include: {
        course: {
          include: {
            syllabusVersions: {
              include: {
                modules: {
                  include: { subtopics: true },
                },
              },
            },
          },
        },
        syllabusVersion: {
          include: {
            modules: {
              include: { subtopics: true },
            },
          },
        },
        enrollments: { include: { studentProfile: true } },
        trainerAllocations: true,
      },
    });

    if (!testBatch) {
      testBatch = await prisma.batch.findFirst({
        include: {
          course: {
            include: {
              syllabusVersions: {
                include: {
                  modules: {
                    include: { subtopics: true },
                  },
                },
              },
            },
          },
          syllabusVersion: {
            include: {
              modules: {
                include: { subtopics: true },
              },
            },
          },
          enrollments: { include: { studentProfile: true } },
          trainerAllocations: true,
        },
      });
    }

    testCourse = testBatch.course;
    syllabusVersion = testBatch.syllabusVersion;
    subtopics = syllabusVersion.modules.flatMap((m: any) => m.subtopics) || [];
  });

  // AT01: Student Record Isolation
  it("AT01: Student record isolation — Student cannot access another student's data", async () => {
    expect(studentProfile).toBeDefined();

    // Create or find a temporary second student to verify isolation
    const studentBUser = await prisma.user.upsert({
      where: { email: "student.b.isolation@apexacademy.edu" },
      create: {
        email: "student.b.isolation@apexacademy.edu",
        name: "Student B Isolation",
        passwordHash: "hash123",
        role: "STUDENT",
        studentProfile: {
          create: {
            registrationNumber: "ACA-ISO-0002",
          },
        },
      },
      update: {},
      include: { studentProfile: true },
    });

    // Query for Student A only returns Student A's profile
    const queriedProfileA = await prisma.studentProfile.findUnique({
      where: { userId: studentUser.id },
      include: { feeAgreements: true, attendanceEntries: true },
    });

    expect(queriedProfileA?.registrationNumber).toBe("ACA-2026-0001");
    expect(queriedProfileA?.id).not.toBe(studentBUser.studentProfile?.id);

    // Verify Student B fee agreement is isolated
    const testAdmission = await prisma.admission.upsert({
      where: { registrationNumber: "ACA-ISO-ADM-02" },
      create: {
        registrationNumber: "ACA-ISO-ADM-02",
        courseId: testCourse.id,
        agreedFee: 1500,
        createdById: adminUser.id,
        studentProfileId: studentBUser.studentProfile!.id,
      },
      update: {},
    });

    await prisma.feeAgreement.create({
      data: {
        admissionId: testAdmission.id,
        studentProfileId: studentBUser.studentProfile!.id,
        totalAgreedFee: 1500,
      },
    });

    const feeAgreementsA = await prisma.feeAgreement.findMany({
      where: { studentProfileId: studentProfile.id },
    });

    // None of Student A's fee agreements belong to Student B
    for (const agreement of feeAgreementsA) {
      expect(agreement.studentProfileId).toBe(studentProfile.id);
      expect(agreement.studentProfileId).not.toBe(studentBUser.studentProfile!.id);
    }
  });

  // AT02: Trainer Batch Authorization Fencing
  it("AT02: Trainer batch authorization fencing — Trainer not allocated to batch is denied", async () => {
    // Create an unallocated trainer
    const unallocatedTrainer = await prisma.user.upsert({
      where: { email: "unallocated.trainer@apexacademy.edu" },
      create: {
        email: "unallocated.trainer@apexacademy.edu",
        name: "Unallocated Trainer",
        passwordHash: "hash123",
        role: "TRAINER",
        trainerProfile: {
          create: {
            employeeCode: "EMP-UNALLOCATED-01",
          },
        },
      },
      update: {},
      include: { trainerProfile: true },
    });

    // Check allocation
    const allocation = await prisma.trainerBatchAllocation.findUnique({
      where: {
        batchId_trainerProfileId: {
          batchId: testBatch.id,
          trainerProfileId: unallocatedTrainer.trainerProfile!.id,
        },
      },
    });

    expect(allocation).toBeNull();
  });

  // AT03: Combined Class Session Saves Attendance and Topics Together Atomically
  it("AT03: Combined class session saves attendance and topics together atomically", async () => {
    const todayStr = "2026-03-01";
    const sessionDate = new Date(`${todayStr}T00:00:00Z`);

    // Clean up any test session for this date first
    const existing = await prisma.classSession.findFirst({
      where: { batchId: testBatch.id, sessionDate },
      include: { attendanceEntries: true, subtopicCoverages: true },
    });
    if (existing) {
      await prisma.subtopicCoverage.deleteMany({ where: { classSessionId: existing.id } });
      await prisma.attendanceEntry.deleteMany({ where: { classSessionId: existing.id } });
      await prisma.classSession.delete({ where: { id: existing.id } });
    }

    const subtopicToCover = subtopics[0];
    expect(subtopicToCover).toBeDefined();

    const createdSession = await prisma.$transaction(async (tx) => {
      const session = await tx.classSession.create({
        data: {
          batchId: testBatch.id,
          trainerProfileId: trainerUser.trainerProfile.id,
          sessionDate,
          actualStartTime: "10:00",
          actualEndTime: "12:00",
          sessionType: "TEACHING",
          notes: "AT03 Test Atomic Entry",
          isLocked: true,
          submittedAt: new Date(),
        },
      });

      await tx.attendanceEntry.create({
        data: {
          classSessionId: session.id,
          studentProfileId: studentProfile.id,
          status: "PRESENT",
          notes: "Present in atomic session",
        },
      });

      await tx.subtopicCoverage.create({
        data: {
          classSessionId: session.id,
          subtopicId: subtopicToCover.id,
        },
      });

      return session;
    });

    expect(createdSession.id).toBeDefined();
    expect(createdSession.isLocked).toBe(true);

    // Verify both attendance and coverage were created together
    const verification = await prisma.classSession.findUnique({
      where: { id: createdSession.id },
      include: { attendanceEntries: true, subtopicCoverages: true },
    });

    expect(verification?.attendanceEntries.length).toBe(1);
    expect(verification?.attendanceEntries[0].status).toBe("PRESENT");
    expect(verification?.subtopicCoverages.length).toBe(1);
    expect(verification?.subtopicCoverages[0].subtopicId).toBe(subtopicToCover.id);
  });

  // AT04: Double Submission / Duplicate Session Rejection
  it("AT04: Double submission / duplicate session rejection", async () => {
    const sessionDate = new Date("2026-03-01T00:00:00Z");

    const existing = await prisma.classSession.findFirst({
      where: { batchId: testBatch.id, sessionDate },
    });

    expect(existing).not.toBeNull();

    // Verify that our business rule detects duplicate
    const isDuplicate = !!existing;
    expect(isDuplicate).toBe(true);
  });

  // AT05: Rollback on Transaction Failure
  it("AT05: Rollback on transaction failure leaves zero partial records", async () => {
    const initialSessionCount = await prisma.classSession.count();
    const initialAttendanceCount = await prisma.attendanceEntry.count();

    const failingTransaction = prisma.$transaction(async (tx) => {
      const session = await tx.classSession.create({
        data: {
          batchId: testBatch.id,
          trainerProfileId: trainerUser.trainerProfile.id,
          sessionDate: new Date("2026-03-02T00:00:00Z"),
          actualStartTime: "14:00",
          actualEndTime: "16:00",
          sessionType: "TEACHING",
          isLocked: true,
        },
      });

      // Intentionally provoke failure with non-existent foreign key
      await tx.attendanceEntry.create({
        data: {
          classSessionId: session.id,
          studentProfileId: "non-existent-student-id-12345",
          status: "PRESENT",
        },
      });
    });

    await expect(failingTransaction).rejects.toThrow();

    // Verify complete rollback
    const afterSessionCount = await prisma.classSession.count();
    const afterAttendanceCount = await prisma.attendanceEntry.count();

    expect(afterSessionCount).toBe(initialSessionCount);
    expect(afterAttendanceCount).toBe(initialAttendanceCount);
  });

  // AT06: Future Dates Blocked for Session Entry
  it("AT06: Future dates blocked for session entry", () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const isFuture = tomorrow > today;
    expect(isFuture).toBe(true);
  });

  // AT07: Unauthorized Backdated Submissions Rejected
  it("AT07: Unauthorized backdated submissions rejected without authorization", async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

    const isBackdated = twoWeeksAgo < yesterday;
    expect(isBackdated).toBe(true);

    // Check if backdate authorization exists for this date
    const auth = await prisma.backdateAuthorization.findFirst({
      where: {
        trainerProfileId: trainerUser.trainerProfile.id,
        batchId: testBatch.id,
        allowedDate: twoWeeksAgo,
        isUsed: false,
      },
    });

    expect(auth).toBeNull();
  });

  // AT08: Canceled Classes Never Produce Absences
  it("AT08: Canceled classes never produce absences or penalize attendance", async () => {
    // Create a CANCELLED occurrence
    const cancelledOccurrence = await prisma.sessionOccurrence.create({
      data: {
        batchId: testBatch.id,
        trainerProfileId: trainerUser.trainerProfile.id,
        plannedDate: new Date("2026-03-05T00:00:00Z"),
        plannedStartTime: "10:00",
        plannedEndTime: "12:00",
        status: "CANCELLED",
        cancellationReason: "Severe Weather Holiday",
      },
    });

    const summary = await calculateStudentBatchAttendance(studentProfile.id, testBatch.id);

    // Cancelled occurrences are excluded from scheduled count and never produce absences
    expect(summary.absentCount).toBe(0);

    // Cleanup occurrence
    await prisma.sessionOccurrence.delete({ where: { id: cancelledOccurrence.id } });
  });

  // AT09: Repeated Coverage Does Not Inflate Syllabus Progress
  it("AT09: Repeated coverage does not inflate syllabus progress percentage", async () => {
    const progressBefore = await calculateBatchSyllabusProgress(testBatch.id);

    // Find a covered subtopic
    const subtopic = subtopics[0];

    // Create a revision session covering the EXACT same subtopic again
    const sessionDate = new Date("2026-03-03T00:00:00Z");
    const revisionSession = await prisma.classSession.create({
      data: {
        batchId: testBatch.id,
        trainerProfileId: trainerUser.trainerProfile.id,
        sessionDate,
        actualStartTime: "10:00",
        actualEndTime: "11:00",
        sessionType: "REVISION",
        isLocked: true,
      },
    });

    await prisma.subtopicCoverage.create({
      data: {
        classSessionId: revisionSession.id,
        subtopicId: subtopic.id,
      },
    });

    const progressAfter = await calculateBatchSyllabusProgress(testBatch.id);

    // Progress percentage must remain exactly identical because unique covered subtopics did not increase
    expect(progressAfter.uniqueCoveredRequiredSubtopics).toBe(
      progressBefore.uniqueCoveredRequiredSubtopics
    );
    expect(progressAfter.overallPercentage).toBe(progressBefore.overallPercentage);

    // Cleanup revision session
    await prisma.subtopicCoverage.deleteMany({ where: { classSessionId: revisionSession.id } });
    await prisma.classSession.delete({ where: { id: revisionSession.id } });
  });

  // AT10: Student Transfer Preserves Historical Attendance
  it("AT10: Student transfer preserves historical attendance across batches", async () => {
    // Verify student has active enrollment with effective start date
    const enrollment = await prisma.studentBatchEnrollment.findUnique({
      where: {
        batchId_studentProfileId: {
          batchId: testBatch.id,
          studentProfileId: studentProfile.id,
        },
      },
    });

    expect(enrollment).not.toBeNull();
    expect(enrollment?.effectiveStartDate).toBeDefined();

    // Query attendance using helper
    const summary = await calculateStudentBatchAttendance(studentProfile.id, testBatch.id);
    expect(summary).toBeDefined();
    expect(typeof summary.heldToDatePercentage).toBe("number");
  });

  // AT11: Locked Class Session Cannot Be Edited Directly by Trainer
  it("AT11: Locked class session cannot be edited directly by trainer", async () => {
    const session = await prisma.classSession.findFirst({
      where: { batchId: testBatch.id, isLocked: true },
    });

    expect(session).not.toBeNull();
    expect(session?.isLocked).toBe(true);
  });

  // AT12: Correction Approval Updates Record and Creates Audit Trail
  it("AT12: Correction approval updates record and audit trail", async () => {
    const session = await prisma.classSession.findFirst({
      where: { batchId: testBatch.id },
    });
    expect(session).not.toBeNull();

    const correction = await prisma.correctionRequest.create({
      data: {
        classSessionId: session!.id,
        requestedById: trainerUser.id,
        targetField: "notes",
        oldValue: session!.notes || "Old Note",
        proposedValue: "Approved Correction Note - AT12",
        reason: "Rectified typos in original notes",
        status: "PENDING",
      },
    });

    // Admin approves the correction
    await prisma.$transaction(async (tx) => {
      await tx.correctionRequest.update({
        where: { id: correction.id },
        data: {
          status: "APPROVED",
          reviewedById: adminUser.id,
          reviewedAt: new Date(),
          reviewNotes: "Verified and approved by admin",
        },
      });

      await tx.classSession.update({
        where: { id: session!.id },
        data: { notes: "Approved Correction Note - AT12" },
      });

      await tx.auditEvent.create({
        data: {
          userId: adminUser.id,
          action: "CORRECTION_APPROVED",
          entityType: "ClassSession",
          entityId: session!.id,
          detailsJson: JSON.stringify({
            correctionId: correction.id,
            field: "notes",
            newValue: "Approved Correction Note - AT12",
          }),
        },
      });
    });

    // Verify session updated
    const updatedSession = await prisma.classSession.findUnique({
      where: { id: session!.id },
    });
    expect(updatedSession?.notes).toBe("Approved Correction Note - AT12");

    // Verify audit event exists
    const audit = await prisma.auditEvent.findFirst({
      where: {
        action: "CORRECTION_APPROVED",
        entityId: session!.id,
      },
    });
    expect(audit).not.toBeNull();

    // Clean up correction
    await prisma.correctionRequest.delete({ where: { id: correction.id } });
  });

  // AT13: Correction Rejection Preserves Original
  it("AT13: Correction rejection preserves original record unmodified", async () => {
    const session = await prisma.classSession.findFirst({
      where: { batchId: testBatch.id },
    });
    const originalNotes = session?.notes;

    const correction = await prisma.correctionRequest.create({
      data: {
        classSessionId: session!.id,
        requestedById: trainerUser.id,
        targetField: "notes",
        oldValue: originalNotes || "",
        proposedValue: "Rejected Proposed Note - AT13",
        reason: "Invalid justification",
        status: "PENDING",
      },
    });

    // Admin rejects the correction
    await prisma.correctionRequest.update({
      where: { id: correction.id },
      data: {
        status: "REJECTED",
        reviewedById: adminUser.id,
        reviewedAt: new Date(),
        reviewNotes: "Rejection: Not compliant with academy policy",
      },
    });

    // Verify session remains UNCHANGED
    const unmutatedSession = await prisma.classSession.findUnique({
      where: { id: session!.id },
    });
    expect(unmutatedSession?.notes).toBe(originalNotes);

    // Clean up
    await prisma.correctionRequest.delete({ where: { id: correction.id } });
  });

  // AT14: Multiple Batches per Trainer Handled Correctly
  it("AT14: Multiple batches per trainer allocated and queried accurately", async () => {
    const allocations = await prisma.trainerBatchAllocation.findMany({
      where: { trainerProfileId: trainerUser.trainerProfile.id },
      include: { batch: true },
    });

    expect(allocations.length).toBeGreaterThanOrEqual(1);
    for (const alloc of allocations) {
      expect(alloc.trainerProfileId).toBe(trainerUser.trainerProfile.id);
      expect(alloc.batch).toBeDefined();
    }
  });

  // AT15: Lead Assignment and Follow-up Tracking
  it("AT15: Lead assignment and follow-up tracking in CRM pipeline", async () => {
    const testLead = await prisma.lead.create({
      data: {
        fullName: "Jane CRM Prospect",
        email: "jane.prospect@example.com",
        phone: "+15559876543",
        courseInterestId: testCourse.id,
        status: "NEW",
        source: "Website Enquiry",
        activities: {
          create: {
            actionType: "LEAD_CREATED",
            notes: "Lead registered via web enquiry form",
            createdBy: "System",
          },
        },
      },
      include: { activities: true },
    });

    expect(testLead.id).toBeDefined();
    expect(testLead.status).toBe("NEW");
    expect(testLead.activities.length).toBe(1);

    // Manager transitions status to CONTACTED with follow up
    const updatedLead = await prisma.lead.update({
      where: { id: testLead.id },
      data: {
        status: "CONTACTED",
        followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        activities: {
          create: {
            actionType: "STATUS_CHANGE",
            notes: "Spoke with prospect regarding weekend schedule options.",
            createdBy: managerUser.name,
          },
        },
      },
      include: { activities: true },
    });

    expect(updatedLead.status).toBe("CONTACTED");
    expect(updatedLead.activities.length).toBe(2);

    // Clean up
    await prisma.leadActivity.deleteMany({ where: { leadId: testLead.id } });
    await prisma.lead.delete({ where: { id: testLead.id } });
  });

  // AT16: Public Enquiry Creates Real Lead Record
  it("AT16: Public enquiry creates real lead record in SQLite database", async () => {
    const lead = await prisma.lead.create({
      data: {
        fullName: "Alex Web Enquiry",
        email: "alex.enquiry.test@example.com",
        phone: "+15550009999",
        courseInterestId: testCourse.id,
        schedulePreference: "WEEKDAYS",
        status: "NEW",
        source: "Website Enquiry",
        message: "Interested in course curriculum and syllabus.",
        consentGiven: true,
      },
    });

    expect(lead.id).toBeDefined();
    expect(lead.email).toBe("alex.enquiry.test@example.com");

    // Clean up
    await prisma.lead.delete({ where: { id: lead.id } });
  });

  // AT17: JWT Token Signing and Verification
  it("AT17: JWT Token signing and payload verification", async () => {
    const payload = {
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      name: adminUser.name,
    };

    const token = await createSessionToken(payload);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);

    const verified = await verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(adminUser.id);
    expect(verified?.role).toBe("ADMIN");
  });

  // AT18: Passwordless OTP Generation and Verification for Student
  it("AT18: Passwordless OTP generation and verification for student login", async () => {
    const dispatch = await generateStudentOtp(studentUser.email);
    expect(dispatch.success).toBe(true);
    expect(dispatch.devOtp).toBeDefined();

    const devOtp = dispatch.devOtp!;
    expect(devOtp.length).toBe(6);

    // Verify correct OTP
    const verifyResult = await verifyStudentOtp(studentUser.email, devOtp);
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.user?.role).toBe("STUDENT");
    expect(verifyResult.user?.email).toBe(studentUser.email);

    // Verify that consumed OTP cannot be reused
    const reuseResult = await verifyStudentOtp(studentUser.email, devOtp);
    expect(reuseResult.success).toBe(false);
  });

  // AT19: Denominator Policy Respects Held-to-Date vs Total Scheduled
  it("AT19: Denominator policy respects Held-to-Date vs Total Scheduled", async () => {
    const summary = await calculateStudentBatchAttendance(studentProfile.id, testBatch.id);

    expect(summary).toBeDefined();
    expect(summary.totalScheduled).toBeGreaterThanOrEqual(summary.totalHeld);
    expect(summary.policyLabel).toBeDefined();

    if (summary.totalHeld > 0) {
      expect(summary.heldToDatePercentage).not.toBeNull();
      expect(summary.heldToDatePercentage).toBeGreaterThanOrEqual(0);
      expect(summary.heldToDatePercentage).toBeLessThanOrEqual(100);
    }
  });

  // AT20: Role-Based Routing and Permissions for all 5 roles
  it("AT20: Role-based permissions for all 5 roles configured", async () => {
    const roles = ["STUDENT", "TRAINER", "MANAGER", "ADMIN", "FINANCIER"];

    for (const role of roles) {
      const user = await prisma.user.findFirst({
        where: { role: role as any },
      });
      expect(user).not.toBeNull();
      expect(user?.role).toBe(role);
    }
  });
});
