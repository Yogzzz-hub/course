import type { Challenge } from './challenges.ts';

// Reviewed source fixtures only. These are never exposed by the public API.
export const extendedChallenges: Challenge[] = [
  {
    id: 'classify-values', version: 1, title: 'Classify sensor readings',
    category: 'Conditions, loops and functions', difficulty: 'beginner',
    statement: 'Read a JSON array of integers. Print a JSON object with exactly the keys negative, zero and positive, containing the count of readings in each group. Count every occurrence, including duplicates. Empty input returns all three counts as 0. At most 10,000 readings, each between -1,000,000 and 1,000,000. Object key order does not matter.',
    starter: 'import json\nimport sys\n\nreadings = json.load(sys.stdin)\n# Count negative, zero and positive readings.\n',
    samples: [
      { input: [-2, 0, 3, 3], output: { negative: 1, zero: 1, positive: 2 } },
      { input: [], output: { negative: 0, zero: 0, positive: 0 } },
    ],
    hidden: [
      { input: [0, 0, 0], output: { negative: 0, zero: 3, positive: 0 } },
      { input: [-1000000, 1000000, -1, 1], output: { negative: 2, zero: 0, positive: 2 } },
      { input: Array(10000).fill(-5), output: { negative: 10000, zero: 0, positive: 0 } },
    ],
    reference: 'import json,sys\ncounts={"negative":0,"zero":0,"positive":0}\nfor value in json.load(sys.stdin):\n counts["negative" if value < 0 else "positive" if value > 0 else "zero"] += 1\nprint(json.dumps(counts))',
    faulty: [
      'import json,sys\nv=json.load(sys.stdin)\nprint(json.dumps({"negative":sum(x<0 for x in v),"zero":sum(x==0 for x in v),"positive":sum(x>=0 for x in v)}))',
      'import json,sys\nv=set(json.load(sys.stdin))\nprint(json.dumps({"negative":sum(x<0 for x in v),"zero":sum(x==0 for x in v),"positive":sum(x>0 for x in v)}))',
    ],
    understanding: {
      prompt: 'Why is value >= 0 the wrong condition for the positive group?',
      options: ['Zero belongs only in the zero group', 'It rejects positive integers', 'It removes duplicates', 'It sorts the input'],
      answer: 0, explanation: 'Positive means strictly greater than zero. Counting zero as positive assigns one reading to two groups.',
    },
  },
  {
    id: 'safe-integer-division', version: 1, title: 'Handle invalid division requests',
    category: 'Error handling and backend logic', difficulty: 'intermediate',
    statement: 'Read a JSON array of requests. For each request, return the floor quotient a // b when it is an object with integer fields a and b and b is nonzero. Otherwise return null for that request. JSON booleans are not integers for this contract. Additional object fields are ignored. Preserve order and process later requests after invalid ones. Print the resulting JSON array. Up to 1,000 requests; numeric fields are integers between -1,000,000 and 1,000,000. Requests may also be strings, arrays, booleans or null. Missing fields and string-valued fields are invalid. Empty input returns [].',
    starter: 'import json\nimport sys\n\nrequests = json.load(sys.stdin)\n# Validate each request and keep one result per request.\n',
    samples: [
      { input: [{ a: 7, b: 2 }, { a: 4, b: 0 }, { a: -7, b: 2 }], output: [3, null, -4] },
      { input: [], output: [] },
    ],
    hidden: [
      { input: [null, [], 'bad', false, {}, { a: 1 }, { b: 2 }, { a: '4', b: 2 }], output: Array(8).fill(null) },
      { input: [{ a: true, b: 1 }, { a: 2, b: true }, { a: 2, b: false }, { a: 0, b: -2 }], output: [null, null, null, 0] },
      { input: [{ a: 7, b: -2 }, { a: -7, b: -2 }, { a: 10, b: 3, extra: 'ignored' }], output: [-4, 3, 3] },
      { input: Array.from({ length: 1000 }, (_, i) => ({ a: 1000000, b: i % 2 ? 0 : -1 })), output: Array.from({ length: 1000 }, (_, i) => i % 2 ? null : -1000000) },
    ],
    reference: 'import json,sys\nout=[]\nfor request in json.load(sys.stdin):\n if not isinstance(request,dict) or type(request.get("a")) is not int or type(request.get("b")) is not int or request["b"]==0:\n  out.append(None)\n else:\n  out.append(request["a"]//request["b"])\nprint(json.dumps(out))',
    faulty: [
      'import json,sys\nout=[]\nfor r in json.load(sys.stdin):\n try: out.append(int(r["a"]/r["b"]))\n except (TypeError,KeyError,ZeroDivisionError): out.append(None)\nprint(json.dumps(out))',
      'import json,sys\nout=[]\nfor r in json.load(sys.stdin):\n if isinstance(r,dict) and isinstance(r.get("a"),int) and isinstance(r.get("b"),int) and r["b"]!=0: out.append(r["a"]//r["b"])\n else: out.append(None)\nprint(json.dumps(out))',
    ],
    understanding: {
      prompt: 'Why does isinstance(True, int) not provide the required validation here?',
      options: ['Python booleans are int subclasses, but this contract excludes them', 'True is a string', 'Every JSON value is an integer', 'It raises ZeroDivisionError'],
      answer: 0, explanation: 'bool is a subclass of int in Python. An exact type check can exclude boolean values before arithmetic.',
    },
  },
  {
    id: 'deduplicate-events', version: 1, title: 'Process retried ledger events',
    category: 'Dictionaries, backend logic and data processing', difficulty: 'intermediate',
    statement: 'Read a JSON array of objects with id (a nonempty ASCII string), account (a nonempty ASCII string) and amount (an integer). Process only the first occurrence of each id across all accounts. Ignore later occurrences entirely, even if their account or amount differs. Print a JSON object mapping each processed account to its total amount. Keep accounts whose total becomes zero. IDs and accounts are case-sensitive. Empty input returns {}. Up to 5,000 events, strings up to 40 characters, amounts between -1,000,000 and 1,000,000. Object key order does not matter.',
    starter: 'import json\nimport sys\n\nevents = json.load(sys.stdin)\n# Apply each event ID once and accumulate account totals.\n',
    samples: [
      { input: [{ id: 'one', account: 'A', amount: 5 }, { id: 'one', account: 'A', amount: 5 }, { id: 'two', account: 'A', amount: -2 }], output: { A: 3 } },
      { input: [], output: {} },
    ],
    hidden: [
      { input: [{ id: 'x', account: 'A', amount: 4 }, { id: 'x', account: 'B', amount: 99 }, { id: 'y', account: 'A', amount: -4 }], output: { A: 0 } },
      { input: [{ id: 'X', account: 'a', amount: 0 }, { id: 'x', account: 'A', amount: -1 }, { id: 'z', account: 'a', amount: 2 }], output: { a: 2, A: -1 } },
      { input: Array.from({ length: 5000 }, (_, i) => ({ id: String(i % 2500), account: 'main', amount: 1000000 })), output: { main: 2500000000 } },
    ],
    reference: 'import json,sys\nseen=set()\ntotals={}\nfor e in json.load(sys.stdin):\n if e["id"] in seen: continue\n seen.add(e["id"])\n totals[e["account"]]=totals.get(e["account"],0)+e["amount"]\nprint(json.dumps(totals))',
    faulty: [
      'import json,sys\ntotals={}\nfor e in json.load(sys.stdin):\n totals[e["account"]]=totals.get(e["account"],0)+e["amount"]\nprint(json.dumps(totals))',
      'import json,sys\nseen=set()\ntotals={}\nfor e in json.load(sys.stdin):\n key=(e["id"],e["account"])\n if key in seen: continue\n seen.add(key)\n totals[e["account"]]=totals.get(e["account"],0)+e["amount"]\nprint(json.dumps(totals))',
    ],
    understanding: {
      prompt: 'A retry has the same event ID but a different account. What should the processor do?',
      options: ['Ignore the retry entirely', 'Add it to the second account', 'Replace the first event', 'Subtract it from both accounts'],
      answer: 0, explanation: 'The contract deduplicates globally by event ID. The first event wins, regardless of later payload changes.',
    },
  },
  {
    id: 'balanced-delimiters', version: 1, title: 'Validate nested delimiters',
    category: 'Strings, stacks and algorithms', difficulty: 'advanced',
    statement: 'Read a JSON string containing only (, ), [, ], { and }. Print JSON true if every opening delimiter has a closing delimiter of the same type in correctly nested order; otherwise print JSON false. The empty string is valid. Up to 10,000 characters. There are no other characters, quoted strings or escape sequences to interpret.',
    starter: 'import json\nimport sys\n\ntext = json.load(sys.stdin)\n# Check both delimiter type and nesting order.\n',
    samples: [{ input: '([]){}', output: true }, { input: '([)]', output: false }, { input: '', output: true }],
    hidden: [
      { input: ')(', output: false }, { input: '(', output: false }, { input: '{[()]}', output: true },
      { input: '[[[', output: false }, { input: '(()))', output: false },
      { input: '('.repeat(5000) + ')'.repeat(5000), output: true },
      { input: '()'.repeat(4999) + '(]', output: false },
    ],
    reference: 'import json,sys\nstack=[]\npairs={")":"(","]":"[","}":"{"}\nvalid=True\nfor ch in json.load(sys.stdin):\n if ch in "([{": stack.append(ch)\n elif not stack or stack.pop()!=pairs[ch]:\n  valid=False\n  break\nprint(json.dumps(valid and not stack))',
    faulty: [
      'import json,sys\ns=json.load(sys.stdin)\nprint(json.dumps(all(s.count(a)==s.count(b) for a,b in [("(",")"),("[","]"),("{","}")])))',
      'import json,sys\nstack=[]\npairs={")":"(","]":"[","}":"{"}\nvalid=True\nfor ch in json.load(sys.stdin):\n if ch in "([{": stack.append(ch)\n elif not stack or stack.pop()!=pairs[ch]:\n  valid=False\n  break\nprint(json.dumps(valid))',
    ],
    understanding: {
      prompt: 'The input is "([". No closing delimiter mismatched. Why must it still fail?',
      options: ['The stack still contains unmatched opening delimiters', 'An empty string is invalid', 'Opening delimiters cannot be adjacent', 'Square brackets must come first'],
      answer: 0, explanation: 'Checking each closing delimiter is insufficient. At the end, the stack must be empty as well.',
    },
  },
];
