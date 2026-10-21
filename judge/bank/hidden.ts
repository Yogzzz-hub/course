import type { HiddenChallenge, HiddenTest } from '../types';

/**
 * Hidden tests, reference solutions and deliberately faulty solutions. Server-only.
 * `tests/judge-validation.test.ts` proves, for every challenge, that the reference passes every
 * test and that each faulty solution fails at least one test that exercises its defect.
 */
const py = (...lines: string[]) => lines.join('\n') + '\n';
const int = (random: () => number, min: number, max: number) => min + Math.floor(random() * (max - min + 1));
const listOf = <T>(random: () => number, min: number, max: number, item: () => T) => Array.from({ length: int(random, min, max) }, item);
const t = (id: string, args: unknown[], expect: HiddenTest['expect'], ...tags: HiddenTest['tags']): HiddenTest => ({ id, args, expect, tags });
const v = (value: unknown) => ({ value });
const raises = (error: string) => ({ error });

const nested = (depth: number) => { let value: unknown = [7]; for (let index = 1; index < depth; index++) value = [value]; return value; };

export const hiddenChallenges: HiddenChallenge[] = [
  {
    challengeId: 'second-largest', version: 1,
    reference: py('def second_largest(nums):', '    distinct = set(nums)', '    if len(distinct) < 2:', '        return None', '    distinct.remove(max(distinct))', '    return max(distinct)'),
    tests: [
      t('empty', [[]], v(null), 'edge'), t('all-same', [[7, 7, 7]], v(null), 'edge'), t('negatives', [[-3, -1, -2]], v(-2), 'edge'),
      t('two-values', [[1, 2]], v(1), 'boundary'), t('zero-is-a-value', [[0, 5]], v(0), 'regression'), t('mixed', [[10, 20, 20, 5, 15]], v(15), 'normal'),
      t('large', [Array.from({ length: 20000 }, (_, index) => (index * 7919) % 20000)], v(19998), 'large'),
    ],
    property: { count: 40, seed: 101, generate: random => [listOf(random, 0, 12, () => int(random, -20, 20))] },
    faulty: [
      { name: 'counts-duplicates', defect: 'Uses sorted(nums)[-2], so duplicates of the maximum are returned.', source: py('def second_largest(nums):', '    if len(nums) < 2:', '        return None', '    return sorted(nums)[-2]') },
      { name: 'zero-initialised', defect: 'Starts the running maximums at 0, so all-negative lists and a real 0 go wrong.', source: py('def second_largest(nums):', '    first = second = 0', '    for n in nums:', '        if n > first:', '            first, second = n, first', '        elif first > n > second:', '            second = n', '    return second if second else None') },
      { name: 'crashes-on-short', defect: 'Indexes [-2] without checking length, raising IndexError for one distinct value.', source: py('def second_largest(nums):', '    return sorted(set(nums))[-2]') },
    ],
  },
  {
    challengeId: 'palindrome', version: 1,
    reference: py('def is_palindrome(text):', '    cleaned = [c.lower() for c in text if c.isalnum()]', '    return cleaned == cleaned[::-1]'),
    tests: [
      t('empty', [''], v(true), 'edge'), t('punctuation-only', ['.,!'], v(true), 'edge'), t('nixon', ["No 'x' in Nixon"], v(true), 'normal'),
      t('digits', ['12321'], v(true), 'normal'), t('digits-false', ['1231'], v(false), 'normal'), t('two-letters', ['ab'], v(false), 'boundary'),
      t('one-letter', ['a'], v(true), 'boundary'), t('question', ['Was it a car or a cat I saw?'], v(true), 'normal'), t('long', ['ab'.repeat(20000) + 'a'], v(true), 'large'),
    ],
    property: { count: 40, seed: 202, generate: random => [listOf(random, 0, 12, () => 'abAB ,.!1'[int(random, 0, 8)]).join('')] },
    faulty: [
      { name: 'exact-reverse', defect: 'Compares the raw text, so case, spaces and punctuation break it.', source: py('def is_palindrome(text):', '    return text == text[::-1]') },
      { name: 'spaces-only', defect: 'Removes spaces but not punctuation.', source: py('def is_palindrome(text):', '    t = text.lower().replace(" ", "")', '    return t == t[::-1]') },
      { name: 'case-sensitive', defect: 'Filters characters but forgets to lower-case them.', source: py('def is_palindrome(text):', '    cleaned = [c for c in text if c.isalnum()]', '    return cleaned == cleaned[::-1]') },
    ],
  },
  {
    challengeId: 'word-frequencies', version: 1,
    reference: py('import re', '', 'def word_frequencies(text):', '    counts = {}', '    for word in re.findall(r"[a-z]+", text.lower()):', '        counts[word] = counts.get(word, 0) + 1', '    return counts'),
    tests: [
      t('apostrophe', ["don't stop"], v({ don: 1, t: 1, stop: 1 }), 'edge'), t('case', ['Hello, HELLO hello!'], v({ hello: 3 }), 'normal'), t('digits', ['abc 123 abc'], v({ abc: 2 }), 'edge'),
      t('whitespace', ['   \n\t '], v({}), 'edge'), t('underscore', ['snake_case words'], v({ snake: 1, case: 1, words: 1 }), 'regression'), t('single', ['a'], v({ a: 1 }), 'boundary'),
      t('many', ['word '.repeat(10000)], v({ word: 10000 }), 'large'),
    ],
    property: { count: 30, seed: 303, generate: random => [listOf(random, 0, 8, () => ['cat', 'Dog', 'a', 'BIRD', "it's", 'x1y'][int(random, 0, 5)] + [' ', ', ', '! ', '\n', '-'][int(random, 0, 4)]).join('')] },
    faulty: [
      { name: 'split-on-spaces', defect: 'Splits on whitespace, so punctuation stays attached to words.', source: py('def word_frequencies(text):', '    counts = {}', '    for word in text.lower().split():', '        counts[word] = counts.get(word, 0) + 1', '    return counts') },
      { name: 'case-sensitive', defect: 'Keeps the original case, so "The" and "the" are counted separately.', source: py('import re', '', 'def word_frequencies(text):', '    counts = {}', '    for word in re.findall(r"[a-zA-Z]+", text):', '        counts[word] = counts.get(word, 0) + 1', '    return counts') },
      { name: 'word-characters', defect: 'Uses \\w+, which also counts digits and underscores as word characters.', source: py('import re', '', 'def word_frequencies(text):', '    counts = {}', '    for word in re.findall(r"\\w+", text.lower()):', '        counts[word] = counts.get(word, 0) + 1', '    return counts') },
    ],
  },
  {
    challengeId: 'fizzbuzz', version: 1,
    reference: py('def fizzbuzz(n):', '    result = []', '    for i in range(1, n + 1):', '        if i % 15 == 0:', '            result.append("FizzBuzz")', '        elif i % 3 == 0:', '            result.append("Fizz")', '        elif i % 5 == 0:', '            result.append("Buzz")', '        else:', '            result.append(str(i))', '    return result'),
    tests: [
      t('one', [1], v(['1']), 'boundary'), t('three', [3], v(['1', '2', 'Fizz']), 'boundary'),
      t('fifteen', [15], v(['1', '2', 'Fizz', '4', 'Buzz', 'Fizz', '7', '8', 'Fizz', 'Buzz', '11', 'Fizz', '13', '14', 'FizzBuzz']), 'edge'),
    ],
    property: { count: 25, seed: 404, generate: random => [int(random, 0, 60)] },
    faulty: [
      { name: 'wrong-order', defect: 'Checks multiples of 3 before 15, so 15 becomes "Fizz".', source: py('def fizzbuzz(n):', '    result = []', '    for i in range(1, n + 1):', '        if i % 3 == 0:', '            result.append("Fizz")', '        elif i % 15 == 0:', '            result.append("FizzBuzz")', '        elif i % 5 == 0:', '            result.append("Buzz")', '        else:', '            result.append(str(i))', '    return result') },
      { name: 'off-by-one', defect: 'Loops over range(n), starting at 0 and stopping before n.', source: py('def fizzbuzz(n):', '    result = []', '    for i in range(n):', '        if i % 15 == 0:', '            result.append("FizzBuzz")', '        elif i % 3 == 0:', '            result.append("Fizz")', '        elif i % 5 == 0:', '            result.append("Buzz")', '        else:', '            result.append(str(i))', '    return result') },
      { name: 'numbers-not-strings', defect: 'Appends the int itself instead of str(i).', source: py('def fizzbuzz(n):', '    return ["FizzBuzz" if i % 15 == 0 else "Fizz" if i % 3 == 0 else "Buzz" if i % 5 == 0 else i for i in range(1, n + 1)]') },
    ],
  },
  {
    challengeId: 'merge-intervals', version: 1,
    reference: py('def merge_intervals(intervals):', '    merged = []', '    for start, end in sorted(intervals):', '        if merged and start <= merged[-1][1]:', '            merged[-1][1] = max(merged[-1][1], end)', '        else:', '            merged.append([start, end])', '    return merged'),
    tests: [
      t('empty', [[]], v([]), 'edge'), t('single-point', [[[1, 1]]], v([[1, 1]]), 'boundary'), t('contained', [[[1, 10], [2, 3]]], v([[1, 10]]), 'edge'),
      t('negatives', [[[-5, -1], [-2, 0], [3, 3]]], v([[-5, 0], [3, 3]]), 'edge'), t('unsorted', [[[1, 4], [0, 0]]], v([[0, 0], [1, 4]]), 'normal'),
      t('gap', [[[1, 2], [3, 4]]], v([[1, 2], [3, 4]]), 'normal'), t('duplicates', [[[5, 5], [5, 5]]], v([[5, 5]]), 'edge'),
      t('many', [Array.from({ length: 5000 }, (_, index) => [index * 2, index * 2 + 1]).reverse()], v(Array.from({ length: 5000 }, (_, index) => [index * 2, index * 2 + 1])), 'large'),
    ],
    property: { count: 40, seed: 505, generate: random => [listOf(random, 0, 8, () => { const start = int(random, -10, 10); return [start, start + int(random, 0, 5)]; })] },
    faulty: [
      { name: 'no-sort', defect: 'Assumes the input is already sorted.', source: py('def merge_intervals(intervals):', '    merged = []', '    for start, end in intervals:', '        if merged and start <= merged[-1][1]:', '            merged[-1][1] = max(merged[-1][1], end)', '        else:', '            merged.append([start, end])', '    return merged') },
      { name: 'strict-overlap', defect: 'Uses < instead of <=, so touching intervals stay separate.', source: py('def merge_intervals(intervals):', '    merged = []', '    for start, end in sorted(intervals):', '        if merged and start < merged[-1][1]:', '            merged[-1][1] = max(merged[-1][1], end)', '        else:', '            merged.append([start, end])', '    return merged') },
      { name: 'no-max', defect: 'Overwrites the end instead of taking the max, shrinking intervals that contain others.', source: py('def merge_intervals(intervals):', '    merged = []', '    for start, end in sorted(intervals):', '        if merged and start <= merged[-1][1]:', '            merged[-1][1] = end', '        else:', '            merged.append([start, end])', '    return merged') },
    ],
  },
  {
    challengeId: 'parse-price', version: 1,
    reference: py('import re', '', '_PATTERN = re.compile(r"₹?(\\d+(?:,\\d+)*)(?:\\.(\\d{1,2}))?")', '', 'def parse_price(text):', '    match = _PATTERN.fullmatch(text.strip())', '    if not match:', '        raise ValueError(f"Not a price: {text!r}")', '    whole = match.group(1).replace(",", "")', '    return round(float(f"{whole}.{match.group(2) or 0}"), 2)'),
    tests: [
      t('empty', [''], raises('ValueError'), 'invalid'), t('symbol-only', ['₹'], raises('ValueError'), 'invalid'), t('three-decimals', ['12.345'], raises('ValueError'), 'invalid'),
      t('negative', ['-10'], raises('ValueError'), 'invalid'), t('exponent', ['1e3'], raises('ValueError'), 'invalid'), t('double-dot', ['1..2'], raises('ValueError'), 'invalid'),
      t('nan', ['nan'], raises('ValueError'), 'invalid'), t('space-after-symbol', ['₹ 5'], raises('ValueError'), 'edge'),
      t('lakh-grouping', ['1,00,000'], v(100000), 'normal'), t('half', ['0.5'], v(0.5), 'normal'), t('zero', ['₹0'], v(0), 'boundary'), t('cents', ['7.05'], v(7.05), 'normal'),
    ],
    faulty: [
      { name: 'float-cast', defect: 'Calls float() after stripping symbols, so negatives, exponents and "nan" are accepted.', source: py('def parse_price(text):', '    return float(text.strip().replace("₹", "").replace(",", ""))') },
      { name: 'swallows-errors', defect: 'Returns 0.0 instead of raising ValueError for invalid input.', source: py('import re', '', '_PATTERN = re.compile(r"₹?(\\d+(?:,\\d+)*)(?:\\.(\\d{1,2}))?")', '', 'def parse_price(text):', '    match = _PATTERN.fullmatch(text.strip())', '    if not match:', '        return 0.0', '    return float(match.group(1).replace(",", "") + "." + (match.group(2) or "0"))') },
      { name: 'no-strip', defect: 'Does not allow surrounding whitespace.', source: py('import re', '', '_PATTERN = re.compile(r"₹?(\\d+(?:,\\d+)*)(?:\\.(\\d{1,2}))?")', '', 'def parse_price(text):', '    match = _PATTERN.fullmatch(text)', '    if not match:', '        raise ValueError("Not a price")', '    return float(match.group(1).replace(",", "") + "." + (match.group(2) or "0"))') },
    ],
  },
  {
    challengeId: 'paginate', version: 1,
    reference: py('def paginate(items, page, per_page):', '    if page < 1 or per_page < 1:', '        raise ValueError("page and per_page must be at least 1")', '    total = len(items)', '    start = (page - 1) * per_page', '    return {"items": items[start:start + per_page], "page": page, "per_page": per_page, "total": total, "pages": (total + per_page - 1) // per_page}'),
    tests: [
      t('empty', [[], 1, 10], v({ items: [], page: 1, per_page: 10, total: 0, pages: 0 }), 'edge'),
      t('past-the-end', [['a', 'b', 'c'], 5, 2], v({ items: [], page: 5, per_page: 2, total: 3, pages: 2 }), 'edge'),
      t('zero-per-page', [['a'], 1, 0], raises('ValueError'), 'invalid'), t('negative-page', [['a'], -1, 5], raises('ValueError'), 'invalid'),
      t('exact-multiple', [['a', 'b', 'c', 'd'], 2, 2], v({ items: ['c', 'd'], page: 2, per_page: 2, total: 4, pages: 2 }), 'boundary'),
      t('first-page', [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1, 3], v({ items: [1, 2, 3], page: 1, per_page: 3, total: 10, pages: 4 }), 'normal'),
      t('large', [Array.from({ length: 50000 }, (_, index) => index), 500, 100], v({ items: Array.from({ length: 100 }, (_, index) => 49900 + index), page: 500, per_page: 100, total: 50000, pages: 500 }), 'large'),
    ],
    faulty: [
      { name: 'floor-pages', defect: 'Counts pages with floor division, losing the last partial page.', source: py('def paginate(items, page, per_page):', '    if page < 1 or per_page < 1:', '        raise ValueError("bad page")', '    start = (page - 1) * per_page', '    return {"items": items[start:start + per_page], "page": page, "per_page": per_page, "total": len(items), "pages": len(items) // per_page}') },
      { name: 'off-by-one-start', defect: 'Starts at page * per_page, skipping the first page.', source: py('def paginate(items, page, per_page):', '    if page < 1 or per_page < 1:', '        raise ValueError("bad page")', '    start = page * per_page', '    return {"items": items[start:start + per_page], "page": page, "per_page": per_page, "total": len(items), "pages": -(-len(items) // per_page)}') },
      { name: 'no-validation', defect: 'Never raises ValueError for page or per_page below 1.', source: py('def paginate(items, page, per_page):', '    start = (page - 1) * max(per_page, 1)', '    return {"items": items[start:start + per_page], "page": page, "per_page": per_page, "total": len(items), "pages": -(-len(items) // max(per_page, 1))}') },
    ],
  },
  {
    challengeId: 'two-sum', version: 1,
    reference: py('def two_sum(nums, target):', '    seen = {}', '    for j, n in enumerate(nums):', '        if target - n in seen:', '            return [seen[target - n], j]', '        if n not in seen:', '            seen[n] = j', '    return None'),
    tests: [
      t('empty', [[], 5], v(null), 'edge'), t('no-self-pair', [[3, 1], 6], v(null), 'edge'), t('zeros', [[0, 0], 0], v([0, 1]), 'edge'),
      t('negatives', [[-3, 4, 3, 90], 0], v([0, 2]), 'normal'), t('first-index', [[1, 1, 5], 6], v([0, 2]), 'regression'), t('pair', [[3, 3], 6], v([0, 1]), 'boundary'),
      t('large', [Array.from({ length: 40000 }, (_, index) => index + 1), 79999], v([39998, 39999]), 'large'),
    ],
    property: { count: 40, seed: 808, generate: random => [listOf(random, 0, 8, () => int(random, -5, 5)), int(random, -6, 6)] },
    faulty: [
      { name: 'first-i', defect: 'Searches by i first, returning a different pair than the specification asks for (and is O(n²)).', source: py('def two_sum(nums, target):', '    for i in range(len(nums)):', '        for j in range(i + 1, len(nums)):', '            if nums[i] + nums[j] == target:', '                return [i, j]', '    return None') },
      { name: 'self-pair', defect: 'Stores the number before checking, so a value can pair with itself.', source: py('def two_sum(nums, target):', '    seen = {}', '    for j, n in enumerate(nums):', '        seen.setdefault(n, j)', '        if target - n in seen:', '            return [seen[target - n], j]', '    return None') },
      { name: 'latest-index', defect: 'Overwrites stored indexes, so repeated values return a later i.', source: py('def two_sum(nums, target):', '    seen = {}', '    for j, n in enumerate(nums):', '        if target - n in seen:', '            return [seen[target - n], j]', '        seen[n] = j', '    return None') },
    ],
  },
  {
    challengeId: 'flatten', version: 1,
    reference: py('def flatten(nested):', '    flat = []', '    for item in nested:', '        if isinstance(item, list):', '            flat.extend(flatten(item))', '        else:', '            flat.append(item)', '    return flat'),
    tests: [
      t('empty', [[]], v([]), 'edge'), t('empties', [[[], [[]], 1]], v([1]), 'edge'), t('order', [[3, [1, 2]]], v([3, 1, 2]), 'regression'),
      t('deep-small', [[[1, [2, [3, [4]]]]]], v([1, 2, 3, 4]), 'normal'), t('negatives', [[-1, [0, [-2]]]], v([-1, 0, -2]), 'normal'),
      t('deep', [nested(500)], v([7]), 'large'),
      t('wide', [[Array.from({ length: 5000 }, (_, index) => index), [Array.from({ length: 5000 }, (_, index) => index)]]], v([...Array.from({ length: 5000 }, (_, index) => index), ...Array.from({ length: 5000 }, (_, index) => index)]), 'large'),
    ],
    property: { count: 30, seed: 909, generate: random => { const build = (depth: number): unknown[] => listOf(random, 0, 4, () => depth < 3 && random() < 0.4 ? build(depth + 1) : int(random, -9, 9)); return [build(0)]; } },
    faulty: [
      { name: 'one-level', defect: 'Only flattens one level of nesting.', source: py('def flatten(nested):', '    flat = []', '    for item in nested:', '        if isinstance(item, list):', '            flat.extend(item)', '        else:', '            flat.append(item)', '    return flat') },
      { name: 'sorted', defect: 'Sorts the result, losing the original order.', source: py('def flatten(nested):', '    flat = []', '    for item in nested:', '        if isinstance(item, list):', '            flat.extend(flatten(item))', '        else:', '            flat.append(item)', '    return sorted(flat)') },
    ],
  },
  {
    challengeId: 'rolling-average', version: 1,
    reference: py('def rolling_average(values, window):', '    if window < 1:', '        raise ValueError("window must be at least 1")', '    if window > len(values):', '        return []', '    total = sum(values[:window])', '    result = [round(total / window, 2)]', '    for i in range(window, len(values)):', '        total += values[i] - values[i - window]', '        result.append(round(total / window, 2))', '    return result'),
    tests: [
      t('empty', [[], 1], v([]), 'edge'), t('zero-window', [[1, 2, 3], 0], raises('ValueError'), 'invalid'), t('negative-window', [[1, 2, 3], -2], raises('ValueError'), 'invalid'),
      t('window-equals-length', [[4, 8], 2], v([6]), 'boundary'), t('window-too-large', [[1, 2], 3], v([]), 'boundary'), t('negatives', [[-1, -2, -3], 2], v([-1.5, -2.5]), 'edge'),
      t('mixed', [[1, 1, 2], 2], v([1, 1.5]), 'normal'), t('rounding', [[1, 2, 2], 3], v([1.67]), 'normal'),
      t('large', [Array.from({ length: 20000 }, () => 7), 1000], v(Array.from({ length: 19001 }, () => 7)), 'large'),
    ],
    property: { count: 40, seed: 1010, generate: random => [listOf(random, 0, 10, () => int(random, -10, 10)), int(random, 1, 4)] },
    faulty: [
      { name: 'partial-windows', defect: 'Averages partial windows at the start, returning too many values.', source: py('def rolling_average(values, window):', '    if window < 1:', '        raise ValueError("window must be at least 1")', '    result = []', '    for i in range(len(values)):', '        chunk = values[max(0, i - window + 1):i + 1]', '        result.append(round(sum(chunk) / len(chunk), 2))', '    return result') },
      { name: 'integer-division', defect: 'Uses //, truncating every average.', source: py('def rolling_average(values, window):', '    if window < 1:', '        raise ValueError("window must be at least 1")', '    return [sum(values[i:i + window]) // window for i in range(len(values) - window + 1)]') },
      { name: 'no-validation', defect: 'Divides by a zero window instead of raising ValueError.', source: py('def rolling_average(values, window):', '    if window > len(values):', '        return []', '    return [round(sum(values[i:i + window]) / window, 2) for i in range(len(values) - window + 1)]') },
    ],
  },
];
