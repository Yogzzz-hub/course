import type { Difficulty, ModuleRef, Skill } from './skills';

/**
 * The versioned question bank for the Developer Reality Check.
 *
 * Every answer key is checked before release by `tests/question-bank.test.ts`:
 * - `stdout` questions run their code (Python, Node or SQLite) and the answer must equal the real output.
 * - `exception` questions must raise the named exception.
 * - `completion` questions substitute each option into a harness; only the answer may print PASS.
 * - `json` questions: only the answer may parse as JSON.
 * - `review` questions are conceptual and carry the date of their last human review.
 * To change a question, add a new version and retire the old one rather than editing it in place,
 * so stored attempts keep pointing at the exact wording they were scored against.
 */
export const BANK_VERSION = '2026.10.1';

export type QuestionKind = 'mcq' | 'output' | 'debug';
export type CodeLanguage = 'python' | 'javascript' | 'sql';
export interface QuestionOption { id: string; text: string }
export type QuestionCheck =
  | { kind: 'review'; reviewed: string }
  | { kind: 'stdout' }
  | { kind: 'exception'; name: string }
  | { kind: 'completion'; template: string }
  | { kind: 'json' };

export interface Question {
  id: string;
  version: number;
  status: 'draft' | 'active' | 'retired';
  skill: Skill;
  difficulty: Difficulty;
  kind: QuestionKind;
  prompt: string;
  code?: { language: CodeLanguage; source: string; fixture?: keyof typeof sqlFixtures };
  options: QuestionOption[];
  /** Options are code and render in monospace. */
  codeOptions?: boolean;
  answer: string;
  explanation: string;
  objective: string;
  module: ModuleRef;
  /** Defaults to the difficulty (1, 2 or 3 points). */
  points?: number;
  /** Shuffle option order per attempt. Defaults to true. */
  shuffle?: boolean;
  check: QuestionCheck;
}

export const sqlFixtures = {
  students: [
    'CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT, city TEXT, score INTEGER);',
    "INSERT INTO students VALUES (1, 'Asha', 'Chennai', 82), (2, 'Ravi', 'Madurai', 67), (3, 'Neha', 'Chennai', 91), (4, 'Imran', 'Coimbatore', 74), (5, 'Lia', 'Madurai', 88);",
    'CREATE TABLE enrolments (student_id INTEGER, course TEXT);',
    "INSERT INTO enrolments VALUES (1, 'Python'), (1, 'SQL'), (3, 'Python'), (5, 'React');",
  ].join('\n'),
};

const lines = (...rows: string[]) => rows.join('\n');
const opts = (...texts: string[]): QuestionOption[] => texts.map((text, index) => ({ id: 'abcdefgh'[index], text }));
const reviewed = (date = '2026-10-21'): QuestionCheck => ({ kind: 'review', reviewed: date });
const pyFoundation = (module: string): ModuleRef => ({ programmeId: 'programming-python-foundation', module });
const dsa = (module: string): ModuleRef => ({ programmeId: 'dsa-technical-interview', module });
const sql = (module: string): ModuleRef => ({ programmeId: 'sql-postgresql', module });
const web = (module: string): ModuleRef => ({ programmeId: 'html-css-javascript', module });
const django = (module: string): ModuleRef => ({ programmeId: 'django-backend-dev', module });
const engineering = (module: string): ModuleRef => ({ programmeId: 'software-engineering-testing', module });
const fullStack = (module: string): ModuleRef => ({ programmeId: 'full-stack-app-dev', module });
const advancedPython = (module: string): ModuleRef => ({ programmeId: 'advanced-python', module });

type Draft = Omit<Question, 'version' | 'status'> & Partial<Pick<Question, 'version' | 'status'>>;
const q = (draft: Draft): Question => ({ version: 1, status: 'active', ...draft });

