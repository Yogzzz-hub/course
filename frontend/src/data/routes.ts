export const routes = [
  { path: '/login', title: 'Sign in', description: 'Sign in to your Aintrix Academy workspace. Learners and staff use the same sign-in.' },
  { path: '/signup', title: 'Create account', description: 'Create your Aintrix Academy account.' },
  { path:'/leaderboard',title:'Optional Learner Leaderboard',description:'Browse opted-in pseudonymous challenge results with transparent scoring, difficulty filters and weekly or monthly periods.' },
  { path:'/shared-roadmap',title:'Shared Private Roadmap',description:'An explicitly shared, expiring learning roadmap. Access can be revoked by its owner.' },
  { path: '/assessment', title: 'Your Private Skill Assessment', description: 'A private adaptive skill assessment with server-calculated results and a personal learning roadmap.' },
  { path: '/developer-readiness-test', title: 'Free Developer Readiness Test', description: 'Discover your skills with ten adaptive questions across Python, SQL, JavaScript, APIs and debugging. Get honest explanations and next learning steps.' },
  { path: '/python-aptitude-test', title: 'Python Aptitude and Reasoning Practice', description: 'Learn to trace Python values, reason about references and spot boundary cases before taking a broad developer skill check.' },
  { path: '/backend-developer-roadmap', title: 'Backend Developer Learning Roadmap', description: 'A practical sequence from Python and SQL to reliable APIs, authorization, transactions and regression testing.' },
  { path: '/full-stack-developer-roadmap', title: 'Full-Stack Developer Learning Roadmap', description: 'Connect accessible frontend interfaces to secure APIs and relational databases with a practical project-based learning sequence.' },
  { path: '/python-interview-practice', title: 'Python Interview Practice', description: 'Practice predicting output, debugging mistakes and explaining changes to Python solutions without unverified hiring claims.' },
  { path: '/python-coding-challenge', title: 'Python Coding Challenge Practice', description: 'Explore Python sequence, dictionary and algorithm exercises with examples, constraints and an accessible code editor.' },
  { path: '/admin', title: 'Overview · Admin Portal', description: 'Private administration portal for user provisioning and system oversight.' },
  { path: '/admin/overview', title: 'Overview · Admin Portal', description: 'Administration portal overview and core metrics.' },
  { path: '/admin/users', title: 'Users & Staff · Admin Portal', description: 'Create and manage learner and staff accounts.' },
  { path: '/admin/audit-log', title: 'Audit Log · Admin Portal', description: 'Immutable security and audit trail log.' },

  // Role Portals
  { path: '/app', title: 'Home · Student Portal', description: 'Student dashboard with active batches, timetable, and learning progress.' },
  { path: '/app/payments', title: 'Fees & Payments · Student Portal', description: 'Payment records, instalment schedules, and fee balance.' },
  { path: '/app/classes', title: 'Classes · Student Portal', description: 'Live class links, schedule, and join details.' },
  { path: '/app/recordings', title: 'Recordings · Student Portal', description: 'Access past lecture recordings and study materials.' },
  { path: '/app/attendance', title: 'Attendance · Student Portal', description: 'Automated attendance records and certification threshold.' },
  { path: '/app/assignments', title: 'Assignments · Student Portal', description: 'View assigned practical coursework and submit solutions.' },
  { path: '/app/tasks', title: 'Tasks · Student Portal', description: 'Practical technical tasks and batch milestones.' },
  { path: '/app/quizzes', title: 'Quizzes · Student Portal', description: 'Batch knowledge check quizzes and results.' },
  { path: '/app/certificates', title: 'Certificates · Student Portal', description: 'Verified academy course completion certificates.' },

  { path: '/trainer', title: 'Live Classes · Trainer Portal', description: 'Trainer live class scheduling, meeting links, and automated attendance.' },
  { path: '/trainer/batches', title: 'My Batches · Trainer Portal', description: 'Assigned cohort batches and student rosters.' },
  { path: '/trainer/assignments', title: 'Assignments · Trainer Portal', description: 'Publish coursework and review student submissions.' },
  { path: '/trainer/quizzes', title: 'Quizzes · Trainer Portal', description: 'Author multiple-choice quizzes and view student attempts.' },
  { path: '/trainer/tasks', title: 'Tasks · Trainer Portal', description: 'Send practical coding tasks to assigned batches.' },

  { path: '/manager', title: 'Overview · Manager Portal', description: 'Academy operations, revenue overview, and cohort monitoring.' },
  { path: '/manager/programmes', title: 'Programmes · Manager Portal', description: 'Course programmes, default fees, and curriculum details.' },
  { path: '/manager/batches', title: 'Batches · Manager Portal', description: 'Create and schedule cohort batches and assign trainers.' },
  { path: '/manager/students', title: 'Students · Manager Portal', description: 'Onboard and manage student enrolments and fee balances.' },
  { path: '/manager/certificates', title: 'Certificates · Manager Portal', description: 'Issue and verify student completion certificates.' },
  { path: '/manager/tasks', title: 'Tasks & Assignments · Manager Portal', description: 'Overview of batch assignments and progress.' },

  { path: '/finance', title: 'Overview · Finance Portal', description: 'Financial ledger, tuition fee tracking, and operating expenses.' },
  { path: '/finance/payments', title: 'Payments to Verify · Finance Portal', description: 'Verify bank payments against statements and apply to fee balances.' },
  { path: '/finance/expenses', title: 'Expenses · Finance Portal', description: 'Log trainer payouts, software tooling, and facility expenses.' },
  { path: '/finance/ledger', title: 'Ledger · Finance Portal', description: 'Chronological accounting ledger with real-time balance.' },

  { path: '/superadmin', title: 'Overview · Super Admin', description: 'Global administrative control, system settings, and multi-role assignment.' },
  { path: '/superadmin/roles', title: 'Roles & Access · Super Admin', description: 'Manage user roles and staff authorizations across the academy.' },
  { path: '/superadmin/settings', title: 'Settings · Super Admin', description: 'System-wide parameters, thresholds, and administrative overrides.' },
  { path: '/superadmin/audit-log', title: 'Audit Log · Super Admin', description: 'Comprehensive security and modification audit records.' },
  { path: '/superadmin/panels', title: 'Open Any Panel · Super Admin', description: 'Direct developer switchboard to access any portal.' },

  { path: '/', title: 'Aintrix Academy — Learn. Build. Evolve.', description: 'Explore technical programmes, compare package fees and book counselling through email verification, session selection and a pre-session brief.' },
  { path: '/programmes', title: 'Programmes', description: 'Explore Python Full-Stack Software Engineering and all specialised engineering tracks.' },
  { path: '/programmes/python-full-stack', title: 'Python Full-Stack Programme', description: 'Explore the Python full-stack curriculum, eleven learning areas, seven-month duration and Standard, Premium and Elite package fees.' },
  { path: '/programmes/full-stack-app-dev', title: 'Full-Stack Application Development', description: 'Architect end-to-end applications connecting React client interfaces with Django REST backends and PostgreSQL data.' },
  { path: '/programmes/django-backend-dev', title: 'Django & Backend Development', description: 'Build secure, scalable server-side systems, RESTful API endpoints, and database business logic with Django.' },
  { path: '/programmes/react-development', title: 'React Frontend Development', description: 'Master component-driven user interfaces, hooks, state architecture, and responsive web design with modern React.' },
  { path: '/programmes/advanced-python', title: 'Advanced Python & Software Development', description: 'Master object-oriented programming, concurrency, architectural design patterns, and idiomatic Python development.' },
  { path: '/programmes/devops-docker-deployment', title: 'DevOps, Docker & Deployment', description: 'Containerize web applications with Docker, build automated CI/CD workflows, and deploy resilient cloud services.' },
  { path: '/programmes/dsa-technical-interview', title: 'DSA & Technical Interview Preparation', description: 'Conquer coding interviews with structured algorithmic problem-solving, data structures, and mock interview practice.' },
  { path: '/programmes/programming-python-foundation', title: 'Programming & Python Foundation', description: 'First-principles introduction to computer programming, algorithmic thinking, and core Python coding from scratch.' },
  { path: '/programmes/html-css-javascript', title: 'HTML, CSS & Modern JavaScript', description: 'Create semantic, accessible, and responsive user interfaces with modern HTML5, CSS layout systems, and JavaScript.' },
  { path: '/programmes/sql-postgresql', title: 'SQL & PostgreSQL Database Engineering', description: 'Design normalized relational databases, execute complex analytical queries, and maintain data integrity.' },
  { path: '/programmes/software-engineering-testing', title: 'Software Engineering, Testing & APIs', description: 'Learn professional engineering disciplines including automated unit testing, version control, and REST API conventions.' },
  { path: '/programmes/ai-assisted-development', title: 'AI-Assisted Development', description: 'Supercharge development productivity using AI pair programming, prompt engineering, and modern dev automation.' },
  { path: '/learning-experience', title: 'The Learning Experience', description: 'Understand, practise, build, refine and prepare. Explore a structured, practical approach to technical learning.' },
  { path: '/career-support', title: 'Career Support', description: 'Understand mentorship, technical feedback, portfolio preparation and the conditions that apply to internships and placement support.' },
  { path: '/about', title: 'About the Academy', description: 'Discover the philosophy behind a future-focused technical academy connecting theoretical understanding with practical engineering.' },
  { path: '/book-session', title: 'Aintrix Academy — Book Counselling', description: 'Verify your email, choose an available counselling session and share your background, learning goals and preferred programme start date.' },
  { path: '/direct-booking', title: 'Aintrix Academy — Programmes & Direct Booking', description: 'Compare technical programmes and package fees, verify your email, choose a counselling session and prepare your pre-session brief.' },
  { path: '/contact', title: 'Contact & FAQs', description: 'Ask about the Python full-stack programme, explore common questions and enquire about your learning options.' },
  { path: '/privacy-policy', title: 'Privacy Policy — Review Draft', description: 'Review the draft privacy notice and the outstanding business approvals required before enquiry collection is enabled.' },
  { path: '/terms-and-conditions', title: 'Terms & Conditions — Review Draft', description: 'Review draft website terms and the enrolment, fee and internship conditions awaiting academy approval.' },
];
export const navigation = [
  { to: '/developer-readiness-test', label: 'Free skill test' },
  { to: '/', label: 'Home' },
  { to: '/programmes', label: 'Programmes' }, { to: '/learning-experience', label: 'Learning experience' },
  { to: '/about', label: 'About' }, { to: '/contact', label: 'Contact' },
];

