import { seededRandom, shuffled, hashString } from '../assessment/engine';
import type { Question, QuestionCheck } from '../assessment/questionBank';
import type { ModuleRef } from '../assessment/skills';

/**
 * Follow-up questions that check understanding of each challenge: predict an output, then pick the
 * change that handles a new requirement. Answer keys are verified by running the code in
 * `tests/question-bank.test.ts`. These check understanding; they make no claim about who wrote the code.
 */
export const UNDERSTANDING_VERSION = '2026.10.1';
const lines = (...rows: string[]) => rows.join('\n');
const opts = (...texts: string[]) => texts.map((text, index) => ({ id: 'abcdef'[index], text }));
const stdout: QuestionCheck = { kind: 'stdout' };
const completion = (...rows: string[]): QuestionCheck => ({ kind: 'completion', template: lines(...rows) });
const ref = (programmeId: string, module: string): ModuleRef => ({ programmeId, module });
type Draft = Omit<Question, 'version' | 'status' | 'kind'> & { kind?: Question['kind'] };
const q = (draft: Draft): Question => ({ version: 1, status: 'active', kind: 'output', ...draft });

export const understandingBank: Record<string, Question[]> = {
  'second-largest': [
    q({ id: 'u-second-largest-predict', skill: 'python', difficulty: 1, prompt: 'Using a correct solution, what does this print?',
      code: { language: 'python', source: lines('def second_largest(nums):', '    distinct = set(nums)', '    if len(distinct) < 2:', '        return None', '    distinct.remove(max(distinct))', '    return max(distinct)', '', 'print(second_largest([3, 3, 1]), second_largest([2, 2]))') },
      options: opts('1 None', '3 None', '1 2', '3 1'), answer: 'a', check: stdout,
      explanation: '[3, 3, 1] has two distinct values, 3 and 1, so the second largest is 1. [2, 2] has only one distinct value, so the result is None.', objective: 'Trace duplicates through a set.', module: ref('programming-python-foundation', 'Core Data Structures') }),
    q({ id: 'u-second-largest-modify', kind: 'debug', skill: 'python', difficulty: 2, prompt: 'Unexpected input: now you need the k-th largest distinct value (k = 2 means second largest). Which return line works?',
      code: { language: 'python', source: lines('def kth_largest(nums, k):', '    distinct = sorted(set(nums), reverse=True)', '    # return ...') },
      options: opts('return distinct[k - 1] if len(distinct) >= k else None', 'return distinct[k] if len(distinct) > k else None', 'return distinct[-k]', 'return sorted(nums)[-k]'), answer: 'a', codeOptions: true,
      check: completion('def kth_largest(nums, k):', '    distinct = sorted(set(nums), reverse=True)', '    __BLANK__', '', 'assert kth_largest([4, 1, 7, 3, 7], 2) == 4', 'assert kth_largest([4, 1, 7], 3) == 1', 'assert kth_largest([5, 5], 2) is None', 'print("PASS")'),
      explanation: 'The list is sorted largest first, so the k-th largest is at index k − 1, and it only exists when there are at least k distinct values.', objective: 'Generalise a solution with correct indexing.', module: ref('programming-python-foundation', 'Core Data Structures') }),
  ],
  palindrome: [
    q({ id: 'u-palindrome-predict', skill: 'python', difficulty: 1, prompt: 'What does this print?',
      code: { language: 'python', source: lines('text = "Step on no pets!"', 'cleaned = [c.lower() for c in text if c.isalnum()]', 'print(len(cleaned), cleaned == cleaned[::-1])') },
      options: opts('12 True', '16 True', '12 False', '15 False'), answer: 'a', check: stdout,
      explanation: 'Spaces and "!" are dropped, leaving 12 letters, and "steponnopets" reads the same both ways.', objective: 'Predict a filtered comprehension.', module: ref('programming-python-foundation', 'Core Data Structures') }),
    q({ id: 'u-palindrome-modify', kind: 'debug', skill: 'python', difficulty: 2, prompt: 'New requirement: an empty or punctuation-only string must NOT count as a palindrome. Which return line works?',
      code: { language: 'python', source: lines('def is_palindrome(text):', '    cleaned = [c.lower() for c in text if c.isalnum()]', '    # return ...') },
      options: opts('return bool(cleaned) and cleaned == cleaned[::-1]', 'return cleaned == cleaned[::-1]', 'return len(text) > 0 and cleaned == cleaned[::-1]', 'return cleaned and cleaned == cleaned[::-1]'), answer: 'a', codeOptions: true,
      check: completion('def is_palindrome(text):', '    cleaned = [c.lower() for c in text if c.isalnum()]', '    __BLANK__', '', 'assert is_palindrome("Race car") is True', 'assert is_palindrome("hello") is False', 'assert is_palindrome("") is False', 'assert is_palindrome("?!") is False', 'print("PASS")'),
      explanation: 'Check the cleaned characters, not the raw text, and convert to a real bool: "cleaned and …" returns the empty list itself, not False.', objective: 'Handle an empty case and return the right type.', module: ref('programming-python-foundation', 'Branching & Repetition') }),
  ],
  'word-frequencies': [
    q({ id: 'u-words-predict', skill: 'python', difficulty: 2, prompt: 'What does this print?',
      code: { language: 'python', source: lines('import re', 'print(re.findall(r"[a-z]+", "It\'s 9AM, isn\'t it?".lower()))') },
      options: opts("['it', 's', 'am', 'isn', 't', 'it']", "[\"it's\", 'am', \"isn't\", 'it']", "['it', 'am', 'it']", "['its', 'am', 'isnt', 'it']"), answer: 'a', codeOptions: true, check: stdout,
      explanation: 'Only a–z runs count, so apostrophes and digits split words: "it\'s" becomes "it" and "s", and "9am" leaves "am".', objective: 'Predict regular-expression tokenising.', module: ref('programming-python-foundation', 'Core Data Structures') }),
    q({ id: 'u-words-modify', kind: 'debug', skill: 'python', difficulty: 2, prompt: 'Extend it: return only the most frequent word, breaking ties alphabetically. Which line works?',
      code: { language: 'python', source: lines('def top_word(counts):', '    # counts is the dictionary word_frequencies returned', '    # return ...') },
      options: opts('return min(counts, key=lambda w: (-counts[w], w))', 'return max(counts, key=counts.get)', 'return sorted(counts)[0]', 'return max(counts)'), answer: 'a', codeOptions: true,
      check: completion('def top_word(counts):', '    __BLANK__', '', 'assert top_word({"b": 2, "a": 2, "c": 1}) == "a"', 'assert top_word({"x": 1}) == "x"', 'assert top_word({"m": 3, "z": 5}) == "z"', 'print("PASS")'),
      explanation: 'Sorting key (−count, word) puts the highest count first and breaks ties alphabetically. max(..., key=counts.get) keeps whichever tied word came first.', objective: 'Use a composite sort key for tie-breaking.', module: ref('advanced-python', 'Design Patterns in Python') }),
  ],
  fizzbuzz: [
    q({ id: 'u-fizzbuzz-predict', skill: 'logic', difficulty: 1, prompt: 'This version has a bug. What does it print?',
      code: { language: 'python', source: lines('for i in [9, 10, 30]:', '    if i % 3 == 0:', '        print("Fizz")', '    elif i % 15 == 0:', '        print("FizzBuzz")', '    elif i % 5 == 0:', '        print("Buzz")') },
      options: opts('Fizz\nBuzz\nFizz', 'Fizz\nBuzz\nFizzBuzz', 'Fizz\nFizz\nFizz', 'Buzz\nBuzz\nFizzBuzz'), answer: 'a', codeOptions: true, check: stdout,
      explanation: '30 is divisible by 3, so the first branch matches and the FizzBuzz branch is never reached. Check the most specific condition first.', objective: 'Spot unreachable branches.', module: ref('programming-python-foundation', 'Branching & Repetition') }),
    q({ id: 'u-fizzbuzz-modify', kind: 'debug', skill: 'logic', difficulty: 2, prompt: 'New rule: multiples of 7 add "Bang" (21 → "FizzBang", 105 → "FizzBuzzBang"). Which line builds one item?',
      code: { language: 'python', source: lines('def item(i):', '    # return ...') },
      options: opts('return ("Fizz" * (i % 3 == 0) + "Buzz" * (i % 5 == 0) + "Bang" * (i % 7 == 0)) or str(i)', 'return "Bang" if i % 7 == 0 else ("Fizz" if i % 3 == 0 else str(i))', 'return ("Fizz" if i % 3 == 0 else "") + ("Buzz" if i % 5 == 0 else "") + ("Bang" if i % 7 == 0 else "")', 'return str(i) + ("Fizz" * (i % 3 == 0))'), answer: 'a', codeOptions: true,
      check: completion('def item(i):', '    __BLANK__', '', 'assert item(1) == "1"', 'assert item(3) == "Fizz"', 'assert item(5) == "Buzz"', 'assert item(7) == "Bang"', 'assert item(15) == "FizzBuzz"', 'assert item(21) == "FizzBang"', 'assert item(105) == "FizzBuzzBang"', 'print("PASS")'),
      explanation: 'Concatenating each word when its rule applies scales to any number of rules, and "or str(i)" covers numbers that match none.', objective: 'Restructure conditions so new rules compose.', module: ref('programming-python-foundation', 'Functional Decomposition') }),
  ],
  'merge-intervals': [
    q({ id: 'u-merge-predict', skill: 'logic', difficulty: 2, prompt: 'What does this print?',
      code: { language: 'python', source: lines('intervals = [[1, 4], [2, 3], [6, 8], [8, 9]]', 'merged = []', 'for start, end in sorted(intervals):', '    if merged and start <= merged[-1][1]:', '        merged[-1][1] = max(merged[-1][1], end)', '    else:', '        merged.append([start, end])', 'print(merged)') },
      options: opts('[[1, 4], [6, 9]]', '[[1, 3], [6, 9]]', '[[1, 4], [6, 8], [8, 9]]', '[[1, 9]]'), answer: 'a', check: stdout,
      explanation: '[2, 3] sits inside [1, 4] so the end stays 4 thanks to max(), and [8, 9] touches [6, 8] so they merge into [6, 9].', objective: 'Trace a merge with containment and touching ends.', module: ref('dsa-technical-interview', 'Advanced Algorithmic Patterns') }),
    q({ id: 'u-merge-why-sort', kind: 'mcq', skill: 'logic', difficulty: 2, prompt: 'Why does the solution sort the intervals first?',
      options: opts('So every interval that overlaps the current group comes right after it, and one pass can merge everything', 'Python lists must be sorted before they can be looped over', 'To remove duplicate intervals', 'To make the output shorter'), answer: 'a', check: { kind: 'review', reviewed: '2026-10-21' },
      explanation: 'After sorting by start, an interval can only overlap the group that ends most recently, so a single left-to-right pass is enough.', objective: 'Explain why an algorithm is correct.', module: ref('dsa-technical-interview', 'Advanced Algorithmic Patterns') }),
  ],
  'parse-price': [
    q({ id: 'u-price-predict', kind: 'debug', skill: 'debugging', difficulty: 2, prompt: 'What happens when this runs?',
      code: { language: 'python', source: lines('import re', 'PATTERN = re.compile(r"₹?(\\d+(?:,\\d+)*)(?:\\.(\\d{1,2}))?")', 'def parse_price(text):', '    match = PATTERN.fullmatch(text.strip())', '    if not match:', '        raise ValueError("Not a price")', '    return float(match.group(1).replace(",", "") + "." + (match.group(2) or "0"))', '', 'print(parse_price("₹1,299.999"))') },
      options: opts('It raises ValueError', 'It prints 1299.999', 'It prints 1300.0', 'It prints 1299.99'), answer: 'a', check: { kind: 'exception', name: 'ValueError' },
      explanation: 'The pattern allows at most two decimal digits and fullmatch must match the whole string, so three decimals is rejected.', objective: 'Read a validation rule from a regular expression.', module: ref('advanced-python', 'Software Quality & Testing') }),
    q({ id: 'u-price-modify', kind: 'debug', skill: 'debugging', difficulty: 3, prompt: 'Unexpected input: prices like "₹500/-" must now be accepted, but "5/-/-" must still be rejected. Which line works?',
      code: { language: 'python', source: lines('def parse_price(text):', '    # cleaned = ...', '    match = PATTERN.fullmatch(cleaned)', '    ...') },
      options: opts('cleaned = text.strip().removesuffix("/-")', 'cleaned = text.strip().replace("/-", "")', 'cleaned = text.replace("/-", "")', 'cleaned = text.strip("/-")'), answer: 'a', codeOptions: true,
      check: completion('import re', 'PATTERN = re.compile(r"₹?(\\d+(?:,\\d+)*)(?:\\.(\\d{1,2}))?")', 'def parse_price(text):', '    __BLANK__', '    match = PATTERN.fullmatch(cleaned)', '    if not match:', '        raise ValueError("Not a price")', '    return float(match.group(1).replace(",", "") + "." + (match.group(2) or "0"))', '', 'assert parse_price("₹500/-") == 500.0', 'assert parse_price(" 1,200 ") == 1200.0', 'try:', '    parse_price("5/-/-")', 'except ValueError:', '    pass', 'else:', '    raise AssertionError("should reject")', 'print("PASS")'),
      explanation: 'removesuffix removes exactly one trailing "/-" after trimming whitespace. replace() would remove every "/-", accepting "5/-/-", and strip("/-") strips characters, not the suffix.', objective: 'Extend validation without loosening it.', module: ref('advanced-python', 'Software Quality & Testing') }),
  ],
  paginate: [
    q({ id: 'u-paginate-predict', skill: 'backend', difficulty: 1, prompt: 'What does this print?',
      code: { language: 'python', source: lines('total, per_page = 41, 10', 'print((total + per_page - 1) // per_page, total // per_page)') },
      options: opts('5 4', '4 4', '5 5', '4 5'), answer: 'a', check: stdout,
      explanation: 'Adding per_page − 1 before dividing rounds up, so 41 items need 5 pages; plain floor division gives 4 and loses the last item.', objective: 'Compute ceiling division.', module: ref('django-backend-dev', 'Django REST Framework (DRF)') }),
    q({ id: 'u-paginate-modify', kind: 'debug', skill: 'apis', difficulty: 2, prompt: 'Extend the response with a has_next flag. Which line computes it?',
      code: { language: 'python', source: lines('def has_next(page, per_page, total):', '    # return ...') },
      options: opts('return page * per_page < total', 'return page * per_page <= total', 'return page < total // per_page', 'return (page + 1) * per_page <= total'), answer: 'a', codeOptions: true,
      check: completion('def has_next(page, per_page, total):', '    __BLANK__', '', 'assert has_next(1, 10, 41) is True', 'assert has_next(4, 10, 41) is True', 'assert has_next(5, 10, 41) is False', 'assert has_next(4, 10, 40) is False', 'assert has_next(1, 10, 0) is False', 'print("PASS")'),
      explanation: 'There is a next page exactly when the items shown so far (page × per_page) are fewer than the total.', objective: 'Derive pagination metadata.', module: ref('django-backend-dev', 'Django REST Framework (DRF)') }),
  ],
  'two-sum': [
    q({ id: 'u-two-sum-predict', skill: 'logic', difficulty: 2, prompt: 'What does this print?',
      code: { language: 'python', source: lines('def two_sum(nums, target):', '    seen = {}', '    for j, n in enumerate(nums):', '        if target - n in seen:', '            return [seen[target - n], j]', '        if n not in seen:', '            seen[n] = j', '    return None', '', 'print(two_sum([4, 1, 4, 3], 8), two_sum([1, 2], 4))') },
      options: opts('[0, 2] None', '[2, 2] None', '[0, 2] [1, 1]', '[2, 0] None'), answer: 'a', check: stdout,
      explanation: 'The second 4 (index 2) finds the first 4 (index 0). For [1, 2] the only candidate would be 2 + 2, which needs two different positions, so the result is None.', objective: 'Trace a hash-map search.', module: ref('dsa-technical-interview', 'Complexity & Linear Structures') }),
    q({ id: 'u-two-sum-why', kind: 'mcq', skill: 'logic', difficulty: 3, prompt: 'Why does the solution check for the complement before storing the current number?',
      options: opts('So a number is never paired with itself when the target is twice its value', 'Because dictionaries cannot store a key twice', 'To make the loop run faster', 'It makes no difference'), answer: 'a', check: { kind: 'review', reviewed: '2026-10-21' },
      explanation: 'If the number were stored first, [3, 1] with target 6 would find 3 in the dictionary and return [0, 0], using one element twice.', objective: 'Explain an ordering decision in an algorithm.', module: ref('dsa-technical-interview', 'Complexity & Linear Structures') }),
  ],
  flatten: [
    q({ id: 'u-flatten-predict', skill: 'python', difficulty: 2, prompt: 'What does this print?',
      code: { language: 'python', source: lines('def flatten(nested):', '    flat = []', '    for item in nested:', '        if isinstance(item, list):', '            flat.extend(flatten(item))', '        else:', '            flat.append(item)', '    return flat', '', 'print(flatten([1, [], [2, [3, []]], 4]))') },
      options: opts('[1, 2, 3, 4]', '[1, [], 2, 3, [], 4]', '[1, 2, [3, []], 4]', '[1, 4]'), answer: 'a', check: stdout,
      explanation: 'Every list is recursed into, so empty lists add nothing and the integers come out in order.', objective: 'Trace recursion over nested data.', module: ref('advanced-python', 'Advanced OOP & Metaprogramming') }),
    q({ id: 'u-flatten-modify', kind: 'debug', skill: 'python', difficulty: 3, prompt: 'Unexpected input: tuples should be flattened too, but strings must stay whole. Which condition works?',
      code: { language: 'python', source: lines('def flatten(nested):', '    flat = []', '    for item in nested:', '        # if ...:', '            flat.extend(flatten(item))', '        else:', '            flat.append(item)', '    return flat') },
      options: opts('if isinstance(item, (list, tuple)):', 'if isinstance(item, list):', "if hasattr(item, '__iter__'):", 'if not isinstance(item, int):'), answer: 'a', codeOptions: true,
      check: completion('def flatten(nested):', '    flat = []', '    for item in nested:', '        __BLANK__', '            flat.extend(flatten(item))', '        else:', '            flat.append(item)', '    return flat', '', 'assert flatten([1, (2, [3]), "ab"]) == [1, 2, 3, "ab"]', 'assert flatten([(), [()]]) == []', 'print("PASS")'),
      explanation: 'Name exactly the container types to recurse into. Treating anything iterable as nested recurses into strings forever, because each character is itself a string.', objective: 'Choose a precise type check.', module: ref('advanced-python', 'Advanced OOP & Metaprogramming') }),
  ],
  'rolling-average': [
    q({ id: 'u-rolling-predict', skill: 'python', difficulty: 2, prompt: 'What does this print?',
      code: { language: 'python', source: lines('values, window = [2, 4, 6, 8], 3', 'print([round(sum(values[i:i + window]) / window, 2) for i in range(len(values) - window + 1)])') },
      options: opts('[4.0, 6.0]', '[4, 6]', '[2.0, 3.0, 4.0, 6.0]', '[4.0, 6.0, 4.67]'), answer: 'a', check: stdout,
      explanation: 'There are len − window + 1 = 2 full windows: [2, 4, 6] and [4, 6, 8]. True division always gives floats.', objective: 'Count sliding windows.', module: ref('advanced-python', 'Software Quality & Testing') }),
    q({ id: 'u-rolling-modify', kind: 'debug', skill: 'python', difficulty: 3, prompt: 'Unexpected input: readings may be None. A window containing None should produce None. Which line averages one window?',
      code: { language: 'python', source: lines('def window_average(chunk):', '    # return ...') },
      options: opts('return None if None in chunk else round(sum(chunk) / len(chunk), 2)', 'return round(sum(x or 0 for x in chunk) / len(chunk), 2)', 'return round(sum(chunk) / len(chunk), 2) if all(chunk) else None', 'return sum(chunk) / len(chunk)'), answer: 'a', codeOptions: true,
      check: completion('def window_average(chunk):', '    __BLANK__', '', 'assert window_average([1, 2]) == 1.5', 'assert window_average([1, None]) is None', 'assert window_average([0, 0]) == 0.0', 'print("PASS")'),
      explanation: 'Test for None explicitly. all(chunk) also rejects real zeros, and replacing None with 0 silently produces a wrong average.', objective: 'Handle missing data without mistaking zero for missing.', module: ref('advanced-python', 'Software Quality & Testing') }),
  ],
};

export const allUnderstandingQuestions = () => Object.values(understandingBank).flat();

/** Deterministic per attempt: option order is shuffled from a seed so a retry is reproducible. */
export function understandingCheck(challengeId: string, seed: number) {
  const random = seededRandom(hashString(`${challengeId}:${seed}`));
  return (understandingBank[challengeId] ?? []).map(question => ({ question, optionOrder: shuffled(question.options.map(option => option.id), random) }));
}
