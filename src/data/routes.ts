export const routes = [
  { path: '/auth/sign-in', title: 'Student Sign-in', description: 'Student account access and authentication service information.' },
  { path: '/auth/admin/sign-in', title: 'Admin Sign-in', description: 'Secure administration account access and authentication service information.' },
  { path: '/admin-panel', title: 'Admin Panel', description: 'Private academy administration for leads, approvals, payments, programme pricing and reports.' },
  { path: '/student-panel', title: 'Student Panel', description: 'Your private learning plan, programme activity and payments workspace.' },
  { path: '/', title: 'Shadow Sphere — Learn. Build. Evolve.', description: 'Explore technical programmes, compare package fees and book counselling through email verification, session selection and a pre-session brief.' },
  { path: '/programmes', title: 'Programmes', description: 'Explore Python Full-Stack Software Engineering: seven months of programming, practical projects and career preparation.' },
  { path: '/programmes/python-full-stack', title: 'Python Full-Stack Programme', description: 'Explore the Python full-stack curriculum, eleven learning areas, seven-month duration and Standard, Premium and Elite package fees.' },
  { path: '/learning-experience', title: 'The Learning Experience', description: 'Understand, practise, build, refine and prepare. Explore a structured, practical approach to technical learning.' },
  { path: '/career-support', title: 'Career Support', description: 'Understand mentorship, technical feedback, portfolio preparation and the conditions that apply to internships and placement support.' },
  { path: '/about', title: 'About the Academy', description: 'Discover the philosophy behind a future-focused technical academy connecting theoretical understanding with practical engineering.' },
  { path: '/book-session', title: 'Shadow Sphere — Book Counselling', description: 'Verify your email, choose an available counselling session and share your background, learning goals and preferred programme start date.' },
  { path: '/direct-booking', title: 'Shadow Sphere — Programmes & Direct Booking', description: 'Compare technical programmes and package fees, verify your email, choose a counselling session and prepare your pre-session brief.' },
  { path: '/contact', title: 'Contact & FAQs', description: 'Ask about the Python full-stack programme, explore common questions and enquire about your learning options.' },
  { path: '/privacy-policy', title: 'Privacy Policy — Review Draft', description: 'Review the draft privacy notice and the outstanding business approvals required before enquiry collection is enabled.' },
  { path: '/terms-and-conditions', title: 'Terms & Conditions — Review Draft', description: 'Review draft website terms and the enrolment, fee and internship conditions awaiting academy approval.' },
];
export const navigation = [
  { to: '/programmes', label: 'Programmes' }, { to: '/learning-experience', label: 'Learning experience' },
  { to: '/about', label: 'About' }, { to: '/contact', label: 'Contact' },
];
