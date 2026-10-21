/**
 * Search landing pages. Each one describes a real tool on this site and links into it.
 * Copy states only what the tools actually do; no rankings, outcomes or employer claims.
 */
export interface LandingPage {
  path: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  tool: { label: string; to: string; note: string };
  sections: { heading: string; body: string; points?: string[] }[];
  faqs: { question: string; answer: string }[];
  related: { label: string; to: string }[];
}

export const landingPages: LandingPage[] = [
  {
    path: '/python-aptitude-test',
    title: 'Free Python Aptitude Test',
    description: 'A free, adaptive Python aptitude test: predict program output, fix bugs and reason about lists, dictionaries, scope and generators, with an explanation for every answer.',
    h1: 'Free Python aptitude test',
    lede: 'Find out how well you really read and reason about Python. Ten adaptive questions, an explanation for every answer, and no account needed.',
    tool: { label: 'Start the Python test', to: '/skill-test?focus=core', note: 'Choose "Core developer mix" for a Python-heavy test.' },
    sections: [
      { heading: 'What the Python questions check', body: 'Most questions show a short program and ask what it prints, or which one-line fix makes it correct. Each answer key is verified by actually running the code before the question is published.', points: ['Indexing, slicing and list methods', 'Dictionaries and counting patterns', 'Comprehensions and loops', 'Function scope, default arguments and nonlocal', 'Generators and references to shared objects', 'Reading exceptions such as KeyError and TypeError'] },
      { heading: 'How the difficulty adapts', body: 'You choose a starting level. A correct answer moves the next question up a level; a missed one moves it down. Harder questions are worth more points, and your result shows both your score and the level the test settled at.' },
      { heading: 'What you get at the end', body: 'A skill-by-skill breakdown, your strengths and gaps in plain language, the correct answer and explanation for every question, and the programme modules that teach what you missed.' },
    ],
    faqs: [
      { question: 'Is the Python aptitude test free?', answer: 'Yes. It is free and you do not need an account to take it.' },
      { question: 'How long does it take?', answer: 'Ten questions, usually five to ten minutes.' },
      { question: 'Is my score compared with other people?', answer: 'No. Your result is calculated only from your own answers. There are no percentiles or rankings in the test.' },
      { question: 'Are my answers stored?', answer: 'Only if you tick "Save my progress on this device", and then only in your own browser. You can delete it at any time from Privacy choices.' },
    ],
    related: [{ label: 'Developer readiness test', to: '/developer-readiness-test' }, { label: 'Python interview practice', to: '/python-interview-practice' }, { label: 'Programming & Python Foundation', to: '/programmes/programming-python-foundation' }],
  },
  {
    path: '/developer-readiness-test',
    title: 'Developer Readiness Test',
    description: 'Check your skills across Python, logic, SQL, JavaScript, backend, APIs, debugging and web fundamentals. Free, adaptive and explained answer by answer.',
    h1: 'Are you ready for your next developer interview?',
    lede: 'A broad, honest check across eight areas developers are commonly asked about. Discover your skills, identify your gaps and build a roadmap from the results.',
    tool: { label: 'Take the free skill test', to: '/skill-test?focus=fullstack', note: 'Pick the full-stack focus to cover all eight areas.' },
    sections: [
      { heading: 'Eight skill areas', body: 'Questions are drawn from a versioned bank covering the areas below. With the full-stack focus, the test rotates through all of them.', points: ['Python fundamentals', 'Logical reasoning and complexity', 'SQL queries, joins and indexes', 'JavaScript behaviour, closures and the event loop', 'Backend design, security and data consistency', 'HTTP APIs, status codes and pagination', 'Debugging Python and asynchronous JavaScript', 'Semantic HTML, CSS and web security'] },
      { heading: 'Honest about its limits', body: 'Ten questions can show where you are strong and where to practise. They cannot decide whether you are ready for a particular job, so the results never claim that. A skill with only one question is marked "not enough evidence".' },
      { heading: 'From result to roadmap', body: 'When you finish, one click turns your measured skills into an ordered learning roadmap for the role you are aiming at, with matching programme modules.' },
    ],
    faqs: [
      { question: 'What does "adaptive" mean here?', answer: 'Each correct answer raises the difficulty of the next question and each missed answer lowers it, within beginner, intermediate and advanced levels.' },
      { question: 'Can I retake the test?', answer: 'Yes. Each attempt draws questions and option order afresh, so retakes vary.' },
      { question: 'Does the result mean I will get a job?', answer: 'No. It is a learning check. Hiring depends on many things a short test cannot measure.' },
    ],
    related: [{ label: 'Backend developer roadmap', to: '/backend-developer-roadmap' }, { label: 'Full-stack developer roadmap', to: '/full-stack-developer-roadmap' }, { label: 'All programmes', to: '/programmes' }],
  },
  {
    path: '/python-coding-challenge',
    title: 'Python Coding Challenges',
    description: 'Practise Python by writing real functions against stated examples and constraints, then check you understand your solution with follow-up questions.',
    h1: 'Python coding challenges',
    lede: 'Write functions that solve real problems: arrays, strings, dictionaries, error handling and data processing. Then prove you understand the code with follow-up questions.',
    tool: { label: 'Open the coding arena', to: '/coding-arena', note: 'Live judging needs the academy\'s sandbox service; the arena shows its current status.' },
    sections: [
      { heading: 'How a challenge works', body: 'Each challenge gives a problem statement, examples and constraints. Your function is judged against the specification with public examples plus private edge-case, boundary and randomised tests, so any correct approach passes, not just one reference answer.', points: ['Beginner exercises on conditions, loops and functions', 'Intermediate problems on strings, dictionaries and data processing', 'Advanced problems on algorithms and backend-style logic'] },
      { heading: 'Understanding checks, not AI detection', body: 'Nobody can reliably tell from code alone whether AI helped write it, so the arena does not try. Instead, after you submit, it asks you to predict outputs, spot bugs and choose correct modifications for your problem. You can say openly whether you used AI help, and practise in either AI-assisted or independent mode.' },
      { heading: 'Safe by design', body: 'Submitted code is never run in your browser or on the website\'s server. It runs only in an isolated sandbox with time, memory and network limits. If that sandbox is unavailable, judging is switched off rather than run unsafely.' },
    ],
    faqs: [
      { question: 'Which languages are supported?', answer: 'Python first. The judging system is built so JavaScript and other languages can be added as separate adapters.' },
      { question: 'Will a different but correct solution pass?', answer: 'Yes. Tests check results against the problem specification, not against one model answer.' },
      { question: 'What happens if the judging service fails?', answer: 'You see a judging-system error, not a failed result, and the submission can be judged again.' },
    ],
    related: [{ label: 'Python interview practice', to: '/python-interview-practice' }, { label: 'DSA & Technical Interview Preparation', to: '/programmes/dsa-technical-interview' }, { label: 'Leaderboard', to: '/leaderboard' }],
  },
  {
    path: '/backend-developer-roadmap',
    title: 'Backend Developer Roadmap',
    description: 'An ordered backend developer roadmap: Python, SQL, HTTP and APIs, Django, authentication, testing and deployment, with projects and matching modules.',
    h1: 'Backend developer roadmap',
    lede: 'The skills a backend developer builds on, in the order they depend on each other, with a project for each stage. Generate a personal version from your own skill test results.',
    tool: { label: 'Build my backend roadmap', to: '/roadmap?role=backend', note: 'Uses your latest skill test result if you have one.' },
    sections: [
      { heading: 'The stages, in order', body: 'Each stage builds on the one before it. The personal roadmap skips what your test already shows and moves your gaps to the front.', points: ['Python fundamentals: data structures, functions, errors', 'SQL: queries, joins, aggregation, indexes', 'HTTP and REST API design: methods, status codes, pagination', 'Django and the ORM: models, queries, avoiding N+1', 'Authentication and security: password hashing, sessions, secrets', 'Testing: unit and integration tests with pytest', 'Deployment: containers, environment configuration, CI'] },
      { heading: 'Projects that prove each stage', body: 'A command-line data tool, a normalised database with reporting queries, a REST API with pagination and authentication, and a tested, containerised service.' },
      { heading: 'Where the academy covers it', body: 'Django & Backend Development, SQL & PostgreSQL, Software Engineering, Testing & APIs and DevOps, Docker & Deployment, all also part of the Python Full-Stack programme.' },
    ],
    faqs: [
      { question: 'Do I need to know JavaScript for backend work?', answer: 'Not to start. It helps when working with front-end teams, which is why the full-stack roadmap includes it.' },
      { question: 'Is the roadmap the same for everyone?', answer: 'The stages are the same; your personal roadmap reorders them using your demonstrated skills and what you tell it.' },
    ],
    related: [{ label: 'Full-stack developer roadmap', to: '/full-stack-developer-roadmap' }, { label: 'Django & Backend Development', to: '/programmes/django-backend-dev' }, { label: 'Developer readiness test', to: '/developer-readiness-test' }],
  },
  {
    path: '/full-stack-developer-roadmap',
    title: 'Full-Stack Developer Roadmap',
    description: 'A full-stack developer roadmap from HTML, CSS and JavaScript through React, Python, SQL and Django to testing and deployment, with projects for each stage.',
    h1: 'Full-stack developer roadmap',
    lede: 'Interface, logic, data and delivery: the four layers of a full-stack application, ordered so each stage builds on the last. Generate your own from a skill test.',
    tool: { label: 'Build my full-stack roadmap', to: '/roadmap?role=fullstack', note: 'Uses your latest skill test result if you have one.' },
    sections: [
      { heading: 'Four layers', body: 'A full-stack developer works across all of them, so the roadmap alternates between front end and back end once the foundations are in place.', points: ['The interface: semantic HTML, CSS layout, JavaScript, React', 'The logic: Python, Django, REST APIs', 'The data: SQL and PostgreSQL', 'The delivery: Git, testing, Docker and deployment'] },
      { heading: 'Projects across the stack', body: 'A responsive static site, an interactive React app talking to a public API, a Django REST backend with a PostgreSQL database, and a combined application with authentication, tests and a deployment pipeline.' },
      { heading: 'Where the academy covers it', body: 'The seven-month Python Full-Stack Software Engineering programme covers all eleven learning areas; individual tracks cover each layer on its own.' },
    ],
    faqs: [
      { question: 'Should I learn front end or back end first?', answer: 'Learn programming fundamentals first; then either order works. The personal roadmap starts with whichever layer your results show is weaker.' },
      { question: 'How long does the full roadmap take?', answer: 'It depends on your starting point and time. The academy\'s flagship programme runs for seven months.' },
    ],
    related: [{ label: 'Backend developer roadmap', to: '/backend-developer-roadmap' }, { label: 'Python Full-Stack programme', to: '/programmes/python-full-stack' }, { label: 'Full-Stack Application Development', to: '/programmes/full-stack-app-dev' }],
  },
  {
    path: '/python-interview-practice',
    title: 'Python Interview Practice',
    description: 'Practise for Python technical interviews: predict output, debug, analyse complexity and explain your code, with free tests and coding challenges.',
    h1: 'Python interview practice',
    lede: 'Technical interviews ask you to read, write and explain code under pressure. Practise each of those skills separately, with feedback.',
    tool: { label: 'Practise with the skill test', to: '/skill-test', note: 'Then move on to coding challenges and understanding checks.' },
    sections: [
      { heading: 'Skills interviews commonly exercise', body: 'These come up across many technical interviews. Practise reading code as much as writing it.', points: ['Predicting what a short program prints', 'Spotting and fixing a bug from a failing input', 'Choosing a data structure and explaining why', 'Estimating time complexity of loops and recursion', 'Handling edge cases: empty input, duplicates, negatives', 'Explaining your solution clearly as you go'] },
      { heading: 'A practice loop that works', body: 'Attempt a problem, check it against tests, then explain it out loud or answer follow-up questions about it. The understanding checks in the coding arena are built around exactly this.' },
      { heading: 'When you want structured help', body: 'The DSA & Technical Interview Preparation track adds mock interviews and live coding practice with feedback.' },
    ],
    faqs: [
      { question: 'Which topics should I practise first?', answer: 'Start where your skill test shows gaps. Its results list the specific objectives behind each missed question.' },
      { question: 'Do you guarantee interview success?', answer: 'No. Practice improves your skills; interview outcomes depend on many other factors.' },
    ],
    related: [{ label: 'Python coding challenges', to: '/python-coding-challenge' }, { label: 'DSA & Technical Interview Preparation', to: '/programmes/dsa-technical-interview' }, { label: 'Python aptitude test', to: '/python-aptitude-test' }],
  },
];

export const landingPaths = landingPages.map(page => page.path);
export const landingFor = (path: string) => landingPages.find(page => page.path === path);
