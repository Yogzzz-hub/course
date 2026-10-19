# Code understanding and execution evidence

Time/space complexity is a property of an algorithm under stated assumptions. It cannot establish who wrote a program: the same code can be human-written, AI-assisted, copied or collaboratively developed. Measured execution time and memory also depend on inputs, interpreter, environment and measurement methods. The platform does not publish AI-authorship probabilities, accusations or an “AI detected” verdict.

## Implemented behavior

- Each of the seven Python challenges now has three independently versioned checkpoint variants: its existing reasoning/edge-case question, a complexity question about an explicitly described approach, and a changed-requirement reasoning question. There are 21 variants in total.
- One checkpoint and its shuffled option order are selected once when a new submission is persisted. Retries reuse that snapshot and rejudges keep it. Different solutions are not compared to reference source code.
- Checkpoints stay unavailable until full judging completes. Answer keys and explanations stay server-side until the answer is committed. Existing understanding scores, challenge rubrics and old submission snapshots retain their behavior.
- Complexity questions state assumptions such as bounded integers, excluded parsed-input storage, expected hash behavior or whether output storage is counted. They test knowledge of the described algorithm, not an automatically inferred complexity class for arbitrary submitted code.
- The Judge0 adapter requests reported `time` and `memory`, validates finite nonnegative measurements, and stores them with test outcomes. Results show the maximum reported execution time in seconds and memory in KB, along with measurement coverage. Missing or invalid metrics remain unavailable; genuine reported zero measurements remain zero. No metric changes a learner's score.
- The arena explains the limits of these observations and labels the selected checkpoint type. AI assistance remains self-reported. New point-recording operations exclude self-declared AI-assisted work from independent leaderboard points; correctness and educational feedback remain available. Historical points are not retroactively deleted by this change.

The resource fields and units follow the [official Judge0 API documentation](https://ce.judge0.com/). The adapter does not expose hidden input or expected-output values, administrative credentials or raw judge diagnostics.

## Limits and stronger verification

One randomized multiple-choice checkpoint is limited evidence of understanding. A learner can guess or use assistance again. Changed-requirement questions ask which change is appropriate; this feature does not execute a modified second program or conduct an oral examination. It does not detect pasted code, monitor typing or infer authorship from style.

For higher-stakes verification, use a disclosed, supervised explain-and-modify exercise with independently checked outputs and human review. Ask the learner to trace a specific input, justify complexity assumptions, describe an edge case and implement a small changed requirement. A failed answer indicates a practice need, not proof of AI use. These supervised facilities are not implemented here.

The reviewed external judge is still required for actual executions and live measurements. It remains disabled in this workspace. Adapter transports and browser fixtures validate contracts; they do not establish real sandbox performance or isolation. No production deployment was performed.

## Files and operations

`server/understanding.ts` contains checkpoint keys; `server/app.ts` snapshots a checkpoint; `server/judge.ts` (grader `python-stdio-1.2.0`) records measurements; `server/ranking.ts` enforces the declared-assistance point rule. The arena and `ExecutionEvidence.tsx` display context and resources. Existing JSON snapshot/result columns need no schema migration or new environment variable. Restart the API and separate judging worker after deploying these changes.

An existing unrelated booking select had an invalid button reference cast to `any` on a decorative div. The lint fix removes that reference and restores focus to the actual native select. The booking accessibility journey is included in targeted validation.

Validation: 104 unit tests, 11 database integration tests and 8 targeted browser tests passed. Lint, TypeScript and production build passed. Browser coverage includes resource/complexity presentation, unavailable execution recovery, challenge switching, cancellation/retry boundaries, mobile arena accessibility and the booking accessibility journey.