export const questionBank: Question[] = [
  // ---------------- Python fundamentals ----------------
  q({ id: 'py-list-append', skill: 'python', difficulty: 1, kind: 'output', prompt: 'What does this program print?',
    code: { language: 'python', source: lines('nums = [3, 1, 2]', 'nums.append(4)', 'print(len(nums), nums[-1])') },
    options: opts('4 4', '3 4', '4 2', 'IndexError'), answer: 'a', check: { kind: 'stdout' },
    explanation: 'append adds 4 to the end, so the list has four items and index -1 is the last one: 4.',
    objective: 'Read list length and negative indexing.', module: pyFoundation('Core Data Structures') }),
  q({ id: 'py-slice', skill: 'python', difficulty: 1, kind: 'output', prompt: 'What does this program print?',
    code: { language: 'python', source: lines('name = "python"', 'print(name[1:4])') },
    options: opts('pyt', 'yth', 'ytho', 'yt'), answer: 'b', check: { kind: 'stdout' },
    explanation: 'A slice includes the start index and stops before the end index: characters 1, 2 and 3 are "yth".',
    objective: 'Use string slicing with start and stop indexes.', module: pyFoundation('Computation & Variables') }),
  q({ id: 'py-immutable', skill: 'python', difficulty: 1, kind: 'mcq', prompt: 'Which of these built-in Python types is immutable?',
    options: opts('list', 'dict', 'tuple', 'set'), answer: 'c', check: reviewed(),
    explanation: 'A tuple cannot be changed after it is created. Lists, dicts and sets can be modified in place.',
    objective: 'Distinguish mutable and immutable collections.', module: pyFoundation('Core Data Structures') }),
  q({ id: 'py-default-arg', skill: 'python', difficulty: 2, kind: 'output', prompt: 'What does this program print?',
    code: { language: 'python', source: lines('def add(item, bucket=[]):', '    bucket.append(item)', '    return bucket', '', 'add(1)', 'print(add(2))') },
    options: opts('[2]', '[1, 2]', '[1]', 'TypeError'), answer: 'b', check: { kind: 'stdout' },
    explanation: 'The default list is created once, when the function is defined, so both calls append to the same list. Use bucket=None and create a new list inside the function.',
    objective: 'Recognise shared mutable default arguments.', module: pyFoundation('Functional Decomposition') }),
  q({ id: 'py-dict-count', skill: 'python', difficulty: 2, kind: 'output', prompt: 'What does this program print?',
    code: { language: 'python', source: lines('counts = {}', 'for ch in "banana":', '    counts[ch] = counts.get(ch, 0) + 1', 'print(counts["a"], len(counts))') },
    options: opts('3 3', '3 6', '2 3', '3 2'), answer: 'a', check: { kind: 'stdout' },
    explanation: '"banana" has three a\'s, and three distinct letters (b, a, n), so the dict has three keys.',
    objective: 'Count items with a dictionary and get().', module: pyFoundation('Core Data Structures') }),
  q({ id: 'py-comprehension', skill: 'python', difficulty: 2, kind: 'output', prompt: 'What does this program print?',
    code: { language: 'python', source: lines('squares = [n * n for n in range(5) if n % 2 == 0]', 'print(squares)') },
    options: opts('[0, 4, 16]', '[4, 16]', '[0, 1, 4, 9, 16]', '[1, 9]'), answer: 'a', check: { kind: 'stdout' },
    explanation: 'range(5) is 0 to 4. The filter keeps the even numbers 0, 2 and 4, which square to 0, 4 and 16.',
    objective: 'Read a filtered list comprehension.', module: pyFoundation('Branching & Repetition') }),
  q({ id: 'py-list-aliasing', skill: 'python', difficulty: 3, kind: 'output', prompt: 'What does this program print?',
    code: { language: 'python', source: lines('a = [[0] * 2] * 2', 'a[0][0] = 1', 'print(a)') },
    options: opts('[[1, 0], [0, 0]]', '[[1, 0], [1, 0]]', '[[1, 1], [0, 0]]', '[[1, 1], [1, 1]]'), answer: 'b', check: { kind: 'stdout' },
    explanation: 'Multiplying the outer list copies the reference, so both rows are the same inner list. Changing one changes "both". Build rows with a comprehension instead.',
    objective: 'Understand references when copying nested lists.', module: pyFoundation('Core Data Structures') }),
  q({ id: 'py-generator', skill: 'python', difficulty: 3, kind: 'output', prompt: 'What does this program print?',
    code: { language: 'python', source: lines('def gen():', '    for i in range(3):', '        yield i * 2', '', 'g = gen()', 'next(g)', 'print(list(g))') },
    options: opts('[0, 2, 4]', '[2, 4]', '[4]', '[]'), answer: 'b', check: { kind: 'stdout' },
    explanation: 'next(g) consumes the first value (0). list(g) collects what is left: 2 and 4.',
    objective: 'Reason about generator state.', module: advancedPython('Asynchronous & Concurrent Python') }),
  q({ id: 'py-nonlocal', skill: 'python', difficulty: 3, kind: 'output', prompt: 'What does this program print?',
    code: { language: 'python', source: lines('x = 10', 'def f():', '    x = 5', '    def g():', '        nonlocal x', '        x += 1', '        return x', '    return g() + x', 'print(f(), x)') },
    options: opts('12 10', '11 10', '12 11', 'UnboundLocalError'), answer: 'a', check: { kind: 'stdout' },
    explanation: 'nonlocal makes g change f\'s x from 5 to 6, so g() + x is 6 + 6 = 12. The global x is never touched and stays 10.',
    objective: 'Trace variable scope with nonlocal.', module: pyFoundation('Functional Decomposition') }),

  // ---------------- Logical reasoning ----------------
  q({ id: 'logic-sequence', skill: 'logic', difficulty: 1, kind: 'mcq', prompt: 'What comes next in the sequence 2, 6, 12, 20, 30, …?',
    options: opts('40', '42', '44', '36'), answer: 'b', check: reviewed(),
    explanation: 'The gaps grow by two each time: 4, 6, 8, 10, so the next gap is 12 and 30 + 12 = 42.',
    objective: 'Spot a pattern in differences.', module: dsa('Advanced Algorithmic Patterns') }),
  q({ id: 'logic-loop-sum', skill: 'logic', difficulty: 1, kind: 'output', prompt: 'What does this program print?',
    code: { language: 'python', source: lines('total = 0', 'for i in range(1, 5):', '    total += i', 'print(total)') },
    options: opts('10', '15', '4', '9'), answer: 'a', check: { kind: 'stdout' },
    explanation: 'range(1, 5) is 1, 2, 3 and 4; their sum is 10. The stop value 5 is not included.',
    objective: 'Trace a loop with an exclusive upper bound.', module: pyFoundation('Branching & Repetition') }),
  q({ id: 'logic-deduction', skill: 'logic', difficulty: 1, kind: 'mcq', prompt: 'All developers on a team use Git. Priya is a developer on that team. Which statement must be true?',
    options: opts('Priya uses Git', 'Everyone who uses Git is on the team', 'Only developers use Git', 'Priya leads the team'), answer: 'a', check: reviewed(),
    explanation: 'The rule covers every developer on the team, and Priya is one, so she uses Git. The other statements are not implied.',
    objective: 'Apply a general rule to a specific case.', module: pyFoundation('Branching & Repetition') }),
  q({ id: 'logic-halving', skill: 'logic', difficulty: 2, kind: 'output', prompt: 'What does this program print?',
    code: { language: 'python', source: lines('n = 64', 'steps = 0', 'while n >= 1:', '    n = n / 2', '    steps += 1', 'print(steps)') },
    options: opts('6', '7', '8', '64'), answer: 'b', check: { kind: 'stdout' },
    explanation: 'The loop runs for n = 64, 32, 16, 8, 4, 2 and 1, which is seven times. After that n is 0.5 and the condition fails.',
    objective: 'Count iterations of a halving loop.', module: dsa('Complexity & Linear Structures') }),
  q({ id: 'logic-binary-search', skill: 'logic', difficulty: 2, kind: 'mcq', prompt: 'Binary search looks for a value in a sorted list of 1,000 items. At most how many comparisons does it need?',
    options: opts('10', '100', '500', '1,000'), answer: 'a', check: reviewed(),
    explanation: 'Each comparison halves the remaining range. 2¹⁰ = 1,024 ≥ 1,000, so about 10 comparisons are enough.',
    objective: 'Estimate logarithmic growth.', module: dsa('Complexity & Linear Structures') }),
  q({ id: 'logic-complexity', skill: 'logic', difficulty: 3, kind: 'mcq', prompt: 'What is the time complexity of this code in terms of n?',
    code: { language: 'python', source: lines('for i in range(n):', '    for j in range(i, n):', '        work()') },
    options: opts('O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)'), answer: 'c', check: reviewed(),
    explanation: 'The inner loop runs n, n−1, …, 1 times: about n²/2 calls in total, which grows as O(n²).',
    objective: 'Analyse nested loops.', module: dsa('Complexity & Linear Structures') }),
  q({ id: 'logic-recursion', skill: 'logic', difficulty: 3, kind: 'output', prompt: 'What does this program print?',
    code: { language: 'python', source: lines('def f(n):', '    if n <= 1:', '        return n', '    return f(n - 1) + f(n - 2)', 'print([f(i) for i in range(7)])') },
    options: opts('[0, 1, 1, 2, 3, 5, 8]', '[1, 1, 2, 3, 5, 8, 13]', '[0, 1, 2, 3, 4, 5, 6]', '[0, 1, 1, 2, 3, 5]'), answer: 'a', check: { kind: 'stdout' },
    explanation: 'f is the Fibonacci function starting from f(0) = 0 and f(1) = 1. range(7) gives seven values, up to f(6) = 8.',
    objective: 'Trace a recursive function.', module: dsa('Advanced Algorithmic Patterns') }),

  // ---------------- SQL ----------------
  q({ id: 'sql-where', skill: 'sql', difficulty: 1, kind: 'output', prompt: 'Using the students table, what does this query return?',
    code: { language: 'sql', fixture: 'students', source: 'SELECT name FROM students WHERE score > 80 ORDER BY name;' },
    options: opts('Asha\nLia\nNeha', 'Asha\nNeha', 'Neha\nLia\nAsha', 'Asha\nNeha\nLia'), answer: 'a', codeOptions: true, check: { kind: 'stdout' },
    explanation: 'Asha (82), Neha (91) and Lia (88) scored above 80. ORDER BY name sorts them alphabetically.',
    objective: 'Filter and sort rows.', module: sql('Querying & Filtering Data') }),
  q({ id: 'sql-where-vs-having', skill: 'sql', difficulty: 1, kind: 'mcq', prompt: 'Which clause filters individual rows before they are grouped?',
    options: opts('WHERE', 'HAVING', 'ORDER BY', 'LIMIT'), answer: 'a', codeOptions: true, check: reviewed(),
    explanation: 'WHERE filters rows before GROUP BY. HAVING filters the groups afterwards.',
    objective: 'Know the order of SQL clauses.', module: sql('Querying & Filtering Data') }),
  q({ id: 'sql-group-count', skill: 'sql', difficulty: 2, kind: 'output', prompt: 'Using the students table, what does this query return?',
    code: { language: 'sql', fixture: 'students', source: 'SELECT city, COUNT(*) FROM students GROUP BY city ORDER BY city;' },
    options: opts('Chennai | 2\nCoimbatore | 1\nMadurai | 2', 'Chennai | 2\nMadurai | 2', 'Chennai | 1\nCoimbatore | 1\nMadurai | 1', 'Chennai | 5'), answer: 'a', codeOptions: true, check: { kind: 'stdout' },
    explanation: 'GROUP BY city makes one row per city, and COUNT(*) counts the students in each.',
    objective: 'Aggregate with GROUP BY.', module: sql('Advanced Joins & Analytical SQL') }),
  q({ id: 'sql-having', skill: 'sql', difficulty: 2, kind: 'output', prompt: 'Using the students table, what does this query return?',
    code: { language: 'sql', fixture: 'students', source: 'SELECT city, MAX(score) FROM students GROUP BY city HAVING COUNT(*) > 1 ORDER BY city;' },
    options: opts('Chennai | 91\nMadurai | 88', 'Chennai | 91\nCoimbatore | 74\nMadurai | 88', 'Chennai | 82\nMadurai | 67', 'Neha | 91\nLia | 88'), answer: 'a', codeOptions: true, check: { kind: 'stdout' },
    explanation: 'HAVING keeps only cities with more than one student (Chennai and Madurai), then MAX finds each top score.',
    objective: 'Filter groups with HAVING.', module: sql('Advanced Joins & Analytical SQL') }),
  q({ id: 'sql-left-join', skill: 'sql', difficulty: 3, kind: 'output', prompt: 'Using the students and enrolments tables, what does this query return?',
    code: { language: 'sql', fixture: 'students', source: lines('SELECT s.name, COUNT(e.course)', 'FROM students s', 'LEFT JOIN enrolments e ON e.student_id = s.id', 'GROUP BY s.id', 'ORDER BY s.id;') },
    options: opts('Asha | 2\nRavi | 0\nNeha | 1\nImran | 0\nLia | 1', 'Asha | 2\nNeha | 1\nLia | 1', 'Asha | 2\nRavi | 1\nNeha | 1\nImran | 1\nLia | 1', 'Asha | 1\nRavi | 0\nNeha | 1\nImran | 0\nLia | 1'), answer: 'a', codeOptions: true, check: { kind: 'stdout' },
    explanation: 'LEFT JOIN keeps students with no enrolments. COUNT(e.course) ignores NULLs, so they count 0. COUNT(*) would wrongly count them as 1.',
    objective: 'Combine LEFT JOIN with aggregation.', module: sql('Advanced Joins & Analytical SQL') }),
  q({ id: 'sql-index', skill: 'sql', difficulty: 3, kind: 'mcq', prompt: 'A slow query runs: SELECT * FROM students WHERE city = ? ORDER BY score DESC. Which single index helps it most?',
    options: opts('INDEX ON students (score)', 'INDEX ON students (city, score)', 'INDEX ON students (score, city)', 'INDEX ON students (name)'), answer: 'b', codeOptions: true, check: reviewed(),
    explanation: 'An index that starts with the equality column (city) and then the sort column (score) lets the database find the city and read rows already in score order.',
    objective: 'Choose a composite index for filter-then-sort queries.', module: sql('Indexing, Performance & Transactions') }),

  // ---------------- JavaScript ----------------
  q({ id: 'js-map', skill: 'javascript', difficulty: 1, kind: 'output', prompt: 'What does this program print?',
    code: { language: 'javascript', source: lines('const items = [1, 2, 3];', 'const doubled = items.map(n => n * 2);', 'console.log(doubled.join(","));') },
    options: opts('2,4,6', '1,2,3', '[2, 4, 6]', '246'), answer: 'a', check: { kind: 'stdout' },
    explanation: 'map returns a new array with each item doubled, and join(",") turns it into the string "2,4,6".',
    objective: 'Transform arrays with map.', module: web('JavaScript Language Foundations') }),
  q({ id: 'js-typeof-null', skill: 'javascript', difficulty: 1, kind: 'output', prompt: 'What does this program print?',
    code: { language: 'javascript', source: 'console.log(typeof null);' },
    options: opts('null', 'object', 'undefined', 'NaN'), answer: 'b', check: { kind: 'stdout' },
    explanation: 'typeof null is "object", a long-standing quirk of JavaScript. Check for null with === null.',
    objective: 'Know JavaScript type checks.', module: web('JavaScript Language Foundations') }),
  q({ id: 'js-equality', skill: 'javascript', difficulty: 2, kind: 'output', prompt: 'What does this program print?',
    code: { language: 'javascript', source: 'console.log(0.1 + 0.2 === 0.3, [1, 2] == "1,2");' },
    options: opts('false true', 'true true', 'true false', 'false false'), answer: 'a', check: { kind: 'stdout' },
    explanation: '0.1 + 0.2 is 0.30000000000000004 in floating point. Loose == converts the array to the string "1,2", so the second comparison is true.',
    objective: 'Understand floating point and loose equality.', module: web('JavaScript Language Foundations') }),
  q({ id: 'js-let-closure', skill: 'javascript', difficulty: 2, kind: 'output', prompt: 'What does this program print?',
    code: { language: 'javascript', source: lines('const fns = [];', 'for (let i = 0; i < 3; i++) {', '  fns.push(() => i);', '}', 'console.log(fns.map(f => f()).join(" "));') },
    options: opts('0 1 2', '3 3 3', '2 2 2', 'undefined undefined undefined'), answer: 'a', check: { kind: 'stdout' },
    explanation: 'let creates a new binding of i for every loop iteration, so each closure remembers its own value. With var it would print 3 3 3.',
    objective: 'Reason about closures and block scope.', module: web('JavaScript Language Foundations') }),
  q({ id: 'js-event-loop', skill: 'javascript', difficulty: 3, kind: 'output', prompt: 'What does this program print, line by line?',
    code: { language: 'javascript', source: lines('console.log("A");', 'setTimeout(() => console.log("B"), 0);', 'Promise.resolve().then(() => console.log("C"));', 'console.log("D");') },
    options: opts('A\nD\nC\nB', 'A\nB\nC\nD', 'A\nD\nB\nC', 'A\nC\nD\nB'), answer: 'a', codeOptions: true, check: { kind: 'stdout' },
    explanation: 'Synchronous code runs first (A, D). Promise callbacks are microtasks and run before timer callbacks, so C comes before B.',
    objective: 'Order synchronous code, microtasks and timers.', module: web('DOM Manipulation & Async APIs') }),
  q({ id: 'js-this', skill: 'javascript', difficulty: 3, kind: 'output', prompt: 'What does this program print?',
    code: { language: 'javascript', source: lines('const user = { name: "Mira", greet() { return `Hi ${this?.name}`; } };', 'const greet = user.greet;', 'console.log(user.greet(), greet());') },
    options: opts('Hi Mira Hi Mira', 'Hi Mira Hi undefined', 'TypeError', 'Hi undefined Hi undefined'), answer: 'b', check: { kind: 'stdout' },
    explanation: 'this depends on how a function is called. Called as user.greet(), this is user. Called on its own, this is no longer user, so name is undefined.',
    objective: 'Understand how this is bound.', module: web('JavaScript Language Foundations') }),

  // ---------------- Backend development ----------------
  q({ id: 'be-put', skill: 'backend', difficulty: 1, kind: 'mcq', prompt: 'Which HTTP method is meant to replace a resource and is idempotent?',
    options: opts('POST', 'PUT', 'CONNECT', 'OPTIONS'), answer: 'b', codeOptions: true, check: reviewed(),
    explanation: 'PUT replaces the resource at a URL; sending the same PUT twice leaves the same final state. POST usually creates something new each time.',
    objective: 'Match HTTP methods to their semantics.', module: django('Django REST Framework (DRF)') }),
  q({ id: 'be-secrets', skill: 'backend', difficulty: 1, kind: 'mcq', prompt: 'Where should a deployed web application keep its database password?',
    options: opts('Hard-coded in settings.py', 'In the front-end JavaScript bundle', 'In an environment variable or a secrets manager, outside the repository', 'In the README so the team can find it'), answer: 'c', check: reviewed(),
    explanation: 'Secrets belong in the runtime environment or a secrets manager. Anything in the repository or the browser bundle can leak.',
    objective: 'Keep secrets out of code.', module: django('Django Foundation & Project Setup') }),
  q({ id: 'be-n-plus-one', skill: 'backend', difficulty: 2, kind: 'mcq', prompt: 'A Django view loops over 100 orders and reads order.customer.name for each. Which queryset avoids one extra query per order?',
    options: opts('Order.objects.select_related("customer")', 'Order.objects.all().count()', 'Order.objects.only("id")', 'Order.objects.order_by("customer")'), answer: 'a', codeOptions: true, check: reviewed(),
    explanation: 'select_related joins the customer table in the same query, so reading order.customer does not hit the database again for every order.',
    objective: 'Avoid N+1 queries with the ORM.', module: django('Django ORM & Database Modeling') }),
  q({ id: 'be-password-hash', skill: 'backend', difficulty: 2, kind: 'mcq', prompt: 'How should user passwords be stored?',
    options: opts('As plain text so they can be emailed back', 'Base64-encoded', 'Hashed with a slow, salted algorithm such as Argon2, bcrypt or PBKDF2', 'Encrypted with a key stored next to the database'), answer: 'c', check: reviewed(),
    explanation: 'Slow salted hashes make stolen password data expensive to crack. Base64 is encoding, not protection, and reversible encryption puts every password one key away.',
    objective: 'Store credentials safely.', module: django('Authentication, Security & Testing') }),
  q({ id: 'be-race', skill: 'backend', difficulty: 3, kind: 'mcq', prompt: 'Two requests both read stock = 1 and both decrement it, so one item is sold twice. What prevents this?',
    options: opts('Cache the stock value for a few seconds', 'Make the check and decrement one atomic statement, e.g. UPDATE … SET stock = stock - 1 WHERE id = ? AND stock > 0, and check the affected row count', 'Retry the request if it fails', 'Run more application servers'), answer: 'b', check: reviewed(),
    explanation: 'The bug is a read-then-write race. A conditional atomic update (or a row lock in a transaction) lets only one request succeed.',
    objective: 'Prevent race conditions on shared data.', module: sql('Indexing, Performance & Transactions') }),
  q({ id: 'be-pagination', skill: 'backend', difficulty: 3, kind: 'output', prompt: 'This helper computes which rows a page should show. What does it print?',
    code: { language: 'python', source: lines('def page_slice(total, page, size):', '    start = (page - 1) * size', '    end = min(start + size, total)', '    return start, end', '', 'print(page_slice(23, 3, 10))') },
    options: opts('(20, 23)', '(20, 30)', '(30, 23)', '(21, 23)'), answer: 'a', check: { kind: 'stdout' },
    explanation: 'Page 3 starts after two full pages (20 rows) and stops at the 23 rows that exist.',
    objective: 'Compute pagination bounds.', module: django('Django REST Framework (DRF)') }),

  // ---------------- Debugging ----------------
  q({ id: 'dbg-average', skill: 'debugging', difficulty: 1, kind: 'debug', prompt: 'average([2, 4, 6]) should return 4 but does not. Which replacement for the return line fixes it?',
    code: { language: 'python', source: lines('def average(values):', '    return sum(values) / len(values) - 1') },
    options: opts('return sum(values) / len(values)', 'return sum(values) // len(values) - 1', 'return sum(values) / (len(values) - 1)', 'return len(values) / sum(values)'), answer: 'a', codeOptions: true,
    check: { kind: 'completion', template: lines('def average(values):', '    __BLANK__', '', 'assert average([2, 4, 6]) == 4', 'assert average([5]) == 5', 'assert average([1, 2]) == 1.5', 'print("PASS")') },
    explanation: 'The mean is the sum divided by the count. The extra "- 1" made every answer one too small.',
    objective: 'Find a wrong expression by checking a known input.', module: engineering('Automated Unit Testing with Pytest') }),
  q({ id: 'dbg-keyerror', skill: 'debugging', difficulty: 1, kind: 'debug', prompt: 'Which error does this program raise?',
    code: { language: 'python', source: lines('prices = {"tea": 20}', 'print(prices["coffee"])') },
    options: opts('KeyError', 'IndexError', 'TypeError', 'It prints None'), answer: 'a', check: { kind: 'exception', name: 'KeyError' },
    explanation: 'Indexing a dict with a missing key raises KeyError. Use prices.get("coffee") to get None instead.',
    objective: 'Recognise common Python exceptions.', module: pyFoundation('Core Data Structures') }),
  q({ id: 'dbg-off-by-one', skill: 'debugging', difficulty: 2, kind: 'debug', prompt: 'last_n([1, 2, 3, 4], 2) should return [3, 4]. Which replacement for the return line fixes it for every n ≥ 1?',
    code: { language: 'python', source: lines('def last_n(items, n):', '    return items[len(items) - n - 1:]') },
    options: opts('return items[len(items) - n:]', 'return items[-n - 1:]', 'return items[n:]', 'return items[:n]'), answer: 'a', codeOptions: true,
    check: { kind: 'completion', template: lines('def last_n(items, n):', '    __BLANK__', '', 'assert last_n([1, 2, 3, 4], 2) == [3, 4]', 'assert last_n([1, 2, 3, 4, 5], 2) == [4, 5]', 'assert last_n([7, 8, 9], 1) == [9]', 'print("PASS")') },
    explanation: 'The slice should start n items from the end: len(items) - n. items[n:] only looks right when the list happens to have 2n items.',
    objective: 'Fix an off-by-one error and test more than one input.', module: pyFoundation('Core Data Structures') }),
  q({ id: 'dbg-typeerror', skill: 'debugging', difficulty: 2, kind: 'debug', prompt: 'Which error does this program raise?',
    code: { language: 'python', source: lines('count = 42', 'label = "Total: " + count', 'print(label)') },
    options: opts('TypeError', 'ValueError', 'SyntaxError', 'NameError'), answer: 'a', check: { kind: 'exception', name: 'TypeError' },
    explanation: 'Python will not add a str and an int. Convert explicitly with str(count) or use an f-string.',
    objective: 'Read a TypeError from mixed types.', module: pyFoundation('Computation & Variables') }),
  q({ id: 'dbg-mutate-iterate', skill: 'debugging', difficulty: 3, kind: 'debug', prompt: 'remove_negatives([-1, -2, 3]) returns [-2, 3] instead of [3]. Which replacement for the function body fixes it?',
    code: { language: 'python', source: lines('def remove_negatives(nums):', '    for n in nums:', '        if n < 0:', '            nums.remove(n)', '    return nums') },
    options: opts('return [n for n in nums if n >= 0]', 'return [n for n in nums if n > 0]', 'return nums.sort() or nums', 'return list(filter(lambda n: n < 0, nums))'), answer: 'a', codeOptions: true,
    check: { kind: 'completion', template: lines('def remove_negatives(nums):', '    __BLANK__', '', 'assert remove_negatives([-1, -2, 3]) == [3]', 'assert remove_negatives([4, -5, -6, 7]) == [4, 7]', 'assert remove_negatives([0, -1]) == [0]', 'assert remove_negatives([]) == []', 'print("PASS")') },
    explanation: 'Removing items from a list while looping over it skips the next item. Building a new list avoids that, and >= 0 keeps zero, which is not negative.',
    objective: 'Spot mutation during iteration.', module: advancedPython('Software Quality & Testing') }),
  q({ id: 'dbg-async-foreach', skill: 'debugging', difficulty: 3, kind: 'debug', prompt: 'total(["a", "b", "c"], fetchPrice) should resolve to 13 but resolves to 0. Which replacement for the forEach line fixes it?',
    code: { language: 'javascript', source: lines('async function total(ids, fetchPrice) {', '  let sum = 0;', '  ids.forEach(async id => { sum += await fetchPrice(id); });', '  return sum;', '}') },
    options: opts('for (const id of ids) sum += await fetchPrice(id);', 'ids.map(async id => { sum += await fetchPrice(id); });', 'ids.forEach(id => { sum += fetchPrice(id); });', 'sum = ids.reduce((acc, id) => acc + fetchPrice(id), 0);'), answer: 'a', codeOptions: true,
    check: { kind: 'completion', template: lines('async function total(ids, fetchPrice) {', '  let sum = 0;', '  __BLANK__', '  return sum;', '}', 'const fetchPrice = async id => ({ a: 5, b: 7, c: 1 })[id];', 'total(["a", "b", "c"], fetchPrice).then(result => console.log(result === 13 ? "PASS" : "FAIL " + result));') },
    explanation: 'forEach does not wait for async callbacks, so total returns before any price arrives. A for…of loop awaits each call in turn.',
    objective: 'Debug async code that returns too early.', module: web('DOM Manipulation & Async APIs') }),

  // ---------------- APIs ----------------
  q({ id: 'api-201', skill: 'apis', difficulty: 1, kind: 'mcq', prompt: 'A POST request successfully creates a new course. Which status code fits best?',
    options: opts('200 OK', '201 Created', '204 No Content', '302 Found'), answer: 'b', check: reviewed(),
    explanation: '201 Created says a new resource exists, usually with its URL in the Location header.',
    objective: 'Choose accurate status codes.', module: engineering('RESTful API Design & Specification') }),
  q({ id: 'api-401', skill: 'apis', difficulty: 1, kind: 'mcq', prompt: 'A request reaches a protected endpoint without valid credentials. Which status code is most appropriate?',
    options: opts('400 Bad Request', '401 Unauthorized', '403 Forbidden', '404 Not Found'), answer: 'b', check: reviewed(),
    explanation: '401 means the caller is not authenticated. 403 is for an authenticated caller who is not allowed to do this.',
    objective: 'Tell authentication and authorisation errors apart.', module: fullStack('Security & User Authentication') }),
  q({ id: 'api-json', skill: 'apis', difficulty: 2, kind: 'mcq', prompt: 'Which of these is a valid JSON request body?',
    options: opts('{"name": "Asha", "skills": ["SQL", "Python"]}', "{'name': 'Asha'}", '{name: "Asha"}', '{"name": "Asha",}'), answer: 'a', codeOptions: true, check: { kind: 'json' },
    explanation: 'JSON needs double-quoted keys and strings and does not allow trailing commas.',
    objective: 'Write valid JSON payloads.', module: fullStack('Architecture & Contract Design') }),
  q({ id: 'api-idempotency', skill: 'apis', difficulty: 2, kind: 'mcq', prompt: 'Why would a payment API accept an Idempotency-Key header?',
    options: opts('To encrypt the request body', 'So a retried request is recognised and returns the first result instead of charging twice', 'To make the request faster', 'To identify the user instead of a password'), answer: 'b', check: reviewed(),
    explanation: 'Networks fail and clients retry. The key lets the server spot a repeat and avoid doing the same action twice.',
    objective: 'Design safe retries.', module: engineering('RESTful API Design & Specification') }),
  q({ id: 'api-cursor', skill: 'apis', difficulty: 3, kind: 'mcq', prompt: 'A feed of new posts updates constantly. Clients page through it with ?offset=…&limit=20 and report duplicate or missing posts. What fixes this best?',
    options: opts('Increase the limit to 100', 'Use cursor (keyset) pagination, e.g. ?after=<last id>', 'Cache every page for an hour', 'Sort the feed randomly'), answer: 'b', check: reviewed(),
    explanation: 'With offsets, inserting new rows shifts every page. A cursor continues from the last item seen, so pages stay stable.',
    objective: 'Choose pagination for changing data.', module: django('Django REST Framework (DRF)') }),
  q({ id: 'api-query-string', skill: 'apis', difficulty: 3, kind: 'output', prompt: 'What does this program print?',
    code: { language: 'python', source: lines('from urllib.parse import urlparse, parse_qs', 'url = "https://api.example.com/v1/courses?level=beginner&tag=python&tag=sql"', 'query = parse_qs(urlparse(url).query)', 'print(query["tag"], query["level"][0])') },
    options: opts("['python', 'sql'] beginner", "python beginner", "['sql'] ['beginner']", "sql beginner"), answer: 'a', check: { kind: 'stdout' },
    explanation: 'parse_qs returns a list for every key, so repeated tag parameters are both kept and level is a one-item list.',
    objective: 'Parse repeated query parameters.', module: engineering('RESTful API Design & Specification') }),

  // ---------------- Web fundamentals ----------------
  q({ id: 'web-nav', skill: 'web', difficulty: 1, kind: 'mcq', prompt: 'Which HTML element best wraps a site\'s main navigation links?',
    options: opts('<div>', '<nav>', '<section>', '<aside>'), answer: 'b', codeOptions: true, check: reviewed(),
    explanation: '<nav> tells browsers and screen readers that the links are navigation, so people can jump to them.',
    objective: 'Use semantic HTML landmarks.', module: web('Semantic Markup & Accessibility') }),
  q({ id: 'web-alt', skill: 'web', difficulty: 1, kind: 'mcq', prompt: 'What is the alt attribute on an image for?',
    options: opts('It sets the image size', 'It describes the image for screen readers and when the image cannot load', 'It adds a hover tooltip only', 'It improves image compression'), answer: 'b', check: reviewed(),
    explanation: 'alt text is read aloud by screen readers and shown if the image fails. Decorative images use alt="".',
    objective: 'Write accessible images.', module: web('Semantic Markup & Accessibility') }),
  q({ id: 'web-specificity', skill: 'web', difficulty: 2, kind: 'mcq', prompt: 'For <p id="intro" class="lead">, these rules all apply: p { color: green } .lead { color: blue } #intro { color: red }. Which colour wins?',
    options: opts('Red', 'Blue', 'Green', 'Whichever rule is last in the file'), answer: 'a', check: reviewed(),
    explanation: 'An id selector is more specific than a class, which beats an element selector. Source order only breaks ties.',
    objective: 'Apply CSS specificity.', module: web('Modern CSS & Responsive Design') }),
  q({ id: 'web-box-sizing', skill: 'web', difficulty: 2, kind: 'mcq', prompt: 'What does box-sizing: border-box change?',
    options: opts('The width includes padding and border', 'Borders become rounded', 'The element ignores margins', 'Content can no longer overflow'), answer: 'a', check: reviewed(),
    explanation: 'With border-box, width: 200px is the total width including padding and border, which makes layouts easier to predict.',
    objective: 'Understand the CSS box model.', module: web('Modern CSS & Responsive Design') }),
  q({ id: 'web-xss', skill: 'web', difficulty: 3, kind: 'mcq', prompt: 'A page shows user-submitted comments. Which approach prevents cross-site scripting (XSS)?',
    options: opts('Insert the comment with element.innerHTML', 'Render the comment as text (e.g. textContent or a framework\'s escaped output)', 'Hide the comment until the page loads', 'Store comments in localStorage'), answer: 'b', check: reviewed(),
    explanation: 'Treating user input as text means the browser never runs it as HTML or script. innerHTML would execute injected markup.',
    objective: 'Prevent XSS by escaping output.', module: fullStack('Security & User Authentication') }),
  q({ id: 'web-cookie', skill: 'web', difficulty: 3, kind: 'mcq', prompt: 'Which attributes should a session cookie usually have?',
    options: opts('HttpOnly, Secure and SameSite', 'Only Expires', 'Domain set to every subdomain', 'None — the browser handles it'), answer: 'a', codeOptions: true, check: reviewed(),
    explanation: 'HttpOnly keeps scripts from reading it, Secure sends it only over HTTPS, and SameSite limits cross-site requests.',
    objective: 'Configure session cookies safely.', module: fullStack('Security & User Authentication') }),
];

export const activeQuestions = (bank: Question[] = questionBank) => bank.filter(question => question.status === 'active');
export const pointsFor = (question: Question) => question.points ?? question.difficulty;