export function resolveRoute(pathname: string): { path: string; title: string; description: string } {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const found = routes.find(r => r.path === clean || r.path === pathname);
  if (found) return found;

  if (clean.startsWith('/app')) {
    return { path: pathname, title: 'Student Portal', description: 'Aintrix Academy Student Portal.' };
  }
  if (clean.startsWith('/trainer')) {
    return { path: pathname, title: 'Trainer Portal', description: 'Aintrix Academy Trainer Portal.' };
  }
  if (clean.startsWith('/manager')) {
    return { path: pathname, title: 'Manager Portal', description: 'Aintrix Academy Manager Portal.' };
  }
  if (clean.startsWith('/finance')) {
    return { path: pathname, title: 'Finance Portal', description: 'Aintrix Academy Finance Portal.' };
  }
  if (clean.startsWith('/admin')) {
    return { path: pathname, title: 'Admin Portal', description: 'Aintrix Academy Administration Portal.' };
  }
  if (clean.startsWith('/superadmin')) {
    return { path: pathname, title: 'Super Admin', description: 'Aintrix Academy Super Administration.' };
  }
  if (clean.startsWith('/programmes/')) {
    const slug = clean.replace('/programmes/', '').split('/')[0];
    const name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return { path: pathname, title: `${name} Programme`, description: `Explore ${name} curriculum at Aintrix Academy.` };
  }

  return { path: pathname, title: 'Page not found', description: 'Find your way back to programme information and academy guidance.' };
}
