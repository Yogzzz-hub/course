const pg = require("pg");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:mkccsql@127.0.0.1:5432/academy",
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    console.log("Starting core learning & attendance seed...");

    // 1. Ensure sp-01 has an Admission, FeeAgreement, and StudentBatchEnrollment in batch-py-a
    console.log("Seeding admission, fee agreement, and batch enrollment for sp-01...");
    await client.query(`
      INSERT INTO "Admission" (
        id, "registrationNumber", "studentProfileId", "courseId", "targetBatchId",
        "agreedFee", "discountAmount", "schedulePreference", status, "financialHold",
        "createdById", "createdAt", "updatedAt"
      ) VALUES (
        'adm-sp-01', 'APX-2026-0891', 'sp-01', 'crs-py-fs', 'batch-py-a',
        90000, 0, 'WEEKDAYS', 'ACTIVE', false,
        'usr-financier', NOW() - interval '20 days', NOW() - interval '20 days'
      ) ON CONFLICT (id) DO NOTHING
    `);

    await client.query(`
      INSERT INTO "FeeAgreement" (
        id, "admissionId", "studentProfileId", "courseFee", "totalAgreedFee",
        "discountAmount", "taxAmount", currency, "installmentsCount", status,
        "isApproved", "versionNumber", "createdAt", "updatedAt"
      ) VALUES (
        'fa-sp-01', 'adm-sp-01', 'sp-01', 90000, 90000,
        0, 0, 'INR', 2, 'ACTIVE',
        true, 1, NOW() - interval '20 days', NOW() - interval '20 days'
      ) ON CONFLICT (id) DO NOTHING
    `);

    await client.query(`
      INSERT INTO "FeeInstallment" (
        id, "feeAgreementId", "studentProfileId", "installmentNumber",
        "dueDate", "amountDue", "amountPaid", "remainingBalance", status,
        "lastPaymentDate", "createdAt", "updatedAt"
      ) VALUES
      ('inst-sp-01-1', 'fa-sp-01', 'sp-01', 1, NOW() - interval '10 days', 45000, 45000, 0, 'PAID', NOW() - interval '10 days', NOW() - interval '20 days', NOW() - interval '10 days'),
      ('inst-sp-01-2', 'fa-sp-01', 'sp-01', 2, NOW() + interval '20 days', 45000, 0, 45000, 'UPCOMING', null, NOW() - interval '20 days', NOW() - interval '20 days')
      ON CONFLICT (id) DO NOTHING
    `);

    await client.query(`
      INSERT INTO "StudentPayment" (
        id, "transactionNumber", "studentProfileId", "feeAgreementId", amount,
        currency, "paymentMethod", "paymentDate", "verificationStatus",
        "createdAt", "updatedAt"
      ) VALUES (
        'pay-sp-01-1', 'TXN-SP-001', 'sp-01', 'fa-sp-01', 45000,
        'INR', 'ONLINE', NOW() - interval '10 days', 'VERIFIED',
        NOW() - interval '10 days', NOW() - interval '10 days'
      ) ON CONFLICT (id) DO NOTHING
    `);

    await client.query(`
      INSERT INTO "StudentBatchEnrollment" (
        id, "batchId", "studentProfileId", status, "effectiveStartDate", "allocatedAt"
      ) VALUES (
        'sbe-sp-01-batch-py-a', 'batch-py-a', 'sp-01', 'ACTIVE',
        NOW() - interval '20 days', NOW() - interval '20 days'
      ) ON CONFLICT (id) DO NOTHING
    `);

    // 2. Seed LearningUnits and Lessons
    console.log("Seeding Learning Units & Lessons...");
    const unit1Id = "unit-py-01";
    const unit2Id = "unit-py-02";
    const unit3Id = "unit-react-01";

    await client.query(`
      INSERT INTO "LearningUnit" (
        id, "courseId", title, description, "orderIndex", "estimatedMinutes", "isPublished", "createdAt", "updatedAt"
      ) VALUES
      ($1, 'crs-py-fs', 'Django REST Framework & Authentication Architecture', 'Master production API design, token lifecycle, and custom permissions.', 1, 360, true, NOW() - interval '30 days', NOW()),
      ($2, 'crs-py-fs', 'Asynchronous Queues & Celery Task Architecture', 'Build distributed workers, redis brokers, and scheduled cron jobs in Python.', 2, 420, true, NOW() - interval '20 days', NOW()),
      ($3, 'crs-react-fe', 'React 19 Concurrency & State Orchestration', 'Explore server actions, optimistic queries, and fluid transition ergonomics.', 1, 300, true, NOW() - interval '30 days', NOW())
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description
    `, [unit1Id, unit2Id, unit3Id]);

    const lessons = [
      { id: "les-py-01", unitId: unit1Id, title: "Model Serializers & Field Validations", mins: 60, order: 1 },
      { id: "les-py-02", unitId: unit1Id, title: "JWT Middleware & Token Rotation", mins: 90, order: 2 },
      { id: "les-py-03", unitId: unit1Id, title: "Database Query Profiling & N+1 Prevention", mins: 90, order: 3 },
      { id: "les-py-04", unitId: unit2Id, title: "Redis Broker & Celery Worker Setup", mins: 90, order: 1 },
      { id: "les-py-05", unitId: unit2Id, title: "Idempotent Tasks, Retries & Dead-Letter Queues", mins: 120, order: 2 },
      { id: "les-react-01", unitId: unit3Id, title: "React 19 Concurrency & Suspense Boundaries", mins: 75, order: 1 },
      { id: "les-react-02", unitId: unit3Id, title: "Optimistic Mutation State with React Query", mins: 90, order: 2 },
    ];

    for (const l of lessons) {
      await client.query(`
        INSERT INTO "Lesson" (
          id, "learningUnitId", title, description, "contentType", "estimatedMinutes",
          "orderIndex", "isPublished", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $3, 'VIDEO_AND_CODE', $4, $5, true, NOW() - interval '25 days', NOW()
        ) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title
      `, [l.id, l.unitId, l.title, l.mins, l.order]);
    }

    // Seed some LessonCompletions for sp-01, stu-1, stu-2
    console.log("Seeding Lesson Completions...");
    const completions = [
      { id: "comp-sp-01-l1", stu: "sp-01", lesson: "les-py-01" },
      { id: "comp-sp-01-l2", stu: "sp-01", lesson: "les-py-02" },
      { id: "comp-stu-1-l1", stu: "stu-1", lesson: "les-py-01" },
      { id: "comp-stu-1-l2", stu: "stu-1", lesson: "les-py-02" },
      { id: "comp-stu-1-l3", stu: "stu-1", lesson: "les-py-03" },
      { id: "comp-stu-2-l1", stu: "stu-2", lesson: "les-react-01" },
    ];

    for (const c of completions) {
      await client.query(`
        INSERT INTO "LessonCompletion" (
          id, "studentProfileId", "lessonId", status, "completedAt", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, 'COMPLETED', NOW() - interval '2 days', NOW() - interval '2 days', NOW()
        ) ON CONFLICT (id) DO NOTHING
      `, [c.id, c.stu, c.lesson]);
    }

    // 3. Seed ClassSessions and AttendanceEntries
    console.log("Seeding Class Sessions & Attendance...");
    const sessions = [
      // Batch Python A
      {
        id: "cs-py-01",
        batchId: "batch-py-a",
        trainerProfileId: "trn-1",
        date: "NOW() - interval '12 days'",
        start: "10:00",
        end: "11:30",
        notes: "Django Models, Foreign Keys & Schema Migrations",
        attendance: [
          { stu: "stu-1", status: "PRESENT" },
          { stu: "stu-3", status: "PRESENT" },
          { stu: "sp-01", status: "PRESENT" },
        ],
      },
      {
        id: "cs-py-02",
        batchId: "batch-py-a",
        trainerProfileId: "trn-1",
        date: "NOW() - interval '9 days'",
        start: "10:00",
        end: "11:30",
        notes: "Django REST Framework Serializers & ViewSets",
        attendance: [
          { stu: "stu-1", status: "PRESENT" },
          { stu: "stu-3", status: "PRESENT" },
          { stu: "sp-01", status: "PRESENT" },
        ],
      },
      {
        id: "cs-py-03",
        batchId: "batch-py-a",
        trainerProfileId: "trn-1",
        date: "NOW() - interval '6 days'",
        start: "10:00",
        end: "11:30",
        notes: "JWT Authentication & Custom Permission Classes",
        attendance: [
          { stu: "stu-1", status: "PRESENT" },
          { stu: "stu-3", status: "ABSENT" },
          { stu: "sp-01", status: "PRESENT" },
        ],
      },
      {
        id: "cs-py-04",
        batchId: "batch-py-a",
        trainerProfileId: "trn-1",
        date: "NOW() - interval '3 days'",
        start: "10:00",
        end: "11:30",
        notes: "Database Indexes, QuerySet Caching & Explain Analyze",
        attendance: [
          { stu: "stu-1", status: "PRESENT" },
          { stu: "stu-3", status: "LEAVE" },
          { stu: "sp-01", status: "PRESENT" },
        ],
      },
      // Batch React B
      {
        id: "cs-react-01",
        batchId: "batch-react-b",
        trainerProfileId: "trn-1",
        date: "NOW() - interval '10 days'",
        start: "14:00",
        end: "15:30",
        notes: "React 19 Concurrency, Action Hooks & Forms",
        attendance: [
          { stu: "stu-2", status: "PRESENT" },
        ],
      },
      {
        id: "cs-react-02",
        batchId: "batch-react-b",
        trainerProfileId: "trn-1",
        date: "NOW() - interval '5 days'",
        start: "14:00",
        end: "15:30",
        notes: "Server Components & Client Boundary Hydration",
        attendance: [
          { stu: "stu-2", status: "PRESENT" },
        ],
      },
      // Batch DSA C
      {
        id: "cs-dsa-01",
        batchId: "batch-dsa-c",
        trainerProfileId: "trn-1",
        date: "NOW() - interval '8 days'",
        start: "10:00",
        end: "11:30",
        notes: "Graph Traversal, Dijkstra & Topological Sort",
        attendance: [
          { stu: "stu-4", status: "PRESENT" },
          { stu: "stu-5", status: "PRESENT" },
        ],
      },
      {
        id: "cs-dsa-02",
        batchId: "batch-dsa-c",
        trainerProfileId: "trn-1",
        date: "NOW() - interval '4 days'",
        start: "10:00",
        end: "11:30",
        notes: "Dynamic Programming: Knapsack & Longest Common Subsequence",
        attendance: [
          { stu: "stu-4", status: "PRESENT" },
          { stu: "stu-5", status: "LEAVE" },
        ],
      },
    ];

    for (const s of sessions) {
      await client.query(`
        INSERT INTO "ClassSession" (
          id, "batchId", "trainerProfileId", "sessionDate", "actualStartTime", "actualEndTime",
          notes, "isLocked", "sessionType", "submittedAt", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, ${s.date}, $4, $5,
          $6, true, 'TEACHING', ${s.date}, ${s.date}, NOW()
        ) ON CONFLICT (id) DO NOTHING
      `, [s.id, s.batchId, s.trainerProfileId, s.start, s.end, s.notes]);

      for (const a of s.attendance) {
        const attId = `att-${s.id}-${a.stu}`;
        await client.query(`
          INSERT INTO "AttendanceEntry" (
            id, "classSessionId", "studentProfileId", status, "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4::"AttendanceStatus", ${s.date}, NOW()
          ) ON CONFLICT (id) DO NOTHING
        `, [attId, s.id, a.stu, a.status]);
      }
    }

    // 4. Seed Decisions and Certificates
    console.log("Seeding Completion Decisions and Certificates...");
    await client.query(`
      INSERT INTO "StudentCompletionDecision" (
        id, "studentProfileId", "batchId", "attendancePercentage", "syllabusPercentage",
        "isEligible", status, "decidedById", "decidedAt", "createdAt"
      ) VALUES
      ('dec-py-01', 'stu-1', 'batch-py-a', 95.0, 92.0, true, 'APPROVED', 'usr-admin', NOW() - interval '6 days', NOW() - interval '6 days'),
      ('dec-py-02', 'sp-01', 'batch-py-a', 92.0, 88.0, true, 'APPROVED', 'usr-admin', NOW() - interval '2 days', NOW() - interval '2 days')
      ON CONFLICT (id) DO NOTHING
    `);

    await client.query(`
      INSERT INTO "Certificate" (
        id, "certificateNumber", "studentProfileId", "courseId", "batchId",
        "completionDecisionId", "studentName", "courseTitle", "issueDate",
        "completionDate", "verificationToken", status, "issuedById", "createdAt", "updatedAt"
      ) VALUES
      ('cert-stu-1-py', 'CERT-2026-PY-001', 'stu-1', 'crs-py-fs', 'batch-py-a',
       'dec-py-01', 'Karthik Subramanian', 'Python Full-Stack Engineering', NOW() - interval '5 days',
       NOW() - interval '6 days', 'tok-verify-karthik-2026', 'ISSUED', 'usr-admin', NOW() - interval '5 days', NOW()),
      ('cert-sp-01-py', 'CERT-2026-PY-089', 'sp-01', 'crs-py-fs', 'batch-py-a',
       'dec-py-02', 'Aravind Baskar', 'Python Full-Stack Engineering Foundations', NOW() - interval '1 day',
       NOW() - interval '2 days', 'tok-verify-aravind-2026', 'ISSUED', 'usr-admin', NOW() - interval '1 day', NOW())
      ON CONFLICT (id) DO NOTHING
    `);

    await client.query("COMMIT");
    console.log("Core learning, attendance, and certificates seeded successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seeding failed:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
