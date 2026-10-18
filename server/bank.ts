import { z } from 'zod';

export const skills = ['python', 'logic', 'sql', 'javascript', 'backend', 'debugging', 'apis', 'web'] as const;
export const questionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{3,80}$/), version: z.number().int().positive(),
  skill: z.enum(skills), difficulty: z.number().int().min(1).max(3),
  kind: z.enum(['concept', 'output', 'debugging']), prompt: z.string().min(10).max(3000),
  options: z.array(z.string().min(1).max(1000)).length(4), answer: z.number().int().min(0).max(3),
  explanation: z.string().min(20).max(3000), objective: z.string().min(5).max(500),
  module: z.string().regex(/^\/programmes\/[a-z-]+$/), points: z.literal(1),
}).strict().refine(q => new Set(q.options).size === 4, 'Options must be distinct');
export type Question = z.infer<typeof questionSchema>;
const modules = {
  python: 'programming-python-foundation', logic: 'dsa-technical-interview', sql: 'sql-postgresql',
  javascript: 'html-css-javascript', backend: 'django-backend-dev', debugging: 'software-engineering-testing',
  apis: 'software-engineering-testing', web: 'html-css-javascript',
};
type Row = [Question['skill'], number, Question['kind'], string, string[], string, string];
// Answer keys never enter a frontend module. Options are shuffled by the API.
const rows: Row[] = [
  ['python',1,'output','What does Python print?\nx = [1, 2]\nx.append(3)\nprint(len(x))',['3','2','4','An error'],'append adds one item to the existing list, so its length becomes 3.','Recognize list mutation'],
  ['python',2,'output','What does Python print?\na = [1]\nb = a\nb.append(2)\nprint(a)',['[1, 2]','[1]','[2]','None'],'Both names reference the same list. Appending through b also changes the list referenced by a.','Understand references and mutation'],
  ['python',3,'debugging','A function uses def add(x, items=[]): items.append(x); return items. How should independent calls avoid sharing a list?',['Use items=None and create a new list when items is None','Clear items after returning','Use a tuple default and call append','Use a global list'],'Default arguments are evaluated once at definition. A None sentinel permits a fresh list on each independent call.','Avoid mutable default arguments'],
  ['logic',1,'concept','A loop visits each item of a list of n elements exactly once. What is its time complexity?',['O(n)','O(1)','O(n²)','O(log n)'],'One constant-time operation per element grows linearly with the number of elements.','Recognize linear complexity'],
  ['logic',2,'output','What is the sum of integers produced by Python range(1, 4)?',['6','10','4','3'],'The upper bound is excluded. The values are 1, 2, 3, whose sum is 6.','Reason about exclusive bounds'],
  ['logic',3,'concept','Binary search repeatedly halves a sorted search interval. What is its worst-case number of comparisons for n items, asymptotically?',['O(log n)','O(n)','O(n log n)','O(n²)'],'Each comparison removes roughly half the remaining interval; only logarithmically many halvings are needed.','Reason about binary search'],
  ['sql',1,'concept','Which SQL clause filters rows before grouping?',['WHERE','HAVING','ORDER BY','LIMIT'],'WHERE filters input rows. HAVING filters groups after aggregation.','Distinguish row and group filtering'],
  ['sql',2,'concept','A table has values 4, NULL, 8 in column score. What does COUNT(score) return?',['2','3','12','NULL'],'COUNT(column) counts non-NULL values. COUNT(*) would count all three rows.','Handle SQL NULL semantics'],
  ['sql',3,'debugging','A LEFT JOIN should keep customers with no orders. Where should an orders.status filter go to preserve unmatched customers?',['In the JOIN ON condition','In WHERE orders.status = the desired status','In ORDER BY','In LIMIT'],'Putting the right-side filter in ON controls matching while preserving unmatched left rows. A WHERE equality would discard their NULL values.','Preserve outer join semantics'],
  ['javascript',1,'output','What is the value of 2 === "2" in JavaScript?',['false','true','2','undefined'],'Strict equality does not coerce types. A number and a string are not strictly equal.','Understand strict equality'],
  ['javascript',2,'output','What does [1, 2, 3].map(x => x * 2) produce?',['[2, 4, 6]','[1, 2, 3, 2]','12','[2, 3, 4]'],'map returns a new array containing the callback result for each original element.','Transform arrays without mutation'],
  ['javascript',3,'output','In a normal JavaScript task: console.log("A"); Promise.resolve().then(() => console.log("B")); console.log("C"); What is the order?',['A, C, B','A, B, C','B, A, C','C, B, A'],'The synchronous statements run first. The promise callback runs in a later microtask, after the current stack finishes.','Reason about microtasks'],
  ['backend',1,'concept','Where must authorization to read a private student record be enforced?',['On the server for each request','Only by hiding the button','Only in browser storage','Only on the sign-in screen'],'Clients can be modified. The server must verify permission and ownership for every protected request.','Enforce authorization at the trust boundary'],
  ['backend',2,'concept','Two requests attempt to buy the last available seat. What prevents both from succeeding?',['A transactional database constraint or lock','A disabled browser button','A cached availability label','A longer client timeout'],'Concurrent requests require atomic enforcement in the database, not just checks in the browser.','Prevent concurrent overbooking'],
  ['backend',3,'concept','A payment webhook may be delivered twice. What should the handler do?',['Verify authenticity and deduplicate the event inside a transaction','Create an enrollment on each delivery','Trust the browser success redirect','Ignore all retries'],'Authenticity establishes the source; a unique provider event identifier and transaction prevent duplicate effects.','Process external events idempotently'],
  ['debugging',1,'debugging','Python code accesses items[0]. How can it safely handle an empty list when the specification asks for None?',['Return None when not items before indexing','Always use items[1]','Catch every exception and return 0','Append an arbitrary value'],'Checking emptiness before indexing handles the specified boundary without hiding unrelated errors.','Handle an empty collection'],
  ['debugging',2,'debugging','A function should sum all values, but returns inside its for loop. What fixes the early result?',['Move return after the loop','Move return before the loop','Use a global accumulator','Delete the accumulator'],'A return exits the function immediately. Returning after the loop allows every item to contribute.','Identify premature return'],
  ['debugging',3,'concept','A test sometimes fails only when run after another test. What should you investigate first?',['Shared mutable state or incomplete cleanup','Whether variable names are short','Whether tests have comments','Whether the editor uses tabs'],'Order-dependent failures commonly indicate shared state, resources or mocks that were not isolated or cleaned up.','Diagnose test isolation failures'],
  ['apis',1,'concept','Which HTTP status conventionally means a resource was not found?',['404','200','201','503'],'404 indicates a missing resource. 503 describes an unavailable service, not a missing record.','Interpret HTTP status codes'],
  ['apis',2,'concept','Which request method is defined as idempotent when setting a resource representation at a known URL?',['PUT','POST in every API','CONNECT','Any method with JSON'],'Repeating the same PUT should have the same intended effect on the resource as sending it once.','Understand HTTP idempotency'],
  ['apis',3,'concept','An update includes a version that no longer matches the stored record. What protects against a lost update?',['Reject the stale write and request reconciliation','Overwrite the latest record silently','Ignore the version','Retry the same stale write forever'],'Optimistic concurrency checks detect stale writes and allow the caller to reconcile with the current version.','Prevent lost updates'],
  ['web',1,'concept','Which HTML element provides a native keyboard-operable action control?',['button','div with a click handler only','span with a color','img without alternative text'],'A native button provides keyboard activation and semantics that generic elements do not automatically provide.','Use semantic interactive elements'],
  ['web',2,'concept','How should a visible form label be associated with its input?',['Use label for matching the input id','Use only placeholder text','Use a nearby unconnected paragraph','Use title on a wrapper'],'The explicit for/id association gives the input an accessible name and makes clicking the label focus the input.','Associate accessible form labels'],
  ['web',3,'concept','Why should user-provided text be rendered as text rather than inserted as raw HTML?',['To prevent untrusted markup and script injection','To make the font larger','To enable inline event handlers','To disable all HTTP requests'],'Text rendering escapes markup, preventing user-controlled content from becoming executable HTML.','Prevent cross-site scripting'],
];
export const bank: Question[] = rows.map(([skill,difficulty,kind,prompt,options,explanation,objective]) => questionSchema.parse({
  id: `${skill}-${difficulty}`, version: 1, skill, difficulty, kind, prompt, options, answer: 0,
  explanation, objective, module: `/programmes/${modules[skill]}`, points: 1,
}));
