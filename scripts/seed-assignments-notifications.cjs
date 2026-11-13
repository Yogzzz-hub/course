const pg = require("pg");
const { randomUUID } = require("crypto");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:mkccsql@127.0.0.1:5432/academy",
});

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("Seeding Assignments...");
    const asg1Id = "asg-py-django-01";
    const asg2Id = "asg-fe-react-01";

    await client.query(`
      INSERT INTO "Assignment" (
        id, "courseId", "batchId", "trainerProfileId", title, description, instructions,
        "learningObjectives", "maxMarks", "dueDate", "allowedSubmissionTypes",
        "lateSubmissionPolicy", "maxAttempts", "gradingPolicy", "publicationStatus",
        "createdAt", "updatedAt"
      ) VALUES
      ($1, 'crs-py-fs', 'batch-py-a', 'trn-1',
       'Django REST API & Token Middleware',
       'Design and implement secure REST endpoints with token authentication, custom permissions, and query optimization.',
       'Submit your public GitHub repository URL containing your Django project and OpenAPI docs.',
       'Master Django REST framework, middleware pipelines, and query profiling.',
       100, NOW() + interval '5 days', 'GITHUB_REPO', 'ACCEPT_WITH_PENALTY', 3, 'RUBRIC', 'PUBLISHED', NOW(), NOW()),
      ($2, 'crs-react-fe', 'batch-react-b', 'trn-1',
       'React 19 Server Components & Motion System',
       'Build an interactive dashboard utilizing React 19 hooks, optimistic mutations, and fluid motion transitions.',
       'Submit your GitHub repository or hosted preview link.',
       'Understand React concurrency, state hydration, and component architecture.',
       100, NOW() + interval '8 days', 'GITHUB_REPO', 'ACCEPT_WITH_PENALTY', 3, 'RUBRIC', 'PUBLISHED', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        "updatedAt" = NOW()
    `, [asg1Id, asg2Id]);

    console.log("Seeding Submissions & Grades...");
    const sub1Id = "sub-stu-1-asg-1";
    const sub2Id = "sub-stu-2-asg-1";
    const sub3Id = "sub-sp-01-asg-2";

    // 1. Graded submission (Karthik)
    await client.query(`
      INSERT INTO "AssignmentSubmission" (
        id, "assignmentId", "studentProfileId", "attemptNumber", status, "submittedAt",
        content, "attachmentUrl", "externalLink", "isLate", "createdAt", "updatedAt"
      ) VALUES
      ($1, $2, 'stu-1', 1, 'GRADED', NOW() - interval '2 days',
       'Completed REST API with custom auth middleware and Swagger documentation.',
       NULL, 'https://github.com/karthik-sub/django-auth-api', false, NOW() - interval '2 days', NOW())
      ON CONFLICT (id) DO NOTHING
    `, [sub1Id, asg1Id]);

    await client.query(`
      INSERT INTO "AssignmentGrade" (
        id, "submissionId", "gradedById", "marksAwarded", "maxMarks", feedback, "isPublished", "gradedAt"
      ) VALUES
      ('grade-sub-1', $1, 'trn-1', 92, 100,
       'Clean serializer design and efficient query set filtering. Great test coverage for authentication exceptions.',
       true, NOW() - interval '1 day')
      ON CONFLICT (id) DO NOTHING
    `, [sub1Id]);

    // 2. Pending review submission (Sneha)
    await client.query(`
      INSERT INTO "AssignmentSubmission" (
        id, "assignmentId", "studentProfileId", "attemptNumber", status, "submittedAt",
        content, "attachmentUrl", "externalLink", "isLate", "createdAt", "updatedAt"
      ) VALUES
      ($1, $2, 'stu-2', 1, 'PENDING_REVIEW', NOW() - interval '4 hours',
       'Implemented token authentication and permission classes for student records.',
       NULL, 'https://github.com/sneha-p/django-rest-store', false, NOW() - interval '4 hours', NOW())
      ON CONFLICT (id) DO NOTHING
    `, [sub2Id, asg1Id]);

    // 3. Pending review submission (Aravind)
    await client.query(`
      INSERT INTO "AssignmentSubmission" (
        id, "assignmentId", "studentProfileId", "attemptNumber", status, "submittedAt",
        content, "attachmentUrl", "externalLink", "isLate", "createdAt", "updatedAt"
      ) VALUES
      ($1, $2, 'sp-01', 1, 'PENDING_REVIEW', NOW() - interval '2 hours',
       'Created responsive motion dashboard with optimistic query invalidations.',
       NULL, 'https://github.com/aravind-b/react-motion-dash', false, NOW() - interval '2 hours', NOW())
      ON CONFLICT (id) DO NOTHING
    `, [sub3Id, asg2Id]);

    console.log("Seeding Notifications...");
    const usersRes = await client.query('SELECT id, role FROM "User"');
    for (const u of usersRes.rows) {
      let title = "System Update";
      let msg = "Welcome to Aintrix Academy portal.";
      let cat = "SYSTEM";
      let link = "/";

      if (u.role === "ADMIN") {
        title = "Platform Security Status";
        msg = "All 112 database tables synchronized and route guards active.";
        cat = "SECURITY";
        link = "/admin-panel";
      } else if (u.role === "MANAGER") {
        title = "Candidate Pipeline Active";
        msg = "New candidate enquiries ready for counsellor review.";
        cat = "ADMISSIONS";
        link = "/manager";
      } else if (u.role === "TRAINER") {
        title = "Pending Assignment Reviews";
        msg = "2 student submissions are waiting for evaluation in your queue.";
        cat = "ACADEMICS";
        link = "/trainer";
      } else if (u.role === "FINANCIER") {
        title = "Ledger Reconciled";
        msg = "Tuition collections and fee installments updated.";
        cat = "FINANCE";
        link = "/financier";
      } else if (u.role === "STUDENT") {
        title = "Assignment Graded";
        msg = "Your Django REST API assignment has been graded (92/100).";
        cat = "GRADES";
        link = "/student-panel";
      }

      await client.query(`
        INSERT INTO "Notification" (id, "userId", title, message, category, "linkUrl", "isRead", "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
      `, [randomUUID(), u.id, title, msg, cat, link]);
    }

    await client.query("COMMIT");
    console.log("Seeding completed successfully!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seeding error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);
