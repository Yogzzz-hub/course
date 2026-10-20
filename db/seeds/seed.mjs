import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Academy CRM database...");

  // Clear existing data safely
  await prisma.auditEvent.deleteMany();
  await prisma.subtopicCoverage.deleteMany();
  await prisma.attendanceEntry.deleteMany();
  await prisma.correctionRequest.deleteMany();
  await prisma.backdateAuthorization.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.studentCompletionDecision.deleteMany();
  await prisma.teachingCompletionRecommendation.deleteMany();
  await prisma.classSession.deleteMany();
  await prisma.sessionOccurrence.deleteMany();
  await prisma.feeAgreement.deleteMany();
  await prisma.admission.deleteMany();
  await prisma.leadActivity.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.studentBatchEnrollment.deleteMany();
  await prisma.trainerBatchAllocation.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.syllabusSubtopic.deleteMany();
  await prisma.syllabusModule.deleteMany();
  await prisma.syllabusVersion.deleteMany();
  await prisma.course.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.trainerProfile.deleteMany();
  await prisma.managerProfile.deleteMany();
  await prisma.financierProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.academySettings.deleteMany();

  // 1. Academy Settings
  const settings = await prisma.academySettings.create({
    data: {
      id: "default",
      academyName: "Apex Global Academy",
      contactEmail: "admissions@apexacademy.edu",
      contactPhone: "+1 (555) 234-5678",
      address: "450 Innovation Way, Tech Campus, Suite 400",
      attendanceThresholdPercent: 100.0,
      attendanceDenominatorPolicy: "HELD_TO_DATE",
      leaveAffectsDenominator: false,
      allowManagerApprovals: true,
    },
  });

  // Common password hash for test accounts
  const passwordHash = await bcrypt.hash("Admin@123456", 10);
  const trainerPasswordHash = await bcrypt.hash("Trainer@123456", 10);
  const managerPasswordHash = await bcrypt.hash("Manager@123456", 10);
  const financierPasswordHash = await bcrypt.hash("Financier@123456", 10);
  const studentPasswordHash = await bcrypt.hash("Student@123456", 10);

  // 2. Users & Profiles
  // Admin
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@apexacademy.edu",
      name: "Victoria Sterling",
      role: "ADMIN",
      passwordHash: passwordHash,
      phone: "+15550000001",
    },
  });

  // Manager
  const managerUser = await prisma.user.create({
    data: {
      email: "manager@apexacademy.edu",
      name: "Arthur Pendelton",
      role: "MANAGER",
      passwordHash: managerPasswordHash,
      phone: "+15550000002",
      managerProfile: {
        create: {
          department: "Student Operations & Admissions",
        },
      },
    },
    include: { managerProfile: true },
  });

  // Financier
  const financierUser = await prisma.user.create({
    data: {
      email: "financier@apexacademy.edu",
      name: "Eleanor Vance",
      role: "FINANCIER",
      passwordHash: financierPasswordHash,
      phone: "+15550000003",
      financierProfile: {
        create: {
          department: "Academy Finance & Accounts",
        },
      },
    },
    include: { financierProfile: true },
  });

  // Trainer 1: David Chen
  const trainer1User = await prisma.user.create({
    data: {
      email: "trainer@apexacademy.edu",
      name: "David Chen",
      role: "TRAINER",
      passwordHash: trainerPasswordHash,
      phone: "+15550000004",
      trainerProfile: {
        create: {
          employeeCode: "TR-001",
          specialization: "Full-Stack Architecture & Cloud",
          bio: "12+ years building distributed cloud backends and modern web frontends.",
          isPublic: true,
        },
      },
    },
    include: { trainerProfile: true },
  });

  // Trainer 2: Sarah Jenkins
  const trainer2User = await prisma.user.create({
    data: {
      email: "sarah.trainer@apexacademy.edu",
      name: "Dr. Sarah Jenkins",
      role: "TRAINER",
      passwordHash: trainerPasswordHash,
      phone: "+15550000005",
      trainerProfile: {
        create: {
          employeeCode: "TR-002",
          specialization: "Data Science, Statistics & Deep Learning",
          bio: "Former Principal Researcher with PhD in Applied Mathematics.",
          isPublic: true,
        },
      },
    },
    include: { trainerProfile: true },
  });

  // Student 1: Alex Rivera
  const student1User = await prisma.user.create({
    data: {
      email: "student@apexacademy.edu",
      name: "Alex Rivera",
      role: "STUDENT",
      passwordHash: studentPasswordHash,
      phone: "+15551234567",
      studentProfile: {
        create: {
          registrationNumber: "ACA-2026-0001",
          emergencyContact: "+15559998877",
          address: "128 Pinecrest Avenue, Metro City",
        },
      },
    },
    include: { studentProfile: true },
  });

  // Student 2: Priya Sharma
  const student2User = await prisma.user.create({
    data: {
      email: "priya.student@apexacademy.edu",
      name: "Priya Sharma",
      role: "STUDENT",
      passwordHash: studentPasswordHash,
      phone: "+15559876543",
      studentProfile: {
        create: {
          registrationNumber: "ACA-2026-0002",
          emergencyContact: "+15558887766",
          address: "74 Silicon Boulevard, Suite 12",
        },
      },
    },
    include: { studentProfile: true },
  });

  // Student 3: Marcus Vance
  const student3User = await prisma.user.create({
    data: {
      email: "marcus.student@apexacademy.edu",
      name: "Marcus Vance",
      role: "STUDENT",
      passwordHash: studentPasswordHash,
      phone: "+15557654321",
      studentProfile: {
        create: {
          registrationNumber: "ACA-2026-0003",
          emergencyContact: "+15557776655",
          address: "310 Harbor View Drive",
        },
      },
    },
    include: { studentProfile: true },
  });

  // 3. Courses & Syllabuses
  // Course 1
  const course1 = await prisma.course.create({
    data: {
      code: "CS-101",
      slug: "full-stack-web-architecture",
      title: "Full-Stack Web Architecture & Cloud Systems",
      description: "Comprehensive software engineering program mastering modern TypeScript, React, Next.js, Node.js, relational database architecture, Docker, and resilient cloud deployments.",
      category: "Software Engineering",
      durationWeeks: 16,
      durationHours: 120,
      prerequisites: "Basic programming concepts and familiarity with JavaScript fundamentals.",
      deliveryMode: "Hybrid (In-Person + Live Online)",
      isPublished: true,
      active: true,
      agreedFeeDefault: 3200.0,
      syllabusVersions: {
        create: {
          versionNumber: 1,
          title: "Standard Production Syllabus v1.0",
          status: "APPROVED",
          approvedAt: new Date("2026-01-10"),
          approvedBy: adminUser.id,
          modules: {
            create: [
              {
                title: "Module 1: Modern Frontend Architecture & Component Systems",
                description: "Design systems, React fundamentals, state management, and accessible UI patterns.",
                orderIndex: 1,
                subtopics: {
                  create: [
                    { title: "HTML5 Semantic Architecture & Accessibility (WCAG 2.1)", isRequired: true, estimatedMinutes: 120, orderIndex: 1 },
                    { title: "CSS Layouts: Flexbox, Grid, Custom Properties & Responsive Design", isRequired: true, estimatedMinutes: 120, orderIndex: 2 },
                    { title: "TypeScript Core: Types, Generics, Interfaces & Narrowing", isRequired: true, estimatedMinutes: 120, orderIndex: 3 },
                    { title: "React Architecture: Component Trees, Hooks & Custom Hooks", isRequired: true, estimatedMinutes: 120, orderIndex: 4 },
                    { title: "State Management, Context, and Optimistic UI Patterns", isRequired: true, estimatedMinutes: 120, orderIndex: 5 },
                  ],
                },
              },
              {
                title: "Module 2: Backend Services, API Contracts & Relational Databases",
                description: "REST & GraphQL architectures, PostgreSQL relational design, Prisma ORM, and data integrity.",
                orderIndex: 2,
                subtopics: {
                  create: [
                    { title: "RESTful API Design, Status Codes, and Open API Contracts", isRequired: true, estimatedMinutes: 120, orderIndex: 1 },
                    { title: "Relational Modeling, Normalization, Foreign Keys & ACID Transactions", isRequired: true, estimatedMinutes: 120, orderIndex: 2 },
                    { title: "Prisma ORM: Schemas, Migrations, Relations & Query Optimization", isRequired: true, estimatedMinutes: 120, orderIndex: 3 },
                    { title: "Authentication: JWTs, HTTP-only Cookies, Session Storage & RBAC", isRequired: true, estimatedMinutes: 120, orderIndex: 4 },
                  ],
                },
              },
              {
                title: "Module 3: Cloud Infrastructure, Security & Automated Testing",
                description: "Testing methodologies, CI/CD pipelines, Docker containerization, and monitoring.",
                orderIndex: 3,
                subtopics: {
                  create: [
                    { title: "Unit & Integration Testing with Vitest and Playwright", isRequired: true, estimatedMinutes: 120, orderIndex: 1 },
                    { title: "Docker Containerization, Multi-Stage Builds & Compose", isRequired: true, estimatedMinutes: 120, orderIndex: 2 },
                    { title: "Security Best Practices: OWASP Top 10, CSRF, and SQL Injection Prevention", isRequired: true, estimatedMinutes: 120, orderIndex: 3 },
                  ],
                },
              },
            ],
          },
        },
      },
    },
    include: {
      syllabusVersions: {
        include: {
          modules: {
            include: { subtopics: true },
          },
        },
      },
    },
  });

  // Course 2
  const course2 = await prisma.course.create({
    data: {
      code: "DS-201",
      slug: "applied-data-science-machine-learning",
      title: "Applied Data Science & Machine Learning",
      description: "Rigorous training in Python scientific stack, exploratory data analysis, statistical modeling, machine learning algorithms, and neural networks.",
      category: "Data Science & Machine Learning",
      durationWeeks: 12,
      durationHours: 90,
      prerequisites: "Introductory Python and basic linear algebra/calculus understanding.",
      deliveryMode: "Live Online",
      isPublished: true,
      active: true,
      agreedFeeDefault: 2800.0,
      syllabusVersions: {
        create: {
          versionNumber: 1,
          title: "Data Science Core Syllabus v1.0",
          status: "APPROVED",
          approvedAt: new Date("2026-01-15"),
          approvedBy: adminUser.id,
          modules: {
            create: [
              {
                title: "Module 1: Exploratory Data Analysis & Scientific Python",
                description: "NumPy, Pandas, Matplotlib, and statistical summaries.",
                orderIndex: 1,
                subtopics: {
                  create: [
                    { title: "Vectorized Operations with NumPy & Numerical Stability", isRequired: true, estimatedMinutes: 120, orderIndex: 1 },
                    { title: "Data Wrangling & Time-Series with Pandas", isRequired: true, estimatedMinutes: 120, orderIndex: 2 },
                  ],
                },
              },
              {
                title: "Module 2: Supervised Learning & Model Validation",
                description: "Regression, Classification, Cross-validation, and metrics.",
                orderIndex: 2,
                subtopics: {
                  create: [
                    { title: "Linear Models, Regularization (L1/L2), and Cost Optimization", isRequired: true, estimatedMinutes: 120, orderIndex: 1 },
                    { title: "Tree Ensembles: Random Forests and Gradient Boosted Trees", isRequired: true, estimatedMinutes: 120, orderIndex: 2 },
                  ],
                },
              },
            ],
          },
        },
      },
    },
    include: {
      syllabusVersions: {
        include: {
          modules: {
            include: { subtopics: true },
          },
        },
      },
    },
  });

  // Course 3 (Unpublished / Draft Course)
  const course3 = await prisma.course.create({
    data: {
      code: "CY-301",
      slug: "enterprise-cybersecurity-defense",
      title: "Enterprise Cybersecurity Defense & Incident Response",
      description: "Specialized defensive cybersecurity, network traffic inspection, threat hunting, vulnerability assessment, and compliance architecture.",
      category: "Cybersecurity",
      durationWeeks: 10,
      durationHours: 80,
      prerequisites: "Networking fundamentals (TCP/IP) and Linux system administration.",
      deliveryMode: "In-Person Classroom",
      isPublished: false,
      active: true,
      agreedFeeDefault: 3500.0,
      syllabusVersions: {
        create: {
          versionNumber: 1,
          title: "Cybersecurity Defense Curriculum",
          status: "DRAFT",
          modules: {
            create: [
              {
                title: "Module 1: Network Reconnaissance & Hardening",
                description: "Wireshark, Nmap, Firewall configurations.",
                orderIndex: 1,
                subtopics: {
                  create: [
                    { title: "Packet Inspection & Protocol Vulnerabilities", isRequired: true, estimatedMinutes: 120, orderIndex: 1 },
                  ],
                },
              },
            ],
          },
        },
      },
    },
  });

  const syllabusV1 = course1.syllabusVersions[0];
  const allSubtopicsC1 = syllabusV1.modules.flatMap((m) => m.subtopics);

  // 4. Batches
  // Batch 1: Full-Stack Weekdays
  const batch1 = await prisma.batch.create({
    data: {
      code: "FS-2026-W1",
      courseId: course1.id,
      syllabusVersionId: syllabusV1.id,
      capacity: 20,
      trainingMode: "Hybrid",
      scheduleType: "WEEKDAYS",
      classDays: "Mon,Wed,Fri",
      startTime: "10:00",
      endTime: "12:00",
      startDate: new Date("2026-02-02"),
      expectedEndDate: new Date("2026-05-29"),
      timezone: "UTC+05:30",
      location: "Lab Room 204 & Zoom Bridge Alpha",
      status: "ACTIVE",
      trainerAllocations: {
        create: {
          trainerProfileId: trainer1User.trainerProfile.id,
          isPrimary: true,
          allocatedBy: adminUser.id,
        },
      },
      enrollments: {
        create: [
          {
            studentProfileId: student1User.studentProfile.id,
            effectiveStartDate: new Date("2026-02-02"),
            status: "ACTIVE",
          },
          {
            studentProfileId: student2User.studentProfile.id,
            effectiveStartDate: new Date("2026-02-02"),
            status: "ACTIVE",
          },
        ],
      },
    },
  });

  // Batch 2: Data Science Weekends
  const batch2 = await prisma.batch.create({
    data: {
      code: "DS-2026-E1",
      courseId: course2.id,
      syllabusVersionId: course2.syllabusVersions[0].id,
      capacity: 15,
      trainingMode: "Live Online",
      scheduleType: "WEEKENDS",
      classDays: "Sat,Sun",
      startTime: "09:00",
      endTime: "13:00",
      startDate: new Date("2026-02-14"),
      expectedEndDate: new Date("2026-05-10"),
      timezone: "UTC+05:30",
      location: "Virtual Classroom Delta",
      status: "ACTIVE",
      trainerAllocations: {
        create: {
          trainerProfileId: trainer2User.trainerProfile.id,
          isPrimary: true,
          allocatedBy: adminUser.id,
        },
      },
      enrollments: {
        create: [
          {
            studentProfileId: student3User.studentProfile.id,
            effectiveStartDate: new Date("2026-02-14"),
            status: "ACTIVE",
          },
        ],
      },
    },
  });

  // 4b. Complete Programmes from Academy Course Catalog
  const programmesCatalog = [
    {
      code: "PY-FS-01",
      slug: "python-full-stack",
      title: "Python Full-Stack Software Engineering",
      description: "Connect the dots between code, interfaces, databases and deployment. A structured 7-month path from programming fundamentals to full-stack development and career preparation.",
      category: "Software Engineering",
      durationWeeks: 28,
      durationHours: 210,
      prerequisites: "No prior coding experience required. High school mathematics, dedication to hands-on practice, and problem-solving aptitude.",
      deliveryMode: "Hybrid (In-Person + Live Online)",
      agreedFeeDefault: 59999.0,
      modules: [
        { name: "Programming & Python Foundation", topics: ["Programming fundamentals", "Python syntax", "Control flow", "Data structures"], description: "Build solid algorithmic fundamentals and core Python mechanics." },
        { name: "Advanced Python & Software Development", topics: ["Advanced Python", "OOP", "Design patterns", "Clean code"], description: "Deep dive into object-oriented architecture and modular software design." },
        { name: "SQL & PostgreSQL", topics: ["SQL", "PostgreSQL", "Data modeling", "Indexing"], description: "Design normalized relational databases and craft high-performance queries." },
        { name: "Django & Backend Development", topics: ["Django", "REST Framework", "Auth", "Backend development"], description: "Build robust server-side APIs, user authentication, and data layers." },
        { name: "HTML, CSS & JavaScript", topics: ["HTML5", "CSS3", "JavaScript ES6+", "DOM APIs"], description: "Create semantic, accessible, and responsive user interfaces." },
        { name: "React Development", topics: ["React", "Hooks", "State management", "Component design"], description: "Master modern declarative frontend development with React." },
        { name: "Full-Stack Application Development", topics: ["Full-stack integration", "State sync", "JWT security", "Web architectures"], description: "Connect React interfaces with Django backends and live databases." },
        { name: "Software Engineering, Testing & APIs", topics: ["Software engineering", "Pytest", "REST APIs", "Git"], description: "Adopt professional engineering practices, automated tests, and code reviews." },
        { name: "DevOps, Docker & Deployment", topics: ["DevOps", "Docker", "CI/CD", "Cloud hosting"], description: "Containerize and deploy applications with automated pipelines." },
        { name: "DSA & Technical Interview Preparation", topics: ["Data structures", "Algorithms", "Interview preparation"], description: "Master problem-solving and algorithmic challenges for top tech hiring." },
        { name: "Advanced Software Tooling & Refactoring", topics: ["Static analysis", "Profiler tooling", "Clean architecture", "Design patterns"], description: "Supercharge engineering productivity with modern development workflows." },
      ],
    },
    {
      code: "FS-APP-02",
      slug: "full-stack-app-dev",
      title: "Full-Stack Application Development",
      description: "Architect end-to-end web applications combining React interfaces with Django REST backends and PostgreSQL data.",
      category: "Software Engineering",
      durationWeeks: 6,
      durationHours: 45,
      prerequisites: "Familiarity with basic JavaScript and Python syntax.",
      deliveryMode: "Hybrid (In-Person + Live Online)",
      agreedFeeDefault: 22000.0,
      modules: [
        { name: "Architecture & Contract Design", topics: ["REST API conventions", "Data schemas", "HTTP status semantics"], description: "Plan clear boundaries and contracts between client and server." },
        { name: "State Management & Async Data", topics: ["Axios interceptors", "React Query / Context", "Optimistic UI"], description: "Handle asynchronous server state seamlessly in React." },
        { name: "Security & User Authentication", topics: ["JWT tokens", "Refresh rotation", "Protected route guards"], description: "Implement enterprise-grade authentication and authorization." },
        { name: "Production Build & Deployment", topics: ["Static bundling", "CORS policies", "Environment isolation"], description: "Package both tiers and deploy to modern cloud hosting platforms." },
      ],
    },
    {
      code: "DJ-BE-03",
      slug: "django-backend-dev",
      title: "Django & Backend Development",
      description: "Build secure, scalable server-side systems, RESTful API endpoints, robust ORM queries, and backend business logic.",
      category: "Software Engineering",
      durationWeeks: 5,
      durationHours: 40,
      prerequisites: "Good understanding of Python fundamentals and basic SQL knowledge.",
      deliveryMode: "Live Online",
      agreedFeeDefault: 20000.0,
      modules: [
        { name: "Django Foundation & Project Setup", topics: ["Settings modularity", "Apps architecture", "URL dispatching"], description: "Establish clean, production-ready Django project structures." },
        { name: "Django ORM & Database Modeling", topics: ["Foreign keys", "Many-to-many", "QuerySet optimization"], description: "Model real-world business domains with high-performance queries." },
        { name: "Django REST Framework (DRF)", topics: ["Serializers", "ModelViewSets", "Pagination & Filters"], description: "Expose standardized REST APIs with automated documentation." },
        { name: "Authentication, Security & Testing", topics: ["SimpleJWT", "Custom permission classes", "Pytest-django"], description: "Harden your APIs against vulnerabilities with comprehensive unit tests." },
      ],
    },
    {
      code: "RC-FE-04",
      slug: "react-development",
      title: "React Frontend Development",
      description: "Master component-driven user interfaces, hooks, state architecture, client-side routing, and responsive web design.",
      category: "Software Engineering",
      durationWeeks: 4,
      durationHours: 30,
      prerequisites: "Strong grasp of modern HTML, CSS, and ES6+ JavaScript.",
      deliveryMode: "Live Online",
      agreedFeeDefault: 15000.0,
      modules: [
        { name: "Modern React Foundations", topics: ["JSX syntax", "Props contracts", "Conditional rendering", "Lists & keys"], description: "Learn declarative UI thinking and reactive rendering." },
        { name: "Deep Dive into Hooks", topics: ["useState", "useEffect lifecycle", "useRef", "Custom hooks"], description: "Encapsulate and reuse stateful logic cleanly across components." },
        { name: "Navigation & Routing", topics: ["React Router", "Dynamic params", "Nested layouts", "Search params"], description: "Build seamless multi-screen user flows with browser history sync." },
        { name: "Performance & Production Polish", topics: ["React.memo", "useCallback", "Lazy loading", "Error boundaries"], description: "Ship production-ready, lightning-fast frontend bundles." },
      ],
    },
    {
      code: "PY-ADV-05",
      slug: "advanced-python",
      title: "Advanced Python & Software Development",
      description: "Master object-oriented programming, concurrency, architectural design patterns, and idiomatic Python development.",
      category: "Software Engineering",
      durationWeeks: 4,
      durationHours: 30,
      prerequisites: "Basic Python syntax, functions, and control flow.",
      deliveryMode: "Hybrid (In-Person + Live Online)",
      agreedFeeDefault: 15000.0,
      modules: [
        { name: "Advanced OOP & Metaprogramming", topics: ["Dunder methods", "Abstract Base Classes", "Decorators", "Descriptors"], description: "Harness the full dynamic power of the Python object model." },
        { name: "Design Patterns in Python", topics: ["Creational patterns", "Structural patterns", "Behavioral patterns"], description: "Apply industry-proven architectures to solve recurring problems." },
        { name: "Asynchronous & Concurrent Python", topics: ["Async / await", "Event loop", "Thread pool execution", "Generators"], description: "Handle I/O-bound concurrency with high throughput." },
        { name: "Software Quality & Testing", topics: ["Pytest", "Mocking", "Type annotations", "Poetry packaging"], description: "Build resilient, well-tested Python libraries and applications." },
      ],
    },
    {
      code: "DO-OPS-06",
      slug: "devops-docker-deployment",
      title: "DevOps, Docker & Deployment",
      description: "Containerize web applications with Docker, build automated CI/CD workflows, and deploy resilient cloud services.",
      category: "Cloud & DevOps",
      durationWeeks: 4,
      durationHours: 30,
      prerequisites: "Basic command line familiarity and web development fundamentals.",
      deliveryMode: "Live Online",
      agreedFeeDefault: 15000.0,
      modules: [
        { name: "Docker Essentials & Containerization", topics: ["Images vs Containers", "Layers", "Multi-stage builds"], description: "Package software into predictable, isolated environments." },
        { name: "Docker Compose & Networks", topics: ["Compose YAML", "Service links", "Persistent volumes", "Env vars"], description: "Run complete local development and staging clusters." },
        { name: "Continuous Integration & CD", topics: ["GitHub Actions", "Automated testing", "Docker Hub publishing"], description: "Automate build, test, and release cycles on every commit." },
        { name: "Cloud Server Setup & Hosting", topics: ["VPS hosting", "Nginx reverse proxy", "Certbot SSL", "Monitoring"], description: "Deploy and maintain live production services with zero downtime." },
      ],
    },
    {
      code: "DSA-PREP-07",
      slug: "dsa-technical-interview",
      title: "DSA & Technical Interview Preparation",
      description: "Conquer coding interviews with structured algorithmic problem-solving, data structures, and mock interview practice.",
      category: "Computer Science",
      durationWeeks: 5,
      durationHours: 40,
      prerequisites: "Comfortable with basic programming in Python or any other language.",
      deliveryMode: "Live Online",
      agreedFeeDefault: 21000.0,
      modules: [
        { name: "Complexity & Linear Structures", topics: ["Big-O analysis", "Arrays & Strings", "Linked Lists", "Stacks & Queues"], description: "Build strong mental models for memory layout and basic structures." },
        { name: "Trees, Graphs & Traversal", topics: ["Binary Search Trees", "Breadth-First Search", "Depth-First Search", "Tries"], description: "Navigate hierarchical and interconnected data topologies." },
        { name: "Advanced Algorithmic Patterns", topics: ["Dynamic Programming", "Greedy algorithms", "Backtracking", "Two Pointers"], description: "Conquer the most challenging interview problem archetypes." },
        { name: "Live Coding & Mock Interviews", topics: ["Problem breakdown", "Edge case testing", "Clear communication", "System thinking"], description: "Practise timed live-coding rounds under real interview conditions." },
      ],
    },
    {
      code: "PY-FND-08",
      slug: "programming-python-foundation",
      title: "Programming & Python Foundation",
      description: "First-principles introduction to computer programming, algorithmic thinking, and core Python coding from scratch.",
      category: "Foundations",
      durationWeeks: 4,
      durationHours: 30,
      prerequisites: "Basic computer literacy and a desire to learn.",
      deliveryMode: "Hybrid (In-Person + Live Online)",
      agreedFeeDefault: 12000.0,
      modules: [
        { name: "Computation & Variables", topics: ["Data types", "Variables", "Arithmetic & logical operators", "Input/Output"], description: "Write your first programs and work with fundamental data." },
        { name: "Branching & Repetition", topics: ["if/elif/else", "for loops", "while loops", "Break & continue"], description: "Instruct the computer to make decisions and automate repetitive tasks." },
        { name: "Functional Decomposition", topics: ["Function definition", "Scope rules", "Default arguments", "Docstrings"], description: "Organize code into clean, testable building blocks." },
        { name: "Core Data Structures", topics: ["Lists & indexing", "Dictionaries (key-value)", "Tuples", "Set operations"], description: "Model real-world data effectively using native Python structures." },
      ],
    },
    {
      code: "WEB-FND-09",
      slug: "html-css-javascript",
      title: "HTML, CSS & Modern JavaScript",
      description: "Create semantic, accessible, and responsive user interfaces with modern HTML5, CSS layout systems, and JavaScript.",
      category: "Web Foundations",
      durationWeeks: 3,
      durationHours: 24,
      prerequisites: "Basic computer skills; no prior web programming needed.",
      deliveryMode: "Live Online",
      agreedFeeDefault: 12000.0,
      modules: [
        { name: "Semantic Markup & Accessibility", topics: ["HTML5 tags", "ARIA attributes", "Forms & validation", "SEO meta"], description: "Structure documents with precision and accessibility in mind." },
        { name: "Modern CSS & Responsive Design", topics: ["Box model", "Flexbox", "CSS Grid", "Media queries", "CSS custom properties"], description: "Style visually stunning interfaces that look great on any device." },
        { name: "JavaScript Language Foundations", topics: ["Variables (let/const)", "Arrow functions", "Destructuring", "Array methods"], description: "Learn the core programming language of the modern browser." },
        { name: "DOM Manipulation & Async APIs", topics: ["Event handling", "Dynamic elements", "Fetch API", "Promises & async/await"], description: "Bring interfaces to life with interactive behaviour and live API data." },
      ],
    },
    {
      code: "SQL-DB-10",
      slug: "sql-postgresql",
      title: "SQL & PostgreSQL Database Engineering",
      description: "Design normalized relational databases, execute complex analytical queries, and maintain data integrity.",
      category: "Data Engineering",
      durationWeeks: 3,
      durationHours: 24,
      prerequisites: "Basic programming knowledge; no prior database experience needed.",
      deliveryMode: "Live Online",
      agreedFeeDefault: 11000.0,
      modules: [
        { name: "Relational Theory & Schema Design", topics: ["Tables & datatypes", "Primary/Foreign keys", "Normalization (1NF-3NF)"], description: "Design clean, robust relational blueprints for application data." },
        { name: "Querying & Filtering Data", topics: ["SELECT expressions", "Filtering", "Sorting & pagination", "Aggregate functions"], description: "Extract exact datasets efficiently from large relational tables." },
        { name: "Advanced Joins & Analytical SQL", topics: ["Multi-table joins", "Subqueries & CTEs", "Window functions"], description: "Solve intricate data questions with advanced SQL techniques." },
        { name: "Indexing, Performance & Transactions", topics: ["B-Tree indexes", "EXPLAIN ANALYZE", "ACID transactions", "Constraints"], description: "Ensure transactional reliability and lightning-fast query execution." },
      ],
    },
    {
      code: "SE-TEST-11",
      slug: "software-engineering-testing",
      title: "Software Engineering, Testing & APIs",
      description: "Learn professional engineering disciplines including automated unit testing, version control, and REST API conventions.",
      category: "Engineering Excellence",
      durationWeeks: 3,
      durationHours: 24,
      prerequisites: "Familiarity with Python or another programming language.",
      deliveryMode: "Live Online",
      agreedFeeDefault: 9000.0,
      modules: [
        { name: "RESTful API Design & Specification", topics: ["Resource URI design", "HTTP verbs", "Status code conventions", "OpenAPI"], description: "Design clean, intuitive API interfaces following industry best practices." },
        { name: "Automated Unit Testing with Pytest", topics: ["Test fixtures", "Parametrized tests", "Assertions", "Test discovery"], description: "Build reliable automated test suites that prevent regressions." },
        { name: "Test Doubles & Integration Testing", topics: ["Mocking", "Monkeypatching", "Database test harnesses", "Coverage tracking"], description: "Test interactions with external services safely and repeatably." },
        { name: "Version Control & Team Workflows", topics: ["Feature branching", "Merge vs Rebase", "Code review etiquette", "CI integration"], description: "Collaborate cleanly in engineering teams without merge conflicts." },
      ],
    },
    {
      code: "DEV-OPS-12",
      slug: "devops-and-ci-cd-engineering",
      title: "DevOps & CI/CD Engineering",
      description: "Master modern continuous integration, deployment pipelines, containerization, and production cloud infrastructure automation.",
      category: "DevOps & Cloud",
      durationWeeks: 2,
      durationHours: 16,
      prerequisites: "Basic programming experience in any language.",
      deliveryMode: "Live Online",
      agreedFeeDefault: 5000.0,
      modules: [
        { name: "Continuous Integration Pipelines", topics: ["Pipeline triggers", "Automated linting & testing", "Artifact caching", "Security scanning"], description: "Build automated verification gates for production software." },
        { name: "Docker Containerization", topics: ["Dockerfile optimization", "Multi-stage builds", "Docker compose", "Volume management"], description: "Package applications with repeatable, secure runtime dependencies." },
        { name: "Automated Testing & Quality Gates", topics: ["Unit & integration stages", "Coverage thresholds", "Status badges", "Branch protections"], description: "Enforce rigorous quality controls before merging code." },
        { name: "Continuous Deployment & Monitoring", topics: ["Cloud deployments", "Health probes", "Zero-downtime rollouts", "Logging"], description: "Deploy software to production environments safely and reliably." },
      ],
    },
  ];

  for (const prog of programmesCatalog) {
    const created = await prisma.course.create({
      data: {
        code: prog.code,
        slug: prog.slug,
        title: prog.title,
        description: prog.description,
        category: prog.category,
        durationWeeks: prog.durationWeeks,
        durationHours: prog.durationHours,
        prerequisites: prog.prerequisites,
        deliveryMode: prog.deliveryMode,
        isPublished: true,
        active: true,
        agreedFeeDefault: prog.agreedFeeDefault,
        syllabusVersions: {
          create: {
            versionNumber: 1,
            title: `${prog.title} Curriculum v1.0`,
            status: "APPROVED",
            approvedAt: new Date("2026-01-10"),
            approvedBy: adminUser.id,
            modules: {
              create: prog.modules.map((m, mIdx) => ({
                title: `Module ${mIdx + 1}: ${m.name}`,
                description: m.description,
                orderIndex: mIdx + 1,
                subtopics: {
                  create: m.topics.map((t, tIdx) => ({
                    title: t,
                    isRequired: true,
                    estimatedMinutes: 60,
                    orderIndex: tIdx + 1,
                  })),
                },
              })),
            },
          },
        },
      },
      include: { syllabusVersions: true },
    });

    // Create an active batch for this course allocated to trainer1User
    await prisma.batch.create({
      data: {
        code: `${prog.code}-2026-B1`,
        courseId: created.id,
        syllabusVersionId: created.syllabusVersions[0].id,
        capacity: 25,
        trainingMode: prog.deliveryMode.includes("Hybrid") ? "Hybrid" : "Live Online",
        scheduleType: prog.category === "Flagship" ? "WEEKDAYS" : "WEEKENDS",
        classDays: "Tue,Thu,Sat",
        startTime: "18:00",
        endTime: "20:00",
        startDate: new Date("2026-03-01"),
        expectedEndDate: new Date("2026-08-30"),
        status: "ACTIVE",
        trainerAllocations: {
          create: {
            trainerProfileId: trainer1User.trainerProfile.id,
            isPrimary: true,
            allocatedBy: adminUser.id,
          },
        },
      },
    });
  }

  // 5. Admissions & Fee Agreements
  // Alex Rivera Admission
  const adm1 = await prisma.admission.create({
    data: {
      registrationNumber: student1User.studentProfile.registrationNumber,
      studentProfileId: student1User.studentProfile.id,
      courseId: course1.id,
      targetBatchId: batch1.id,
      agreedFee: 3200.0,
      discountAmount: 200.0,
      discountReason: "Early Bird Enrollment Scholarship",
      schedulePreference: "WEEKDAYS",
      status: "APPROVED",
      notes: "Identity verified, prerequisites validated.",
      createdById: managerUser.id,
      approvedById: adminUser.id,
      approvedAt: new Date("2026-01-28"),
      feeAgreements: {
        create: {
          studentProfileId: student1User.studentProfile.id,
          totalAgreedFee: 3000.0,
          installmentsCount: 2,
          agreedTerms: "Two equal installments of $1,500 due at start and mid-term.",
          isApproved: true,
          approvedById: adminUser.id,
        },
      },
    },
  });

  // Priya Sharma Admission
  const adm2 = await prisma.admission.create({
    data: {
      registrationNumber: student2User.studentProfile.registrationNumber,
      studentProfileId: student2User.studentProfile.id,
      courseId: course1.id,
      targetBatchId: batch1.id,
      agreedFee: 3200.0,
      discountAmount: 0.0,
      schedulePreference: "WEEKDAYS",
      status: "APPROVED",
      notes: "Direct corporate sponsorship candidate.",
      createdById: managerUser.id,
      approvedById: adminUser.id,
      approvedAt: new Date("2026-01-29"),
      feeAgreements: {
        create: {
          studentProfileId: student2User.studentProfile.id,
          totalAgreedFee: 3200.0,
          installmentsCount: 1,
          agreedTerms: "Single upfront institutional agreement.",
          isApproved: true,
          approvedById: adminUser.id,
        },
      },
    },
  });

  // Marcus Vance Admission
  const adm3 = await prisma.admission.create({
    data: {
      registrationNumber: student3User.studentProfile.registrationNumber,
      studentProfileId: student3User.studentProfile.id,
      courseId: course2.id,
      targetBatchId: batch2.id,
      agreedFee: 2800.0,
      discountAmount: 100.0,
      discountReason: "Academic Merit Waiver",
      schedulePreference: "WEEKENDS",
      status: "APPROVED",
      notes: "Transcripts checked, admitted to Weekend cohort.",
      createdById: managerUser.id,
      approvedById: adminUser.id,
      approvedAt: new Date("2026-02-05"),
      feeAgreements: {
        create: {
          studentProfileId: student3User.studentProfile.id,
          totalAgreedFee: 2700.0,
          installmentsCount: 3,
          agreedTerms: "Three installments of $900 payable across terms.",
          isApproved: true,
          approvedById: adminUser.id,
        },
      },
    },
  });

  // 6. Scheduled Occurrences & Held Class Sessions for Batch 1 (FS-2026-W1)
  // Class 1 (Held)
  const occ1 = await prisma.sessionOccurrence.create({
    data: {
      batchId: batch1.id,
      trainerProfileId: trainer1User.trainerProfile.id,
      plannedDate: new Date("2026-02-02T10:00:00Z"),
      plannedStartTime: "10:00",
      plannedEndTime: "12:00",
      status: "HELD",
      location: "Lab Room 204",
    },
  });

  const session1 = await prisma.classSession.create({
    data: {
      batchId: batch1.id,
      occurrenceId: occ1.id,
      trainerProfileId: trainer1User.trainerProfile.id,
      sessionDate: new Date("2026-02-02T10:00:00Z"),
      actualStartTime: "10:02",
      actualEndTime: "12:05",
      sessionType: "TEACHING",
      notes: "Orientation completed. Covered HTML5 semantic tags, landmark elements, and accessibility best practices.",
      isLocked: true,
      idempotencyKey: "SESSION-FS-2026-W1-20260202",
      submittedAt: new Date("2026-02-02T12:10:00Z"),
      attendanceEntries: {
        create: [
          {
            studentProfileId: student1User.studentProfile.id,
            status: "PRESENT",
            notes: "Active participation in accessibility lab exercise.",
          },
          {
            studentProfileId: student2User.studentProfile.id,
            status: "PRESENT",
            notes: "On time, completed lab setup.",
          },
        ],
      },
      subtopicCoverages: {
        create: [
          {
            subtopicId: allSubtopicsC1[0].id,
            notes: "Full practical demonstration of screen reader testing and aria-landmarks.",
          },
        ],
      },
    },
  });

  // Class 2 (Held)
  const occ2 = await prisma.sessionOccurrence.create({
    data: {
      batchId: batch1.id,
      trainerProfileId: trainer1User.trainerProfile.id,
      plannedDate: new Date("2026-02-04T10:00:00Z"),
      plannedStartTime: "10:00",
      plannedEndTime: "12:00",
      status: "HELD",
      location: "Lab Room 204",
    },
  });

  const session2 = await prisma.classSession.create({
    data: {
      batchId: batch1.id,
      occurrenceId: occ2.id,
      trainerProfileId: trainer1User.trainerProfile.id,
      sessionDate: new Date("2026-02-04T10:00:00Z"),
      actualStartTime: "10:00",
      actualEndTime: "12:00",
      sessionType: "TEACHING",
      notes: "Deep dive into CSS Flexbox alignment, CSS Grid two-dimensional layouts, and tokenized CSS variables.",
      isLocked: true,
      idempotencyKey: "SESSION-FS-2026-W1-20260204",
      submittedAt: new Date("2026-02-04T12:08:00Z"),
      attendanceEntries: {
        create: [
          {
            studentProfileId: student1User.studentProfile.id,
            status: "PRESENT",
          },
          {
            studentProfileId: student2User.studentProfile.id,
            status: "LEAVE",
            notes: "Approved medical leave note provided in advance.",
          },
        ],
      },
      subtopicCoverages: {
        create: [
          {
            subtopicId: allSubtopicsC1[1].id,
            notes: "Responsive dashboard layout built in class.",
          },
        ],
      },
    },
  });

  // Class 3 (Held)
  const occ3 = await prisma.sessionOccurrence.create({
    data: {
      batchId: batch1.id,
      trainerProfileId: trainer1User.trainerProfile.id,
      plannedDate: new Date("2026-02-06T10:00:00Z"),
      plannedStartTime: "10:00",
      plannedEndTime: "12:00",
      status: "HELD",
      location: "Lab Room 204",
    },
  });

  const session3 = await prisma.classSession.create({
    data: {
      batchId: batch1.id,
      occurrenceId: occ3.id,
      trainerProfileId: trainer1User.trainerProfile.id,
      sessionDate: new Date("2026-02-06T10:00:00Z"),
      actualStartTime: "10:05",
      actualEndTime: "12:02",
      sessionType: "TEACHING",
      notes: "TypeScript fundamentals: typing variables, Discriminated Unions, Generic interfaces, utility types.",
      isLocked: true,
      idempotencyKey: "SESSION-FS-2026-W1-20260206",
      submittedAt: new Date("2026-02-06T12:15:00Z"),
      attendanceEntries: {
        create: [
          {
            studentProfileId: student1User.studentProfile.id,
            status: "PRESENT",
          },
          {
            studentProfileId: student2User.studentProfile.id,
            status: "PRESENT",
          },
        ],
      },
      subtopicCoverages: {
        create: [
          {
            subtopicId: allSubtopicsC1[2].id,
            notes: "Typed API schema contracts authored and checked.",
          },
        ],
      },
    },
  });

  // Class 4 (Upcoming / Scheduled)
  const occ4 = await prisma.sessionOccurrence.create({
    data: {
      batchId: batch1.id,
      trainerProfileId: trainer1User.trainerProfile.id,
      plannedDate: new Date("2026-02-09T10:00:00Z"),
      plannedStartTime: "10:00",
      plannedEndTime: "12:00",
      status: "SCHEDULED",
      location: "Lab Room 204",
    },
  });

  // Class 5 (Upcoming / Scheduled)
  const occ5 = await prisma.sessionOccurrence.create({
    data: {
      batchId: batch1.id,
      trainerProfileId: trainer1User.trainerProfile.id,
      plannedDate: new Date("2026-02-11T10:00:00Z"),
      plannedStartTime: "10:00",
      plannedEndTime: "12:00",
      status: "SCHEDULED",
      location: "Lab Room 204",
    },
  });

  // Class 6 (Cancelled Occurrence Example)
  const occCancelled = await prisma.sessionOccurrence.create({
    data: {
      batchId: batch1.id,
      trainerProfileId: trainer1User.trainerProfile.id,
      plannedDate: new Date("2026-02-13T10:00:00Z"),
      plannedStartTime: "10:00",
      plannedEndTime: "12:00",
      status: "CANCELLED",
      cancellationReason: "Scheduled academy holiday - Spring Campus Maintenance",
      location: "Lab Room 204",
    },
  });

  // 7. Leads for CRM Pipeline
  const lead1 = await prisma.lead.create({
    data: {
      fullName: "Jordan Blake",
      email: "jordan.blake@example.com",
      phone: "+15551112233",
      courseInterestId: course1.id,
      schedulePreference: "WEEKDAYS",
      status: "NEW",
      source: "Website Enquiry",
      message: "Looking to switch careers into full-stack software development. Are weekday batches morning or evening?",
      assignedManagerId: managerUser.managerProfile.id,
      activities: {
        create: {
          actionType: "LEAD_CREATED",
          notes: "Public enquiry received via website course catalog form.",
          createdBy: "System",
        },
      },
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      fullName: "Elena Rostova",
      email: "elena.rostova@example.com",
      phone: "+15554445566",
      courseInterestId: course2.id,
      schedulePreference: "WEEKENDS",
      status: "COUNSELLING_SCHEDULED",
      source: "Google Search",
      message: "Have strong statistics background, want to transition to applied machine learning engineer roles.",
      assignedManagerId: managerUser.managerProfile.id,
      followUpDate: new Date("2026-02-15T14:00:00Z"),
      nextAction: "Conduct 1-on-1 syllabus and career roadmap consultation via video link.",
      notes: "High intent applicant with university math degree.",
      activities: {
        create: [
          {
            actionType: "LEAD_CREATED",
            notes: "Lead captured from website inquiry.",
            createdBy: "System",
          },
          {
            actionType: "CALL_COMPLETED",
            notes: "Spoke for 15 minutes. Scheduled comprehensive admissions counselling for Saturday afternoon.",
            createdBy: managerUser.id,
          },
        ],
      },
    },
  });

  const lead3 = await prisma.lead.create({
    data: {
      fullName: "Devon Miller",
      email: "devon.miller@example.com",
      phone: "+15556667788",
      courseInterestId: course1.id,
      schedulePreference: "FLEXIBLE",
      status: "INTERESTED",
      source: "Referral",
      notes: "Requested detailed breakdown of payment options and batch schedules.",
      assignedManagerId: managerUser.managerProfile.id,
      followUpDate: new Date("2026-02-18T11:00:00Z"),
      nextAction: "Send fee agreement schedule draft and invite to guest lecture.",
      activities: {
        create: {
          actionType: "STATUS_CHANGE",
          notes: "Updated status to Interested after positive email correspondence.",
          createdBy: managerUser.id,
        },
      },
    },
  });

  // 8. Sample Leave Request
  await prisma.leaveRequest.create({
    data: {
      studentProfileId: student2User.studentProfile.id,
      batchId: batch1.id,
      startDate: new Date("2026-02-04"),
      endDate: new Date("2026-02-04"),
      reason: "Medical consultation requiring outpatient procedure.",
      status: "APPROVED",
      reviewedById: managerUser.id,
      reviewedAt: new Date("2026-02-03T16:00:00Z"),
      reviewNotes: "Doctor documentation reviewed and acknowledged.",
    },
  });

  // 9. Sample Attendance Correction Request (Pending Review)
  await prisma.correctionRequest.create({
    data: {
      classSessionId: session1.id,
      requestedById: trainer1User.id,
      targetField: "notes",
      oldValue: "Orientation completed. Covered HTML5 semantic tags, landmark elements, and accessibility best practices.",
      proposedValue: "Orientation completed. Covered HTML5 semantic tags, landmark elements, ARIA standards, and screen reader tests with NVDA.",
      reason: "Include NVDA screen reader test notes in session log for syllabus audit.",
      status: "PENDING",
    },
  });

  // 10. Audit Events
  await prisma.auditEvent.createMany({
    data: [
      {
        userId: adminUser.id,
        action: "COURSE_PUBLISHED",
        entityType: "Course",
        entityId: course1.id,
        detailsJson: JSON.stringify({ title: course1.title, code: course1.code }),
      },
      {
        userId: adminUser.id,
        action: "BATCH_CREATED",
        entityType: "Batch",
        entityId: batch1.id,
        detailsJson: JSON.stringify({ code: batch1.code, trainer: trainer1User.name }),
      },
      {
        userId: trainer1User.id,
        action: "CLASS_SESSION_SUBMITTED",
        entityType: "ClassSession",
        entityId: session1.id,
        detailsJson: JSON.stringify({
          batch: batch1.code,
          studentsPresent: 2,
          subtopicsCovered: [allSubtopicsC1[0].title],
        }),
      },
    ],
  });

  console.log("Database seeded successfully!");
  console.log("-----------------------------------------");
  console.log("Sample User Accounts for Testing:");
  console.log("1. Admin:     admin@apexacademy.edu     / Admin@123456");
  console.log("2. Manager:   manager@apexacademy.edu   / Manager@123456");
  console.log("3. Financier: financier@apexacademy.edu / Financier@123456");
  console.log("4. Trainer:   trainer@apexacademy.edu   / Trainer@123456");
  console.log("5. Student:   student@apexacademy.edu   / Student@123456  (Phone: +15551234567)");
  console.log("-----------------------------------------");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
