// MOCK_DATA: Typed baseline financier seed dataset whose every rupee/paise figure is
// generated and strictly reconciled with double-entry journal postings (no invented values).
// In production with PostgreSQL + Prisma connected, these records come from database tables;
// when Prisma/DB is unavailable in local Vite/preview mode, this state backs /api/financier/*.

import { createBalancedJournalEntry } from "../../backend/services/financier/ledger.ts";
import { allocatePaymentPaiseOldestFirst, subtractPaise, sumPaise } from "../../backend/services/financier/money.ts";
import { calculateTrainerBatchPayrollPaise } from "../../backend/services/financier/payroll.ts";
import type {
  ActorIdentity,
  AuditLogRecord,
  BalancedJournalEntry,
  BatchRecord,
  DiscountRequestRecord,
  FinancierDatabaseState,
  FollowUpNoteRecord,
  HeldClassSessionRecord,
  InstallmentRecord,
  InvoiceRecord,
  NotificationDispatchRecord,
  PaymentMethod,
  PaymentRecord,
  PayrollAdjustmentRecord,
  PayrollRunRecord,
  RefundRecord,
  StudentFeeAccountRecord,
  TrackRecord,
  TrainerPayoutRecord,
  TrainerProfileMock,
} from "../../backend/services/financier/types.ts";

function isoDaysOffset(baseIso: string, deltaDays: number, hourUtc = 10): string {
  const base = new Date(baseIso);
  const utc = Date.UTC(
    base.getUTCFullYear(),
    base.getUTCMonth(),
    base.getUTCDate() + deltaDays,
    hourUtc,
    30,
    0,
    0
  );
  return new Date(utc).toISOString();
}

