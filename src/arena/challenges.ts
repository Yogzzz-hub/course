import type { Difficulty, Skill } from '../assessment/skills';

/**
 * Public challenge data: everything a visitor may see. Hidden tests, reference solutions and
 * faulty solutions live in /judge, which the browser bundle never imports.
 */
export type Comparator = { kind: 'exact' } | { kind: 'unordered' } | { kind: 'float'; tolerance: number };
export interface Rubric { correctness: number; edge: number; understanding: number; quality: number }
export interface PublicExample { id: string; args: unknown[]; expect: { value: unknown } | { error: string }; note?: string }
export interface Challenge {
  id: string;
  version: number;
  title: string;
  difficulty: Difficulty;
  topics: string[];
  skills: Skill[];
  language: 'python';
  functionName: string;
  signature: string;
  statement: string;
  constraints: string[];
  examples: PublicExample[];
  starter: string;
  comparator: Comparator;
  rubric: Rubric;
  limits: { cpuMs: number; wallMs: number; memoryKb: number; outputKb: number };
  /** Programme that teaches this; used for course recommendations. */
  programmeId: string;
}

export const defaultRubric: Rubric = { correctness: 60, edge: 20, understanding: 15, quality: 5 };
const limits = { cpuMs: 2000, wallMs: 5000, memoryKb: 128_000, outputKb: 256 };
const exact: Comparator = { kind: 'exact' };

