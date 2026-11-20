export const programme = {
  slug: '/programmes/python-full-stack',
  name: 'Python Full-Stack Software Engineering',
  fullName: '7-Month Python Full-Stack Software Engineering & Placement Preparation',
  duration: '7 months',
  description: 'Connect the dots between code, interfaces, databases and deployment. A structured path from programming fundamentals to full-stack development and career preparation.',
  technologies: ['Python', 'Django', 'React', 'PostgreSQL', 'Docker', 'Git'],
};
export const courses = [
  { name: 'Programming & Python Foundation', fee: 12000, topics: ['Programming fundamentals', 'Python'] },
  { name: 'Advanced Python & Software Development', fee: 15000, topics: ['Advanced Python', 'Software development'] },
  { name: 'SQL & PostgreSQL', fee: 11000, topics: ['SQL', 'PostgreSQL'] },
  { name: 'Django & Backend Development', fee: 20000, topics: ['Django', 'Backend development'] },
  { name: 'HTML, CSS & JavaScript', fee: 12000, topics: ['HTML', 'CSS', 'JavaScript'] },
  { name: 'React Development', fee: 15000, topics: ['React', 'Frontend development'] },
  { name: 'Full-Stack Application Development', fee: 22000, topics: ['Full-stack integration', 'Application development'] },
  { name: 'Software Engineering, Testing & APIs', fee: 9000, topics: ['Software engineering', 'Software testing', 'REST APIs', 'Git'] },
  { name: 'DevOps, Docker & Deployment', fee: 15000, topics: ['DevOps', 'Docker', 'Deployment fundamentals', 'Cloud fundamentals'] },
  { name: 'DSA & Technical Interview Preparation', fee: 21000, topics: ['Data structures and algorithms', 'Technical interview preparation'] },
  { name: 'AI-Assisted Development', fee: 5000, topics: ['AI-assisted development'] },
];
export const packages = [
  { name: 'Standard', price: 59999, caption: 'Training & project practice', inclusions: ['Training', 'Projects', 'Placement support', 'Free internship*'] },
  { name: 'Premium', price: 79999, caption: 'Focused career preparation', inclusions: ['Full programme', 'Intensive placement preparation', 'Paid internship*'] },
  { name: 'Elite', price: 99999, caption: 'Mentorship & advanced projects', inclusions: ['Mentorship', 'Advanced projects', 'Stronger placement support'] },
];
export const money = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
export const courseTotal = courses.reduce((total, course) => total + course.fee, 0);
export const journey = [
  { title: 'Understand', text: 'Build a clear foundation. Connect new concepts to the problems they help you solve.' },
  { title: 'Practise', text: 'Turn understanding into confidence through guided technical exercises.' },
  { title: 'Build', text: 'Bring the pieces together in end-to-end programme projects.' },
  { title: 'Refine', text: 'Use technical feedback to revisit decisions and improve your work.' },
  { title: 'Prepare', text: 'Develop your portfolio, practise interviews and plan your next step.' },
];
