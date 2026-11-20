/**
 * API Route Specifications & HTTP Methods
 */
export const API_ENDPOINTS = {
  // Auth
  LOGIN: { path: '/v1/auth/login', method: 'POST' },
  LOGOUT: { path: '/v1/auth/logout', method: 'POST' },
  ME: { path: '/v1/me', method: 'GET' },
  DEV_LOGIN_AS: { path: '/v1/dev/login-as', method: 'POST' },
  HEALTH: { path: '/v1/health', method: 'GET' },

  // Student
  STUDENT_OVERVIEW: { path: '/v1/student/overview', method: 'GET' },
  STUDENT_PAYMENTS: { path: '/v1/student/payments', method: 'GET' },
  STUDENT_RECORD_PAYMENT: { path: '/v1/student/payments', method: 'POST' },
  STUDENT_CLASSES: { path: '/v1/student/classes', method: 'GET' },
  STUDENT_PRESENCE: { path: '/v1/student/classes/:id/presence', method: 'POST' },
  STUDENT_RECORDINGS: { path: '/v1/student/recordings', method: 'GET' },
  STUDENT_ATTENDANCE: { path: '/v1/student/attendance', method: 'GET' },
  STUDENT_ASSIGNMENTS: { path: '/v1/student/assignments', method: 'GET' },
  STUDENT_SUBMIT_ASSIGNMENT: { path: '/v1/student/assignments/:id/submit', method: 'POST' },
  STUDENT_TASKS: { path: '/v1/student/tasks', method: 'GET' },
  STUDENT_TOGGLE_TASK: { path: '/v1/student/tasks/:id/done', method: 'POST' },
  STUDENT_QUIZZES: { path: '/v1/student/quizzes', method: 'GET' },
  STUDENT_ATTEMPT_QUIZ: { path: '/v1/student/quizzes/:id/attempt', method: 'POST' },
  STUDENT_CERTIFICATES: { path: '/v1/student/certificates', method: 'GET' },

  // Trainer
  TRAINER_CLASSES: { path: '/v1/trainer/classes', method: 'GET' },
  TRAINER_CLASS_ROSTER: { path: '/v1/trainer/classes/:id/roster', method: 'GET' },
  TRAINER_START_CLASS: { path: '/v1/trainer/classes/:id/start', method: 'POST' },
  TRAINER_END_CLASS: { path: '/v1/trainer/classes/:id/end', method: 'POST' },
  TRAINER_BATCHES: { path: '/v1/trainer/batches', method: 'GET' },
  TRAINER_BATCH_ASSIGNMENTS: { path: '/v1/trainer/batches/:id/assignments', method: 'GET' },
  TRAINER_CREATE_ASSIGNMENT: { path: '/v1/trainer/batches/:id/assignments', method: 'POST' },
  TRAINER_SUBMISSIONS: { path: '/v1/trainer/assignments/:id/submissions', method: 'GET' },
  TRAINER_GRADE_SUBMISSION: { path: '/v1/trainer/submissions/:id', method: 'PATCH' },
  TRAINER_BATCH_QUIZZES: { path: '/v1/trainer/batches/:id/quizzes', method: 'GET' },
  TRAINER_BATCH_TASKS: { path: '/v1/trainer/batches/:id/tasks', method: 'GET' },

  // Manager
  MANAGER_OVERVIEW: { path: '/v1/manager/overview', method: 'GET' },
  MANAGER_PROGRAMMES: { path: '/v1/manager/programmes', method: 'GET' },
  MANAGER_CREATE_PROGRAMME: { path: '/v1/manager/programmes', method: 'POST' },
  MANAGER_BATCHES: { path: '/v1/manager/batches', method: 'GET' },
  MANAGER_CREATE_BATCH: { path: '/v1/manager/batches', method: 'POST' },
  MANAGER_BATCH_DETAIL: { path: '/v1/manager/batches/:id', method: 'GET' },
  MANAGER_STUDENTS: { path: '/v1/manager/students', method: 'GET' },
  MANAGER_ENROL_STUDENT: { path: '/v1/manager/students', method: 'POST' },
  MANAGER_CERTIFICATES: { path: '/v1/manager/certificates', method: 'GET' },
  MANAGER_ELIGIBILITY: { path: '/v1/manager/certificates/eligibility', method: 'GET' },
  MANAGER_ISSUE_CERTIFICATE: { path: '/v1/manager/enrolments/:id/certificate', method: 'POST' },
  MANAGER_TASKS_OVERVIEW: { path: '/v1/manager/tasks-overview', method: 'GET' },

  // Finance
  FINANCE_OVERVIEW: { path: '/v1/finance/overview', method: 'GET' },
  FINANCE_PAYMENTS: { path: '/v1/finance/payments', method: 'GET' },
  FINANCE_VERIFY_PAYMENT: { path: '/v1/finance/payments/:id/verify', method: 'POST' },
  FINANCE_REJECT_PAYMENT: { path: '/v1/finance/payments/:id/reject', method: 'POST' },
  FINANCE_EXPENSES: { path: '/v1/finance/expenses', method: 'GET' },
  FINANCE_LOG_EXPENSE: { path: '/v1/finance/expenses', method: 'POST' },
  FINANCE_LEDGER: { path: '/v1/finance/ledger', method: 'GET' },

  // Admin & Super Admin
  ADMIN_OVERVIEW: { path: '/v1/admin/overview', method: 'GET' },
  ADMIN_USERS: { path: '/v1/admin/users', method: 'GET' },
  ADMIN_CREATE_USER: { path: '/v1/admin/users', method: 'POST' },
  ADMIN_AUDIT_LOG: { path: '/v1/admin/audit-log', method: 'GET' },
  SUPERADMIN_OVERVIEW: { path: '/v1/superadmin/overview', method: 'GET' },
  SUPERADMIN_USERS: { path: '/v1/superadmin/users', method: 'GET' },
  SUPERADMIN_UPDATE_ROLES: { path: '/v1/superadmin/users/:id/roles', method: 'PUT' },
  SUPERADMIN_SETTINGS: { path: '/v1/superadmin/settings', method: 'GET' },
  SUPERADMIN_UPDATE_SETTINGS: { path: '/v1/superadmin/settings', method: 'PUT' },
  SUPERADMIN_AUDIT_LOG: { path: '/v1/superadmin/audit-log', method: 'GET' },
} as const;