export const challenges: Challenge[] = [
  { id: 'second-largest', version: 1, title: 'Second largest value', difficulty: 1, topics: ['Arrays', 'Edge cases'], skills: ['python', 'logic'], language: 'python', functionName: 'second_largest', signature: 'second_largest(nums: list[int]) -> int | None',
    statement: 'Return the second-largest **distinct** value in `nums`. If there are fewer than two distinct values, return `None`.',
    constraints: ['0 ≤ len(nums) ≤ 100,000', 'Values are integers between −10⁹ and 10⁹', 'Do not modify the input list'],
    examples: [{ id: 'ex1', args: [[4, 1, 7, 3]], expect: { value: 4 } }, { id: 'ex2', args: [[5, 5, 2]], expect: { value: 2 }, note: 'Duplicates count once.' }, { id: 'ex3', args: [[9]], expect: { value: null } }],
    starter: 'def second_largest(nums):\n    # Return the second-largest distinct value, or None.\n    pass\n', comparator: exact, rubric: defaultRubric, limits, programmeId: 'programming-python-foundation' },
  { id: 'palindrome', version: 1, title: 'Palindrome check', difficulty: 1, topics: ['Strings'], skills: ['python'], language: 'python', functionName: 'is_palindrome', signature: 'is_palindrome(text: str) -> bool',
    statement: 'Return `True` if `text` reads the same forwards and backwards when you ignore letter case and every character that is not a letter or digit. An empty string counts as a palindrome.',
    constraints: ['0 ≤ len(text) ≤ 100,000'],
    examples: [{ id: 'ex1', args: ['Race car'], expect: { value: true } }, { id: 'ex2', args: ['A man, a plan, a canal: Panama'], expect: { value: true } }, { id: 'ex3', args: ['hello'], expect: { value: false } }],
    starter: 'def is_palindrome(text):\n    pass\n', comparator: exact, rubric: defaultRubric, limits, programmeId: 'programming-python-foundation' },
  { id: 'word-frequencies', version: 1, title: 'Word frequencies', difficulty: 2, topics: ['Dictionaries', 'Strings'], skills: ['python'], language: 'python', functionName: 'word_frequencies', signature: 'word_frequencies(text: str) -> dict[str, int]',
    statement: 'Lower-case `text`, then treat every maximal run of the letters `a`–`z` as a word. Return a dictionary mapping each word to how many times it appears. Anything else (digits, apostrophes, punctuation, spaces) separates words.',
    constraints: ['0 ≤ len(text) ≤ 100,000', 'Dictionary order does not matter'],
    examples: [{ id: 'ex1', args: ['The cat and the hat.'], expect: { value: { the: 2, cat: 1, and: 1, hat: 1 } } }, { id: 'ex2', args: [''], expect: { value: {} } }],
    starter: 'def word_frequencies(text):\n    pass\n', comparator: exact, rubric: defaultRubric, limits, programmeId: 'programming-python-foundation' },
  { id: 'fizzbuzz', version: 1, title: 'FizzBuzz list', difficulty: 1, topics: ['Conditions', 'Loops'], skills: ['python', 'logic'], language: 'python', functionName: 'fizzbuzz', signature: 'fizzbuzz(n: int) -> list[str]',
    statement: 'Return a list for the numbers 1 to `n` inclusive. Use `"FizzBuzz"` for multiples of 15, `"Fizz"` for other multiples of 3, `"Buzz"` for other multiples of 5, and the number as a string otherwise.',
    constraints: ['0 ≤ n ≤ 10,000'],
    examples: [{ id: 'ex1', args: [5], expect: { value: ['1', '2', 'Fizz', '4', 'Buzz'] } }, { id: 'ex2', args: [0], expect: { value: [] } }],
    starter: 'def fizzbuzz(n):\n    pass\n', comparator: exact, rubric: defaultRubric, limits, programmeId: 'programming-python-foundation' },
  { id: 'merge-intervals', version: 1, title: 'Merge intervals', difficulty: 3, topics: ['Algorithms', 'Sorting'], skills: ['logic', 'python'], language: 'python', functionName: 'merge_intervals', signature: 'merge_intervals(intervals: list[list[int]]) -> list[list[int]]',
    statement: 'Each interval is `[start, end]` with `start ≤ end`. Merge every pair of intervals that overlap or touch, and return the result sorted by start.',
    constraints: ['0 ≤ len(intervals) ≤ 10,000', '−10⁶ ≤ start ≤ end ≤ 10⁶'],
    examples: [{ id: 'ex1', args: [[[1, 3], [2, 6], [8, 10]]], expect: { value: [[1, 6], [8, 10]] } }, { id: 'ex2', args: [[[5, 6], [1, 2]]], expect: { value: [[1, 2], [5, 6]] } }, { id: 'ex3', args: [[[1, 2], [2, 4]]], expect: { value: [[1, 4]] }, note: 'Touching intervals merge.' }],
    starter: 'def merge_intervals(intervals):\n    pass\n', comparator: exact, rubric: defaultRubric, limits, programmeId: 'dsa-technical-interview' },
  { id: 'parse-price', version: 1, title: 'Parse a price', difficulty: 2, topics: ['Error handling', 'Strings'], skills: ['python', 'debugging'], language: 'python', functionName: 'parse_price', signature: 'parse_price(text: str) -> float',
    statement: 'Parse a price such as `"₹1,299.50"`. Surrounding whitespace is allowed, then an optional `₹`, then digits (commas may separate digit groups), then optionally `.` and one or two digits. Return the value as a float. For anything else, raise `ValueError`.',
    constraints: ['Negative numbers, exponents and more than two decimal places are invalid'],
    examples: [{ id: 'ex1', args: ['₹1,299.50'], expect: { value: 1299.5 } }, { id: 'ex2', args: [' 45 '], expect: { value: 45 } }, { id: 'ex3', args: ['abc'], expect: { error: 'ValueError' } }],
    starter: 'def parse_price(text):\n    pass\n', comparator: { kind: 'float', tolerance: 1e-9 }, rubric: defaultRubric, limits, programmeId: 'advanced-python' },
  { id: 'paginate', version: 1, title: 'Paginate a list', difficulty: 2, topics: ['Backend logic', 'Validation'], skills: ['backend', 'apis'], language: 'python', functionName: 'paginate', signature: 'paginate(items: list, page: int, per_page: int) -> dict',
    statement: 'Return `{"items": ..., "page": page, "per_page": per_page, "total": len(items), "pages": ...}` where `items` holds the requested page (pages start at 1) and `pages` is the number of pages needed. A page past the end has no items. Raise `ValueError` if `page` or `per_page` is less than 1.',
    constraints: ['0 ≤ len(items) ≤ 100,000', 'Do not modify the input list'],
    examples: [{ id: 'ex1', args: [['a', 'b', 'c', 'd', 'e'], 2, 2], expect: { value: { items: ['c', 'd'], page: 2, per_page: 2, total: 5, pages: 3 } } }, { id: 'ex2', args: [['a'], 0, 10], expect: { error: 'ValueError' } }],
    starter: 'def paginate(items, page, per_page):\n    pass\n', comparator: exact, rubric: defaultRubric, limits, programmeId: 'django-backend-dev' },
  { id: 'two-sum', version: 1, title: 'Two sum', difficulty: 2, topics: ['Algorithms', 'Dictionaries'], skills: ['logic', 'python'], language: 'python', functionName: 'two_sum', signature: 'two_sum(nums: list[int], target: int) -> list[int] | None',
    statement: 'Return `[i, j]` with `i < j` and `nums[i] + nums[j] == target`. If several pairs work, choose the one with the smallest `j`, then the smallest `i`. Return `None` if there is no pair.',
    constraints: ['0 ≤ len(nums) ≤ 100,000', 'Aim for better than O(n²)'],
    examples: [{ id: 'ex1', args: [[2, 7, 11, 15], 9], expect: { value: [0, 1] } }, { id: 'ex2', args: [[0, 3, 2, 5], 5], expect: { value: [1, 2] }, note: '[0, 3] also sums to 5, but its j is larger.' }, { id: 'ex3', args: [[1, 2], 7], expect: { value: null } }],
    starter: 'def two_sum(nums, target):\n    pass\n', comparator: exact, rubric: defaultRubric, limits, programmeId: 'dsa-technical-interview' },
  { id: 'flatten', version: 1, title: 'Flatten nested lists', difficulty: 3, topics: ['Functions', 'Recursion'], skills: ['python', 'logic'], language: 'python', functionName: 'flatten', signature: 'flatten(nested: list) -> list',
    statement: '`nested` is a list whose items are integers or further lists, nested to any depth. Return every integer in order, in one flat list.',
    constraints: ['Up to 10,000 integers', 'Nesting depth up to 500'],
    examples: [{ id: 'ex1', args: [[1, [2, 3], [4, [5]]]], expect: { value: [1, 2, 3, 4, 5] } }, { id: 'ex2', args: [[[[]]]], expect: { value: [] } }],
    starter: 'def flatten(nested):\n    pass\n', comparator: exact, rubric: defaultRubric, limits, programmeId: 'advanced-python' },
  { id: 'rolling-average', version: 1, title: 'Rolling average', difficulty: 3, topics: ['Data processing', 'Error handling'], skills: ['python', 'backend'], language: 'python', functionName: 'rolling_average', signature: 'rolling_average(values: list[int], window: int) -> list[float]',
    statement: 'Return the average of every run of `window` consecutive values, rounded to 2 decimal places, in order. If `window` is larger than the list, return `[]`. Raise `ValueError` if `window` is less than 1.',
    constraints: ['0 ≤ len(values) ≤ 100,000', 'Values are integers', 'Aim for O(n)'],
    examples: [{ id: 'ex1', args: [[1, 2, 3, 4], 2], expect: { value: [1.5, 2.5, 3.5] } }, { id: 'ex2', args: [[10, 20, 30], 3], expect: { value: [20] } }, { id: 'ex3', args: [[5], 2], expect: { value: [] } }],
    starter: 'def rolling_average(values, window):\n    pass\n', comparator: { kind: 'float', tolerance: 0.011 }, rubric: defaultRubric, limits, programmeId: 'advanced-python' },
];

export const challengeById = (id: string | null | undefined) => challenges.find(item => item.id === id);