export function createInitialFinancierState(
  referenceNowIso = new Date().toISOString()
): FinancierDatabaseState {
  // Clamp "same month" helper so day offsets don't accidentally cross month start when tested on day 1-5
  const refDate = new Date(referenceNowIso);
  const utcDay = refDate.getUTCDate();
  const sameMonthPastDay = utcDay > 6 ? -4 : 0;
  const sameWeekPastDay = utcDay > 3 ? -2 : 0;

  // MOCK_DATA: Staff identities enforcing dual-control separation (requester != approver)
  const actors: ActorIdentity[] = [
    {
      id: "usr-financier",
      name: "Meera Nair",
      email: "financier@apexacademy.edu",
      role: "FINANCIER",
    },
    {
      id: "usr-admin",
      name: "Raghav Menon",
      email: "admin@apexacademy.edu",
      role: "ADMIN",
    },
    {
      id: "usr-analyst",
      name: "Siddharth Rao",
      email: "analyst.finance@apexacademy.edu",
      role: "FINANCIER",
    },
  ];

  // MOCK_DATA: Academy tracks & batches
  const tracks: TrackRecord[] = [
    { code: "PY-FS", title: "Python Full-Stack Engineering", defaultFeePaise: 9_000_000 }, // INR 90,000.00
    { code: "REACT-FE", title: "React Frontend Engineering", defaultFeePaise: 6_000_000 }, // INR 60,000.00
    { code: "DSA-SYS", title: "DSA & System Design Mastery", defaultFeePaise: 7_500_000 }, // INR 75,000.00
  ];

  const batches: BatchRecord[] = [
    {
      id: "batch-py-a",
      code: "BATCH-PY-2026-A",
      trackCode: "PY-FS",
      trackTitle: "Python Full-Stack Engineering",
      startDate: isoDaysOffset(referenceNowIso, -120),
      status: "ACTIVE",
    },
    {
      id: "batch-react-b",
      code: "BATCH-REACT-2026-B",
      trackCode: "REACT-FE",
      trackTitle: "React Frontend Engineering",
      startDate: isoDaysOffset(referenceNowIso, -80),
      status: "ACTIVE",
    },
    {
      id: "batch-dsa-c",
      code: "BATCH-DSA-2026-C",
      trackCode: "DSA-SYS",
      trackTitle: "DSA & System Design Mastery",
      startDate: isoDaysOffset(referenceNowIso, -45),
      status: "ACTIVE",
    },
  ];

  // MOCK_DATA: Faculty profiles with compensation policy (integer paise)
  const trainers: TrainerProfileMock[] = [
    {
      id: "trn-1",
      userId: "usr-trn-1",
      name: "Arjun Krishnan",
      email: "arjun.krishnan@apexacademy.edu",
      employeeCode: "FAC-101",
      policyType: "PER_SESSION",
      baseRatePaise: 350_000, // INR 3,500 per held locked session
    },
    {
      id: "trn-2",
      userId: "usr-trn-2",
      name: "Divya Subramanian",
      email: "divya.s@apexacademy.edu",
      employeeCode: "FAC-104",
      policyType: "PER_HOUR",
      baseRatePaise: 180_000, // INR 1,800 per verified instructional hour
    },
    {
      id: "trn-3",
      userId: "usr-trn-3",
      name: "Kiran Deshmukh",
      email: "kiran.d@apexacademy.edu",
      employeeCode: "FAC-109",
      policyType: "MONTHLY_SALARY",
      baseRatePaise: 6_500_000, // INR 65,000 monthly retainer allocated across held batches
    },
  ];

  // MOCK_DATA: Enrolled student fee accounts
  const students: StudentFeeAccountRecord[] = [
    {
      id: "stu-1",
      userId: "usr-stu-1",
      name: "Karthik Subramanian",
      email: "karthik.subramanian@apexacademy.edu",
      registrationNumber: "APX-2026-0101",
      batchId: "batch-py-a",
      batchCode: "BATCH-PY-2026-A",
      trackCode: "PY-FS",
      trackTitle: "Python Full-Stack Engineering",
      feeAgreementId: "fa-1",
      courseFeePaise: 9_000_000,
      approvedDiscountPaise: 0,
      netPayablePaise: 9_000_000,
      financialHold: false,
    },
    {
      id: "stu-2",
      userId: "usr-stu-2",
      name: "Sneha Patel",
      email: "sneha.patel@apexacademy.edu",
      registrationNumber: "APX-2026-0102",
      batchId: "batch-react-b",
      batchCode: "BATCH-REACT-2026-B",
      trackCode: "REACT-FE",
      trackTitle: "React Frontend Engineering",
      feeAgreementId: "fa-2",
      courseFeePaise: 6_000_000,
      approvedDiscountPaise: 600_000, // INR 6,000 merit scholarship approved
      netPayablePaise: 5_400_000,
      financialHold: false,
    },
    {
      id: "stu-3",
      userId: "usr-stu-3",
      name: "Aravind Kumar",
      email: "aravind.kumar@apexacademy.edu",
      registrationNumber: "APX-2026-0103",
      batchId: "batch-py-a",
      batchCode: "BATCH-PY-2026-A",
      trackCode: "PY-FS",
      trackTitle: "Python Full-Stack Engineering",
      feeAgreementId: "fa-3",
      courseFeePaise: 9_000_000,
      approvedDiscountPaise: 0,
      netPayablePaise: 9_000_000,
      financialHold: true,
    },
    {
      id: "stu-4",
      userId: "usr-stu-4",
      name: "Neha Verma",
      email: "neha.verma@apexacademy.edu",
      registrationNumber: "APX-2026-0104",
      batchId: "batch-dsa-c",
      batchCode: "BATCH-DSA-2026-C",
      trackCode: "DSA-SYS",
      trackTitle: "DSA & System Design Mastery",
      feeAgreementId: "fa-4",
      courseFeePaise: 7_500_000,
      approvedDiscountPaise: 0,
      netPayablePaise: 7_500_000,
      financialHold: false,
    },
    {
      id: "stu-5",
      userId: "usr-stu-5",
      name: "Rohan Iyer",
      email: "rohan.iyer@apexacademy.edu",
      registrationNumber: "APX-2026-0105",
      batchId: "batch-dsa-c",
      batchCode: "BATCH-DSA-2026-C",
      trackCode: "DSA-SYS",
      trackTitle: "DSA & System Design Mastery",
      feeAgreementId: "fa-5",
      courseFeePaise: 7_500_000,
      approvedDiscountPaise: 0,
      netPayablePaise: 7_500_000,
      financialHold: true,
    },
  ];

  // MOCK_DATA: Instalment schedules aligned to fee agreements
  const installments: InstallmentRecord[] = [
    // stu-1 (Total 90,000: 3x 30,000)
    {
      id: "inst-1-1",
      feeAgreementId: "fa-1",
      studentProfileId: "stu-1",
      installmentNumber: 1,
      dueDate: isoDaysOffset(referenceNowIso, -45),
      amountDuePaise: 3_000_000,
      amountPaidPaise: 0,
      remainingBalancePaise: 3_000_000,
      status: "UPCOMING",
      lastPaymentDate: null,
    },
    {
      id: "inst-1-2",
      feeAgreementId: "fa-1",
      studentProfileId: "stu-1",
      installmentNumber: 2,
      dueDate: isoDaysOffset(referenceNowIso, -14), // 14 days overdue if unpaid -> 0-30 bucket
      amountDuePaise: 3_000_000,
      amountPaidPaise: 0,
      remainingBalancePaise: 3_000_000,
      status: "OVERDUE",
      lastPaymentDate: null,
    },
    {
      id: "inst-1-3",
      feeAgreementId: "fa-1",
      studentProfileId: "stu-1",
      installmentNumber: 3,
      dueDate: isoDaysOffset(referenceNowIso, +21),
      amountDuePaise: 3_000_000,
      amountPaidPaise: 0,
      remainingBalancePaise: 3_000_000,
      status: "UPCOMING",
      lastPaymentDate: null,
    },

    // stu-2 (Course 60,000 - 6,000 discount = 54,000 in 2x 27,000)
    {
      id: "inst-2-1",
      feeAgreementId: "fa-2",
      studentProfileId: "stu-2",
      installmentNumber: 1,
      dueDate: isoDaysOffset(referenceNowIso, -20),
      amountDuePaise: 2_700_000,
      amountPaidPaise: 0,
      remainingBalancePaise: 2_700_000,
      status: "UPCOMING",
      lastPaymentDate: null,
    },
    {
      id: "inst-2-2",
      feeAgreementId: "fa-2",
      studentProfileId: "stu-2",
      installmentNumber: 2,
      dueDate: isoDaysOffset(referenceNowIso, +10),
      amountDuePaise: 2_700_000,
      amountPaidPaise: 0,
      remainingBalancePaise: 2_700_000,
      status: "UPCOMING",
      lastPaymentDate: null,
    },

    // stu-3 (Total 90,000: 2x 45,000; Inst 1 paid, Inst 2 due 42 days ago -> 31-60 bucket!)
    {
      id: "inst-3-1",
      feeAgreementId: "fa-3",
      studentProfileId: "stu-3",
      installmentNumber: 1,
      dueDate: isoDaysOffset(referenceNowIso, -75),
      amountDuePaise: 4_500_000,
      amountPaidPaise: 0,
      remainingBalancePaise: 4_500_000,
      status: "UPCOMING",
      lastPaymentDate: null,
    },
    {
      id: "inst-3-2",
      feeAgreementId: "fa-3",
      studentProfileId: "stu-3",
      installmentNumber: 2,
      dueDate: isoDaysOffset(referenceNowIso, -42),
      amountDuePaise: 4_500_000,
      amountPaidPaise: 0,
      remainingBalancePaise: 4_500_000,
      status: "OVERDUE",
      lastPaymentDate: null,
    },

    // stu-4 (Total 75,000: 2x 37,500; Inst 1 paid, Inst 2 due 74 days ago -> 61-90 bucket!)
    {
      id: "inst-4-1",
      feeAgreementId: "fa-4",
      studentProfileId: "stu-4",
      installmentNumber: 1,
      dueDate: isoDaysOffset(referenceNowIso, -95),
      amountDuePaise: 3_750_000,
      amountPaidPaise: 0,
      remainingBalancePaise: 3_750_000,
      status: "UPCOMING",
      lastPaymentDate: null,
    },
    {
      id: "inst-4-2",
      feeAgreementId: "fa-4",
      studentProfileId: "stu-4",
      installmentNumber: 2,
      dueDate: isoDaysOffset(referenceNowIso, -74),
      amountDuePaise: 3_750_000,
      amountPaidPaise: 0,
      remainingBalancePaise: 3_750_000,
      status: "OVERDUE",
      lastPaymentDate: null,
    },

    // stu-5 (Total 75,000: single invoice due 108 days ago -> 90+ bucket!)
    {
      id: "inst-5-1",
      feeAgreementId: "fa-5",
      studentProfileId: "stu-5",
      installmentNumber: 1,
      dueDate: isoDaysOffset(referenceNowIso, -108),
      amountDuePaise: 7_500_000,
      amountPaidPaise: 0,
      remainingBalancePaise: 7_500_000,
      status: "OVERDUE",
      lastPaymentDate: null,
    },
  ];

  // MOCK_DATA: Invoices covering all statuses (PAID, SENT, OVERDUE, DRAFT, VOID) & all ageing buckets
  const invoices: InvoiceRecord[] = [
    {
      id: "inv-1",
      invoiceNumber: "INV-2026-0001",
      studentProfileId: "stu-1",
      studentName: "Karthik Subramanian",
      studentEmail: "karthik.subramanian@apexacademy.edu",
      registrationNumber: "APX-2026-0101",
      batchId: "batch-py-a",
      batchCode: "BATCH-PY-2026-A",
      trackCode: "PY-FS",
      trackTitle: "Python Full-Stack Engineering",
      feeAgreementId: "fa-1",
      issueDate: isoDaysOffset(referenceNowIso, -55),
      dueDate: isoDaysOffset(referenceNowIso, -45),
      grossAmountPaise: 3_000_000,
      discountAmountPaise: 0,
      taxAmountPaise: 0,
      netTotalPaise: 3_000_000,
      paidAmountPaise: 0,
      currency: "INR",
      status: "SENT",
      notes: "Instalment 1 of 3 — Python Full-Stack",
      sentAt: isoDaysOffset(referenceNowIso, -54),
      voidedAt: null,
      voidReason: null,
      createdById: "usr-financier",
      lines: [
        {
          id: "invl-1",
          description: "Python Full-Stack — Instalment 1 Tuition",
          quantity: 1,
          unitPricePaise: 3_000_000,
          totalPaise: 3_000_000,
        },
      ],
    },
    {
      id: "inv-2",
      invoiceNumber: "INV-2026-0002",
      studentProfileId: "stu-1",
      studentName: "Karthik Subramanian",
      studentEmail: "karthik.subramanian@apexacademy.edu",
      registrationNumber: "APX-2026-0101",
      batchId: "batch-py-a",
      batchCode: "BATCH-PY-2026-A",
      trackCode: "PY-FS",
      trackTitle: "Python Full-Stack Engineering",
      feeAgreementId: "fa-1",
      issueDate: isoDaysOffset(referenceNowIso, -28),
      dueDate: isoDaysOffset(referenceNowIso, -14), // 14 days overdue -> 0-30 bucket
      grossAmountPaise: 3_000_000,
      discountAmountPaise: 0,
      taxAmountPaise: 0,
      netTotalPaise: 3_000_000,
      paidAmountPaise: 0,
      currency: "INR",
      status: "OVERDUE",
      notes: "Instalment 2 of 3 — Python Full-Stack",
      sentAt: isoDaysOffset(referenceNowIso, -27),
      voidedAt: null,
      voidReason: null,
      createdById: "usr-financier",
      lines: [
        {
          id: "invl-2",
          description: "Python Full-Stack — Instalment 2 Tuition",
          quantity: 1,
          unitPricePaise: 3_000_000,
          totalPaise: 3_000_000,
        },
      ],
    },
    {
      id: "inv-3",
      invoiceNumber: "INV-2026-0003",
      studentProfileId: "stu-2",
      studentName: "Sneha Patel",
      studentEmail: "sneha.patel@apexacademy.edu",
      registrationNumber: "APX-2026-0102",
      batchId: "batch-react-b",
      batchCode: "BATCH-REACT-2026-B",
      trackCode: "REACT-FE",
      trackTitle: "React Frontend Engineering",
      feeAgreementId: "fa-2",
      issueDate: isoDaysOffset(referenceNowIso, -35),
      dueDate: isoDaysOffset(referenceNowIso, -20),
      grossAmountPaise: 6_000_000,
      discountAmountPaise: 600_000,
      taxAmountPaise: 0,
      netTotalPaise: 5_400_000,
      paidAmountPaise: 0,
      currency: "INR",
      status: "SENT",
      notes: "Full React Frontend tuition less 10% merit scholarship",
      sentAt: isoDaysOffset(referenceNowIso, -34),
      voidedAt: null,
      voidReason: null,
      createdById: "usr-financier",
      lines: [
        {
          id: "invl-3",
          description: "React Frontend Engineering Programme Fee",
          quantity: 1,
          unitPricePaise: 6_000_000,
          totalPaise: 6_000_000,
        },
      ],
    },
    {
      id: "inv-4",
      invoiceNumber: "INV-2026-0004",
      studentProfileId: "stu-3",
      studentName: "Aravind Kumar",
      studentEmail: "aravind.kumar@apexacademy.edu",
      registrationNumber: "APX-2026-0103",
      batchId: "batch-py-a",
      batchCode: "BATCH-PY-2026-A",
      trackCode: "PY-FS",
      trackTitle: "Python Full-Stack Engineering",
      feeAgreementId: "fa-3",
      issueDate: isoDaysOffset(referenceNowIso, -60),
      dueDate: isoDaysOffset(referenceNowIso, -42), // 42 days overdue -> 31-60 bucket
      grossAmountPaise: 9_000_000,
      discountAmountPaise: 0,
      taxAmountPaise: 0,
      netTotalPaise: 9_000_000,
      paidAmountPaise: 0,
      currency: "INR",
      status: "OVERDUE",
      notes: "Python Full-Stack Agreement fa-3",
      sentAt: isoDaysOffset(referenceNowIso, -59),
      voidedAt: null,
      voidReason: null,
      createdById: "usr-financier",
      lines: [
        {
          id: "invl-4",
          description: "Python Full-Stack Complete Programme",
          quantity: 1,
          unitPricePaise: 9_000_000,
          totalPaise: 9_000_000,
        },
      ],
    },
    {
      id: "inv-5",
      invoiceNumber: "INV-2026-0005",
      studentProfileId: "stu-4",
      studentName: "Neha Verma",
      studentEmail: "neha.verma@apexacademy.edu",
      registrationNumber: "APX-2026-0104",
      batchId: "batch-dsa-c",
      batchCode: "BATCH-DSA-2026-C",
      trackCode: "DSA-SYS",
      trackTitle: "DSA & System Design Mastery",
      feeAgreementId: "fa-4",
      issueDate: isoDaysOffset(referenceNowIso, -88),
      dueDate: isoDaysOffset(referenceNowIso, -74), // 74 days overdue -> 61-90 bucket
      grossAmountPaise: 7_500_000,
      discountAmountPaise: 0,
      taxAmountPaise: 0,
      netTotalPaise: 7_500_000,
      paidAmountPaise: 0,
      currency: "INR",
      status: "OVERDUE",
      notes: "DSA & System Design Full Tuition",
      sentAt: isoDaysOffset(referenceNowIso, -86),
      voidedAt: null,
      voidReason: null,
      createdById: "usr-financier",
      lines: [
        {
          id: "invl-5",
          description: "DSA & System Design Tuition Fee",
          quantity: 1,
          unitPricePaise: 7_500_000,
          totalPaise: 7_500_000,
        },
      ],
    },
    {
      id: "inv-6",
      invoiceNumber: "INV-2026-0006",
      studentProfileId: "stu-5",
      studentName: "Rohan Iyer",
      studentEmail: "rohan.iyer@apexacademy.edu",
      registrationNumber: "APX-2026-0105",
      batchId: "batch-dsa-c",
      batchCode: "BATCH-DSA-2026-C",
      trackCode: "DSA-SYS",
      trackTitle: "DSA & System Design Mastery",
      feeAgreementId: "fa-5",
      issueDate: isoDaysOffset(referenceNowIso, -120),
      dueDate: isoDaysOffset(referenceNowIso, -108), // 108 days overdue -> 90+ bucket
      grossAmountPaise: 7_500_000,
      discountAmountPaise: 0,
      taxAmountPaise: 0,
      netTotalPaise: 7_500_000,
      paidAmountPaise: 0,
      currency: "INR",
      status: "OVERDUE",
      notes: "Overdue tuition requiring immediate collections follow-up",
      sentAt: isoDaysOffset(referenceNowIso, -118),
      voidedAt: null,
      voidReason: null,
      createdById: "usr-financier",
      lines: [
        {
          id: "invl-6",
          description: "DSA & System Design Tuition Fee",
          quantity: 1,
          unitPricePaise: 7_500_000,
          totalPaise: 7_500_000,
        },
      ],
    },
    {
      id: "inv-7",
      invoiceNumber: "INV-2026-0007",
      studentProfileId: "stu-1",
      studentName: "Karthik Subramanian",
      studentEmail: "karthik.subramanian@apexacademy.edu",
      registrationNumber: "APX-2026-0101",
      batchId: "batch-py-a",
      batchCode: "BATCH-PY-2026-A",
      trackCode: "PY-FS",
      trackTitle: "Python Full-Stack Engineering",
      feeAgreementId: "fa-1",
      issueDate: referenceNowIso,
      dueDate: isoDaysOffset(referenceNowIso, +21),
      grossAmountPaise: 3_000_000,
      discountAmountPaise: 0,
      taxAmountPaise: 0,
      netTotalPaise: 3_000_000,
      paidAmountPaise: 0,
      currency: "INR",
      status: "DRAFT",
      notes: "Upcoming final instalment 3 draft awaiting send approval",
      sentAt: null,
      voidedAt: null,
      voidReason: null,
      createdById: "usr-financier",
      lines: [
        {
          id: "invl-7",
          description: "Python Full-Stack — Instalment 3 Tuition",
          quantity: 1,
          unitPricePaise: 3_000_000,
          totalPaise: 3_000_000,
        },
      ],
    },
    {
      id: "inv-8",
      invoiceNumber: "INV-2026-0008",
      studentProfileId: "stu-2",
      studentName: "Sneha Patel",
      studentEmail: "sneha.patel@apexacademy.edu",
      registrationNumber: "APX-2026-0102",
      batchId: "batch-react-b",
      batchCode: "BATCH-REACT-2026-B",
      trackCode: "REACT-FE",
      trackTitle: "React Frontend Engineering",
      feeAgreementId: "fa-2",
      issueDate: isoDaysOffset(referenceNowIso, -40),
      dueDate: isoDaysOffset(referenceNowIso, -25),
      grossAmountPaise: 6_000_000,
      discountAmountPaise: 0,
      taxAmountPaise: 0,
      netTotalPaise: 6_000_000,
      paidAmountPaise: 0,
      currency: "INR",
      status: "VOID",
      notes: "Superseded by scholarship-adjusted invoice INV-2026-0003",
      sentAt: isoDaysOffset(referenceNowIso, -40),
      voidedAt: isoDaysOffset(referenceNowIso, -35),
      voidReason: "Replaced with INV-2026-0003 after scholarship award approval",
      createdById: "usr-financier",
      lines: [
        {
          id: "invl-8",
          description: "React Frontend Engineering Programme Fee (Original)",
          quantity: 1,
          unitPricePaise: 6_000_000,
          totalPaise: 6_000_000,
        },
      ],
    },
  ];

  const journalEntries: BalancedJournalEntry[] = [];
  let ledSeq = 1;
  const nextLed = () => {
    const idx = ledSeq++;
    return {
      id: `je-${String(idx).padStart(4, "0")}`,
      entryNumber: `JE-2026-${String(idx).padStart(4, "0")}`,
    };
  };

  // Post double-entry CHARGE entries for every non-DRAFT invoice, plus REVERSAL for VOID invoice inv-8!
  for (const inv of invoices) {
    if (inv.status === "DRAFT") continue;
    const ref = nextLed();
    const lines = [
      {
        accountCode: "STUDENT_RECEIVABLES" as const,
        direction: "DEBIT" as const,
        amountPaise: inv.grossAmountPaise,
        notes: `Tuition charge billed via ${inv.invoiceNumber}`,
      },
      {
        accountCode: "REVENUE" as const,
        direction: "CREDIT" as const,
        amountPaise: inv.grossAmountPaise,
        notes: `Tuition revenue recognized via ${inv.invoiceNumber}`,
      },
    ];
    journalEntries.push(
      createBalancedJournalEntry({
        ...ref,
        entryDate: inv.issueDate,
        transactionType: "CHARGE",
        referenceType: "Invoice",
        referenceId: inv.id,
        studentProfileId: inv.studentProfileId,
        batchId: inv.batchId,
        trackCode: inv.trackCode,
        notes: `Invoice ${inv.invoiceNumber} issued`,
        createdById: inv.createdById,
        lines,
      })
    );

    if (inv.discountAmountPaise > 0) {
      const discRef = nextLed();
      journalEntries.push(
        createBalancedJournalEntry({
          ...discRef,
          entryDate: inv.issueDate,
          transactionType: "DISCOUNT",
          referenceType: "Invoice",
          referenceId: inv.id,
          studentProfileId: inv.studentProfileId,
          batchId: inv.batchId,
          trackCode: inv.trackCode,
          notes: `Approved scholarship applied on ${inv.invoiceNumber}`,
          createdById: "usr-admin",
          lines: [
            {
              accountCode: "FEE_DISCOUNT",
              direction: "DEBIT",
              amountPaise: inv.discountAmountPaise,
            },
            {
              accountCode: "STUDENT_RECEIVABLES",
              direction: "CREDIT",
              amountPaise: inv.discountAmountPaise,
            },
          ],
        })
      );
    }

    if (inv.status === "VOID" && inv.voidedAt) {
      const revRef = nextLed();
      journalEntries.push(
        createBalancedJournalEntry({
          ...revRef,
          entryDate: inv.voidedAt,
          transactionType: "REVERSAL",
          referenceType: "Invoice",
          referenceId: inv.id,
          studentProfileId: inv.studentProfileId,
          batchId: inv.batchId,
          trackCode: inv.trackCode,
          notes: `Void counter-entry for ${inv.invoiceNumber}: ${inv.voidReason}`,
          createdById: "usr-financier",
          reversesEntryId: ref.id,
          lines: [
            {
              accountCode: "REVENUE",
              direction: "DEBIT",
              amountPaise: inv.grossAmountPaise,
            },
            {
              accountCode: "STUDENT_RECEIVABLES",
              direction: "CREDIT",
              amountPaise: inv.grossAmountPaise,
            },
          ],
        })
      );
      const orig = journalEntries.find((e) => e.id === ref.id);
      if (orig) orig.reversedByEntryId = revRef.id;
    }
  }

  // Record payments deterministically using oldest-first instalment allocation
  const paymentSeeds: Array<{
    id: string;
    transactionNumber: string;
    receiptNumber: string;
    studentProfileId: string;
    invoiceId: string;
    amountPaise: number;
    paymentMethod: PaymentMethod;
    paymentDate: string;
    externalReference: string;
    notes: string;
  }> = [
    {
      id: "pay-1",
      transactionNumber: "TXN-2026-9021",
      receiptNumber: "RCP-2026-9021",
      studentProfileId: "stu-1",
      invoiceId: "inv-1",
      amountPaise: 3_000_000, // INR 30,000 paid today via UPI -> pays off inst-1-1 & inv-1 completely
      paymentMethod: "UPI",
      paymentDate: referenceNowIso,
      externalReference: "UTR-UPI-661904412",
      notes: "UPI payment for Python Full-Stack Instalment 1",
    },
    {
      id: "pay-2",
      transactionNumber: "TXN-2026-9022",
      receiptNumber: "RCP-2026-9022",
      studentProfileId: "stu-2",
      invoiceId: "inv-3",
      amountPaise: 5_400_000, // INR 54,000 paid this week via NEFT -> pays off stu-2 & inv-3 completely
      paymentMethod: "BANK_TRANSFER",
      paymentDate: isoDaysOffset(referenceNowIso, sameWeekPastDay, 9),
      externalReference: "NEFT-HDFC-9920182",
      notes: "Full scholarship-adjusted settlement via NEFT",
    },
    {
      id: "pay-3",
      transactionNumber: "TXN-2026-9023",
      receiptNumber: "RCP-2026-9023",
      studentProfileId: "stu-3",
      invoiceId: "inv-4",
      amountPaise: 4_500_000, // INR 45,000 paid this month via CARD -> pays inst-3-1, leaving inst-3-2 overdue
      paymentMethod: "CARD",
      paymentDate: isoDaysOffset(referenceNowIso, sameMonthPastDay, 11),
      externalReference: "CARD-AUTH-551829",
      notes: "Credit card EMI partial payment for Instalment 1",
    },
    {
      id: "pay-4",
      transactionNumber: "TXN-2026-9024",
      receiptNumber: "RCP-2026-9024",
      studentProfileId: "stu-4",
      invoiceId: "inv-5",
      amountPaise: 3_750_000, // INR 37,500 paid 92 days ago via CASH -> pays inst-4-1, leaving inst-4-2 overdue 74d
      paymentMethod: "CASH",
      paymentDate: isoDaysOffset(referenceNowIso, -92, 12),
      externalReference: "CSH-VCH-2026-088",
      notes: "Cash counter deposit receipt verified",
    },
    {
      id: "pay-5",
      transactionNumber: "TXN-2026-9025",
      receiptNumber: "RCP-2026-9025",
      studentProfileId: "stu-5",
      invoiceId: "inv-6",
      amountPaise: 1_500_000, // INR 15,000 paid 115 days ago via BANK_TRANSFER, leaving 60,000 overdue 108d
      paymentMethod: "BANK_TRANSFER",
      paymentDate: isoDaysOffset(referenceNowIso, -115, 11),
      externalReference: "IMPS-ICICI-330192",
      notes: "Initial booking remittance by NEFT/IMPS",
    },
  ];

  const payments: PaymentRecord[] = [];
  for (const seed of paymentSeeds) {
    const stu = students.find((s) => s.id === seed.studentProfileId)!;
    const inv = invoices.find((i) => i.id === seed.invoiceId)!;
    const stuInsts = installments.filter((inst) => inst.studentProfileId === stu.id);
    const allocs = allocatePaymentPaiseOldestFirst(seed.amountPaise, stuInsts);

    const allocRecords = allocs.map((a, idx) => {
      const target = stuInsts.find((x) => x.id === a.installmentId)!;
      target.amountPaidPaise += a.allocatedPaise;
      target.remainingBalancePaise = a.newRemainingBalancePaise;
      target.lastPaymentDate = seed.paymentDate;
      target.status = a.newRemainingBalancePaise === 0 ? "PAID" : "PARTIALLY_PAID";
      return {
        id: `alloc-${seed.id}-${idx + 1}`,
        paymentId: seed.id,
        installmentId: a.installmentId,
        installmentNumber: a.installmentNumber,
        dueDate: a.dueDate,
        allocatedPaise: a.allocatedPaise,
      };
    });

    inv.paidAmountPaise += seed.amountPaise;
    if (inv.paidAmountPaise >= inv.netTotalPaise) {
      inv.status = "PAID";
    }

    const totalRemainingAfter = sumPaise(
      stuInsts.map((i) => i.remainingBalancePaise),
      `${stu.id}.remainingAfter`
    );

    payments.push({
      id: seed.id,
      transactionNumber: seed.transactionNumber,
      receiptNumber: seed.receiptNumber,
      studentProfileId: stu.id,
      studentName: stu.name,
      studentEmail: stu.email,
      registrationNumber: stu.registrationNumber,
      feeAgreementId: stu.feeAgreementId,
      invoiceId: inv.id,
      batchId: stu.batchId,
      batchCode: stu.batchCode,
      trackCode: stu.trackCode,
      trackTitle: stu.trackTitle,
      amountPaise: seed.amountPaise,
      refundedPaise: 0,
      currency: "INR",
      paymentMethod: seed.paymentMethod,
      paymentDate: seed.paymentDate,
      externalReference: seed.externalReference,
      verificationStatus: "CONFIRMED",
      collectedById: "usr-financier",
      notes: seed.notes,
      allocations: allocRecords,
      balanceRemainingAfterPaise: totalRemainingAfter,
    });

    const payLedRef = nextLed();
    const debitAccount =
      seed.paymentMethod === "CASH"
        ? "CASH"
        : seed.paymentMethod === "BANK_TRANSFER"
          ? "BANK"
          : "PAYMENT_GATEWAY";
    journalEntries.push(
      createBalancedJournalEntry({
        ...payLedRef,
        entryDate: seed.paymentDate,
        transactionType: "PAYMENT",
        referenceType: "StudentPayment",
        referenceId: seed.id,
        studentProfileId: stu.id,
        batchId: stu.batchId,
        trackCode: stu.trackCode,
        notes: `${seed.paymentMethod} receipt ${seed.receiptNumber} (${seed.externalReference})`,
        createdById: "usr-financier",
        lines: [
          {
            accountCode: debitAccount,
            direction: "DEBIT",
            amountPaise: seed.amountPaise,
          },
          {
            accountCode: "STUDENT_RECEIVABLES",
            direction: "CREDIT",
            amountPaise: seed.amountPaise,
          },
        ],
      })
    );
  }

  // MOCK_DATA: Discount / scholarship records (approved + pending)
  const discounts: DiscountRequestRecord[] = [
    {
      id: "disc-1",
      studentProfileId: "stu-2",
      studentName: "Sneha Patel",
      feeAgreementId: "fa-2",
      invoiceId: "inv-3",
      kind: "PERCENTAGE",
      basisPoints: 1000,
      amountPaise: 600_000,
      reason: "Merit scholarship tier (top 5% entrance assessment score)",
      status: "APPROVED",
      requestedById: "usr-analyst",
      requestedByName: "Siddharth Rao",
      requestedAt: isoDaysOffset(referenceNowIso, -36),
      approvedById: "usr-admin",
      approvedByName: "Raghav Menon",
      decidedAt: isoDaysOffset(referenceNowIso, -35),
      decisionNotes: "Academic evaluation rank verified against admissions dossier.",
    },
    {
      id: "disc-2",
      studentProfileId: "stu-3",
      studentName: "Aravind Kumar",
      feeAgreementId: "fa-3",
      invoiceId: "inv-4",
      kind: "FIXED",
      basisPoints: null,
      amountPaise: 500_000, // INR 5,000 pending scholarship request
      reason: "Alumni referral & single-settlement waiver request",
      status: "PENDING",
      requestedById: "usr-analyst",
      requestedByName: "Siddharth Rao",
      requestedAt: isoDaysOffset(referenceNowIso, -3),
      approvedById: null,
      approvedByName: null,
      decidedAt: null,
      decisionNotes: null,
    },
  ];

  // MOCK_DATA: Refund records (one pending requested by analyst so financier can approve under dual control)
  const refunds: RefundRecord[] = [
    {
      id: "ref-1",
      paymentId: "pay-4",
      paymentReference: "CSH-VCH-2026-088",
      studentProfileId: "stu-4",
      studentName: "Neha Verma",
      batchCode: "BATCH-DSA-2026-C",
      amountPaise: 250_000, // INR 2,500
      refundMethod: "BANK_TRANSFER",
      reason: "Lab kit deposit adjustment requested by student",
      status: "REQUESTED",
      requestedById: "usr-analyst",
      requestedByName: "Siddharth Rao",
      requestedAt: isoDaysOffset(referenceNowIso, -2),
      approvedById: null,
      approvedByName: null,
      approvedAt: null,
      executedById: null,
      executedAt: null,
      externalReference: null,
      ledgerEntryId: null,
    },
  ];

  // MOCK_DATA: Faculty held sessions (with explicitly cancelled sessions that payroll excludes)
  const currentPeriodStart = isoDaysOffset(referenceNowIso, -30);
  const currentPeriodEnd = referenceNowIso;
  const prevPeriodStart = isoDaysOffset(referenceNowIso, -60);
  const prevPeriodEnd = isoDaysOffset(referenceNowIso, -31);

  const sessions: HeldClassSessionRecord[] = [
    // Previous cycle held sessions (for PAID run)
    {
      id: "ses-p1",
      trainerProfileId: "trn-1",
      batchId: "batch-py-a",
      batchCode: "BATCH-PY-2026-A",
      trackCode: "PY-FS",
      trackTitle: "Python Full-Stack Engineering",
      sessionDate: isoDaysOffset(referenceNowIso, -52),
      durationMinutes: 120,
      sessionType: "LECTURE",
      status: "HELD",
      isLocked: true,
    },
    {
      id: "ses-p2",
      trainerProfileId: "trn-1",
      batchId: "batch-py-a",
      batchCode: "BATCH-PY-2026-A",
      trackCode: "PY-FS",
      trackTitle: "Python Full-Stack Engineering",
      sessionDate: isoDaysOffset(referenceNowIso, -48),
      durationMinutes: 120,
      sessionType: "LECTURE",
      status: "HELD",
      isLocked: true,
    },
    {
      id: "ses-p3",
      trainerProfileId: "trn-1",
      batchId: "batch-py-a",
      batchCode: "BATCH-PY-2026-A",
      trackCode: "PY-FS",
      trackTitle: "Python Full-Stack Engineering",
      sessionDate: isoDaysOffset(referenceNowIso, -45),
      durationMinutes: 120,
      sessionType: "LECTURE",
      status: "CANCELLED", // Must NEVER be compensated
      isLocked: true,
    },
    {
      id: "ses-p4",
      trainerProfileId: "trn-2",
      batchId: "batch-react-b",
      batchCode: "BATCH-REACT-2026-B",
      trackCode: "REACT-FE",
      trackTitle: "React Frontend Engineering",
      sessionDate: isoDaysOffset(referenceNowIso, -44),
      durationMinutes: 180,
      sessionType: "WORKSHOP",
      status: "HELD",
      isLocked: true,
    },
    {
      id: "ses-p5",
      trainerProfileId: "trn-3",
      batchId: "batch-dsa-c",
      batchCode: "BATCH-DSA-2026-C",
      trackCode: "DSA-SYS",
      trackTitle: "DSA & System Design Mastery",
      sessionDate: isoDaysOffset(referenceNowIso, -40),
      durationMinutes: 120,
      sessionType: "MENTORING",
      status: "HELD",
      isLocked: true,
    },

    // Current cycle held & cancelled sessions (for REVIEW / active run)
    {
      id: "ses-c1",
      trainerProfileId: "trn-1",
      batchId: "batch-py-a",
      batchCode: "BATCH-PY-2026-A",
      trackCode: "PY-FS",
      trackTitle: "Python Full-Stack Engineering",
      sessionDate: isoDaysOffset(referenceNowIso, -18),
      durationMinutes: 120,
      sessionType: "LECTURE",
      status: "HELD",
      isLocked: true,
    },
    {
      id: "ses-c2",
      trainerProfileId: "trn-1",
      batchId: "batch-py-a",
      batchCode: "BATCH-PY-2026-A",
      trackCode: "PY-FS",
      trackTitle: "Python Full-Stack Engineering",
      sessionDate: isoDaysOffset(referenceNowIso, -12),
      durationMinutes: 120,
      sessionType: "LECTURE",
      status: "HELD",
      isLocked: true,
    },
    {
      id: "ses-c3",
      trainerProfileId: "trn-1",
      batchId: "batch-dsa-c",
      batchCode: "BATCH-DSA-2026-C",
      trackCode: "DSA-SYS",
      trackTitle: "DSA & System Design Mastery",
      sessionDate: isoDaysOffset(referenceNowIso, -9),
      durationMinutes: 120,
      sessionType: "LECTURE",
      status: "HELD",
      isLocked: true,
    },
    {
      id: "ses-c4",
      trainerProfileId: "trn-1",
      batchId: "batch-py-a",
      batchCode: "BATCH-PY-2026-A",
      trackCode: "PY-FS",
      trackTitle: "Python Full-Stack Engineering",
      sessionDate: isoDaysOffset(referenceNowIso, -7),
      durationMinutes: 120,
      sessionType: "LECTURE",
      status: "CANCELLED",
      isLocked: true,
    },
    {
      id: "ses-c5",
      trainerProfileId: "trn-2",
      batchId: "batch-react-b",
      batchCode: "BATCH-REACT-2026-B",
      trackCode: "REACT-FE",
      trackTitle: "React Frontend Engineering",
      sessionDate: isoDaysOffset(referenceNowIso, -10),
      durationMinutes: 150,
      sessionType: "WORKSHOP",
      status: "HELD",
      isLocked: true,
    },
    {
      id: "ses-c6",
      trainerProfileId: "trn-2",
      batchId: "batch-react-b",
      batchCode: "BATCH-REACT-2026-B",
      trackCode: "REACT-FE",
      trackTitle: "React Frontend Engineering",
      sessionDate: isoDaysOffset(referenceNowIso, -5),
      durationMinutes: 150,
      sessionType: "CODE_REVIEW",
      status: "HELD",
      isLocked: true,
    },
    {
      id: "ses-c7",
      trainerProfileId: "trn-3",
      batchId: "batch-dsa-c",
      batchCode: "BATCH-DSA-2026-C",
      trackCode: "DSA-SYS",
      trackTitle: "DSA & System Design Mastery",
      sessionDate: isoDaysOffset(referenceNowIso, -11),
      durationMinutes: 180,
      sessionType: "MENTORING",
      status: "HELD",
      isLocked: true,
    },
    {
      id: "ses-c8",
      trainerProfileId: "trn-3",
      batchId: "batch-py-a",
      batchCode: "BATCH-PY-2026-A",
      trackCode: "PY-FS",
      trackTitle: "Python Full-Stack Engineering",
      sessionDate: isoDaysOffset(referenceNowIso, -4),
      durationMinutes: 90,
      sessionType: "SYSTEM_DESIGN_GUEST",
      status: "HELD",
      isLocked: true,
    },
  ];

  // Helper to construct deterministic TrainerPayoutRecord
  const buildRunPayouts = (
    runId: string,
    runIdx: number,
    periodStart: string,
    periodEnd: string,
    paidAt: string | null,
    adjustmentsMap: Record<string, PayrollAdjustmentRecord[]>
  ): TrainerPayoutRecord[] => {
    const pStart = Date.parse(periodStart);
    const pEnd = Date.parse(periodEnd);
    return trainers.map((t, idx) => {
      const tSessions = sessions.filter((s) => {
        const ms = Date.parse(s.sessionDate);
        return s.trainerProfileId === t.id && ms >= pStart && ms <= pEnd;
      });
      const payoutId = `${runId}-po-${idx + 1}`;
      const adjs = adjustmentsMap[payoutId] ?? [];
      const comp = calculateTrainerBatchPayrollPaise({
        policyType: t.policyType,
        applicableRatePaise: t.baseRatePaise,
        sessions: tSessions,
        adjustments: adjs,
      });
      return {
        id: payoutId,
        payrollRunId: runId,
        trainerProfileId: t.id,
        trainerName: t.name,
        employeeCode: t.employeeCode,
        policyType: t.policyType,
        applicableRatePaise: t.baseRatePaise,
        eligibleSessionsCount: comp.eligibleSessionsCount,
        verifiedMinutes: comp.verifiedMinutes,
        baseAmountPaise: comp.baseAmountPaise,
        bonusPaise: comp.bonusPaise,
        deductionPaise: comp.deductionPaise,
        totalPayablePaise: comp.totalPayablePaise,
        paidAt,
        payslipNumber: `PSL-2026-0${runIdx}${idx + 1}`,
        batchBreakdowns: comp.batchBreakdowns,
        adjustments: adjs,
      };
    });
  };

  const prevRunPayouts = buildRunPayouts("pr-1", 1, prevPeriodStart, prevPeriodEnd, isoDaysOffset(referenceNowIso, -28), {});
  const curRunAdjustments: Record<string, PayrollAdjustmentRecord[]> = {
    "pr-2-po-1": [
      {
        id: "padj-1",
        trainerPayoutId: "pr-2-po-1",
        payrollRunId: "pr-2",
        type: "SUBSTITUTION_FEE",
        amountPaise: 200_000, // INR 2,000 substitution fee approved by distinct approver
        reason: "Covered emergency weekend debugging clinic for Batch DSA-C",
        status: "APPROVED",
        requestedById: "usr-analyst",
        requestedByName: "Siddharth Rao",
        requestedAt: isoDaysOffset(referenceNowIso, -4),
        approvedById: "usr-financier",
        approvedByName: "Meera Nair",
        decidedAt: isoDaysOffset(referenceNowIso, -3),
      },
    ],
  };
  const curRunPayouts = buildRunPayouts("pr-2", 2, currentPeriodStart, currentPeriodEnd, null, curRunAdjustments);

  const payrollRuns: PayrollRunRecord[] = [
    {
      id: "pr-1",
      runNumber: "PR-2026-10",
      periodName: "Prior Cycle (Settled)",
      startDate: prevPeriodStart,
      endDate: prevPeriodEnd,
      status: "PAID",
      createdById: "usr-analyst",
      createdAt: isoDaysOffset(referenceNowIso, -30),
      reviewedById: "usr-financier",
      reviewedAt: isoDaysOffset(referenceNowIso, -29),
      approvedById: "usr-admin",
      approvedAt: isoDaysOffset(referenceNowIso, -29),
      paidById: "usr-financier",
      paidAt: isoDaysOffset(referenceNowIso, -28),
      totalBasePaise: sumPaise(prevRunPayouts.map((p) => p.baseAmountPaise)),
      totalAdjustmentNetPaise: sumPaise(prevRunPayouts.map((p) => subtractPaise(p.bonusPaise, p.deductionPaise))),
      totalPayablePaise: sumPaise(prevRunPayouts.map((p) => p.totalPayablePaise)),
      payouts: prevRunPayouts,
    },
    {
      id: "pr-2",
      runNumber: "PR-2026-11",
      periodName: "Current Cycle (In Review)",
      startDate: currentPeriodStart,
      endDate: currentPeriodEnd,
      status: "REVIEW",
      createdById: "usr-analyst",
      createdAt: isoDaysOffset(referenceNowIso, -2),
      reviewedById: "usr-financier",
      reviewedAt: isoDaysOffset(referenceNowIso, -1),
      approvedById: null,
      approvedAt: null,
      paidById: null,
      paidAt: null,
      totalBasePaise: sumPaise(curRunPayouts.map((p) => p.baseAmountPaise)),
      totalAdjustmentNetPaise: sumPaise(curRunPayouts.map((p) => subtractPaise(p.bonusPaise, p.deductionPaise))),
      totalPayablePaise: sumPaise(curRunPayouts.map((p) => p.totalPayablePaise)),
      payouts: curRunPayouts,
    },
  ];

  // Post balanced TRAINER_PAYOUT entries for settled payroll run pr-1
  const run1 = payrollRuns[0];
  for (const po of run1.payouts) {
    for (const bb of po.batchBreakdowns) {
      if (bb.totalCostPaise <= 0) continue;
      const ref = nextLed();
      journalEntries.push(
        createBalancedJournalEntry({
          ...ref,
          entryDate: run1.paidAt!,
          transactionType: "TRAINER_PAYOUT",
          referenceType: "PayrollRun",
          referenceId: run1.id,
          batchId: bb.batchId,
          trackCode: bb.trackCode,
          notes: `Payroll ${run1.runNumber}: ${po.trainerName} (${bb.batchCode})`,
          createdById: "usr-financier",
          lines: [
            {
              accountCode: "OPERATING_EXPENSE",
              direction: "DEBIT",
              amountPaise: bb.totalCostPaise,
              batchId: bb.batchId,
              trackCode: bb.trackCode,
            },
            {
              accountCode: "BANK",
              direction: "CREDIT",
              amountPaise: bb.totalCostPaise,
              batchId: bb.batchId,
              trackCode: bb.trackCode,
            },
          ],
        })
      );
    }
  }

  // MOCK_DATA: Collections follow-up notes & email dispatch logs
  const followUpNotes: FollowUpNoteRecord[] = [
    {
      id: "note-1",
      studentProfileId: "stu-5",
      studentName: "Rohan Iyer",
      channel: "CALL",
      note: "Spoke with student's sponsor; committed to clearing INR 30,000 tranche by Friday via NEFT.",
      nextFollowUpDate: isoDaysOffset(referenceNowIso, +3),
      createdById: "usr-financier",
      createdByName: "Meera Nair",
      createdAt: isoDaysOffset(referenceNowIso, -2),
    },
    {
      id: "note-2",
      studentProfileId: "stu-4",
      studentName: "Neha Verma",
      channel: "EMAIL",
      note: "Sent automated statement highlighting overdue Instalment 2 of INR 37,500.",
      nextFollowUpDate: isoDaysOffset(referenceNowIso, +5),
      createdById: "usr-analyst",
      createdByName: "Siddharth Rao",
      createdAt: isoDaysOffset(referenceNowIso, -4),
    },
  ];

  const notifications: NotificationDispatchRecord[] = [
    {
      id: "notif-1",
      studentProfileId: "stu-4",
      recipientEmail: "neha.verma@apexacademy.edu",
      kind: "FEE_REMINDER",
      subject: "Tuition Fee Reminder — APX-2026-0104",
      provider: "brevo-api",
      providerId: "msg-seeded-901",
      status: "SENT",
      sentById: "usr-financier",
      sentAt: isoDaysOffset(referenceNowIso, -4),
    },
  ];

  // MOCK_DATA: Initial immutable audit trail snapshots
  const auditLogs: AuditLogRecord[] = [
    {
      id: "aud-4",
      actorId: "usr-financier",
      actorName: "Meera Nair",
      actorRole: "FINANCIER",
      action: "PAYMENT_RECORDED",
      entityType: "StudentPayment",
      entityId: "pay-1",
      timestamp: referenceNowIso,
      reason: "UPI settlement UTR-UPI-661904412 allocated oldest-first",
      requestId: "req-seed-004",
      before: { studentOutstandingPaise: 9_000_000 },
      after: { studentOutstandingPaise: 6_000_000, receiptNumber: "RCP-2026-9021" },
    },
    {
      id: "aud-3",
      actorId: "usr-financier",
      actorName: "Meera Nair",
      actorRole: "FINANCIER",
      action: "PAYROLL_RUN_TRANSITION",
      entityType: "PayrollRun",
      entityId: "pr-2",
      timestamp: isoDaysOffset(referenceNowIso, -1),
      reason: "Moved current payroll cycle into Review after verifying locked sessions",
      requestId: "req-seed-003",
      before: { status: "DRAFT" },
      after: { status: "REVIEW" },
    },
    {
      id: "aud-2",
      actorId: "usr-admin",
      actorName: "Raghav Menon",
      actorRole: "ADMIN",
      action: "DISCOUNT_APPROVED",
      entityType: "DiscountRequest",
      entityId: "disc-1",
      timestamp: isoDaysOffset(referenceNowIso, -35),
      reason: "Merit scholarship tier verified against entrance ranking",
      requestId: "req-seed-002",
      before: { status: "PENDING", approvedDiscountPaise: 0 },
      after: { status: "APPROVED", approvedDiscountPaise: 600_000 },
    },
    {
      id: "aud-1",
      actorId: "usr-financier",
      actorName: "Meera Nair",
      actorRole: "FINANCIER",
      action: "INVOICE_VOIDED_WITH_REVERSAL",
      entityType: "Invoice",
      entityId: "inv-8",
      timestamp: isoDaysOffset(referenceNowIso, -35),
      reason: "Replaced with INV-2026-0003 after scholarship award approval",
      requestId: "req-seed-001",
      before: { status: "SENT", netTotalPaise: 6_000_000 },
      after: { status: "VOID", reversedByCounterEntry: true },
    },
  ];

  return {
    currency: "INR",
    referenceNowIso,
    actors,
    tracks,
    batches,
    trainers,
    students,
    installments,
    invoices,
    payments,
    discounts,
    refunds,
    sessions,
    payrollRuns,
    journalEntries,
    followUpNotes,
    notifications,
    auditLogs,
  };
}
