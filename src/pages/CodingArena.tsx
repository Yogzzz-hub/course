import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Code2, FlaskConical, Play, Send, ShieldCheck, X } from 'lucide-react';
import { challengeById, challenges, type Challenge } from '../arena/challenges';
import { judgeApi, readPractice, savePractice, type SampleRun } from '../arena/api';
import type { JudgeStatus, LearningMode, PublicCase, SubmissionResult } from '../arena/contracts';
import { understandingCheck } from '../arena/understanding';
import { difficultyLabel } from '../assessment/skills';
import { programmeFor } from '../assessment/skills';
import { track } from '../analytics/events';
import { Breadcrumbs, CodeBlock, Meter, Notice, ToolHero } from '../components/platform/ui';

const newKey = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const show = (value: unknown) => JSON.stringify(value);

/** Renders the small subset of markdown the statements use: `code` and **bold**. */
function RichText({ text }: { text: string }) {
  return <>{text.split(/(`[^`]+`|\*\*[^*]+\*\*)/).map((part, index) => part.startsWith('`') ? <code key={index} className="pf-mono">{part.slice(1, -1)}</code> : part.startsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> : <Fragment key={index}>{part}</Fragment>)}</>;
}

export default function CodingArena() {
  const [search, setSearch] = useSearchParams();
  const challenge = challengeById(search.get('challenge'));
  const [status, setStatus] = useState<JudgeStatus | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    judgeApi.status(controller.signal).then(setStatus).catch(() => setStatus({ available: false, languages: [], message: 'The judging service did not respond. This is not a problem with your code.' }));
    return () => controller.abort();
  }, []);
  return challenge
    ? <Workspace key={challenge.id} challenge={challenge} status={status} onBack={() => setSearch({})}/>
    : <ChallengeList status={status} onOpen={id => { setSearch({ challenge: id }); window.scrollTo({ top: 0 }); }}/>;
}

function JudgeStatusNotice({ status }: { status: JudgeStatus | null }) {
  if (!status) return <p role="status" className="pf-small pf-muted">Checking the judging service…</p>;
  if (status.available) return <Notice tone="success" title="Judging service connected">Your code runs in an isolated sandbox with time, memory and network limits. Hidden tests stay on the server.</Notice>;
  return <Notice tone="warning" title="Live code judging is off">{status.message}</Notice>;
}

function ChallengeList({ status, onOpen }: { status: JudgeStatus | null; onOpen: (id: string) => void }) {
  const [difficulty, setDifficulty] = useState<0 | 1 | 2 | 3>(0);
  const practice = useMemo(() => typeof window === 'undefined' ? [] : readPractice(), []);
  const shown = challenges.filter(item => !difficulty || item.difficulty === difficulty);
  return <>
    <ToolHero title={<>Coding challenge arena.<br/><span className="text-gradient">Prove you understand it.</span></>} description="Write Python functions against a clear specification. Solutions are judged on public examples plus private edge-case, boundary and randomised tests, then you answer follow-up questions about your code." aside={<div className="pf-card pf-card-dark pf-stack">
      <h2>How judging works</h2>
      <ul className="pf-stack pf-small" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {['Any correct approach passes; tests check results, not your code style', 'Correctness 60% · edge cases 20% · understanding 15% · code quality 5%', 'A judging-system failure is never counted against you', 'Nobody claims to detect AI-written code; follow-ups check understanding'].map(item => <li key={item} className="pf-row"><Check size={16} aria-hidden="true"/>{item}</li>)}
      </ul>
    </div>}/>
    <section className="container pf-section pf-stack" style={{ gap: 18 }}>
      <JudgeStatusNotice status={status}/>
      <div className="pf-spread">
        <div className="pf-tabs" role="tablist" aria-label="Filter by difficulty">{([0, 1, 2, 3] as const).map(level => <button key={level} type="button" role="tab" aria-selected={difficulty === level} onClick={() => setDifficulty(level)}>{level ? difficultyLabel[level] : 'All'}</button>)}</div>
        <span className="pf-small pf-muted">{shown.length} challenge{shown.length === 1 ? '' : 's'}{practice.length ? ` · ${practice.length} practice attempt${practice.length === 1 ? '' : 's'} saved on this device` : ''}</span>
      </div>
      <div className="pf-challenge-list">{shown.map(item => <button key={item.id} type="button" className="pf-challenge-card" onClick={() => onOpen(item.id)}>
        <span className="pf-row"><span className="pf-chip">{difficultyLabel[item.difficulty]}</span>{item.topics.map(topic => <span key={topic} className="pf-chip pf-chip-muted">{topic}</span>)}</span>
        <h3>{item.title}</h3>
        <p><RichText text={item.statement.split('. ')[0] + '.'}/></p>
        <span className="pf-mono pf-small pf-muted">{item.signature}</span>
      </button>)}</div>
    </section>
  </>;
}

type Stage = 'write' | 'check' | 'report';

function Workspace({ challenge, status, onBack }: { challenge: Challenge; status: JudgeStatus | null; onBack: () => void }) {
  const [source, setSource] = useState(challenge.starter);
  const [mode, setMode] = useState<LearningMode>('independent');
  const [declaredAi, setDeclaredAi] = useState(false);
  const [samples, setSamples] = useState<SampleRun | null>(null);
  const [submission, setSubmission] = useState<SubmissionResult | null>(null);
  const [busy, setBusy] = useState<'run' | 'submit' | null>(null);
  const [error, setError] = useState('');
  const [stage, setStage] = useState<Stage>('write');
  const [understanding, setUnderstanding] = useState<{ correct: number; total: number } | null>(null);
  const [save, setSave] = useState(false);
  const submitKey = useRef(newKey());
  const available = !!status?.available;
  const programme = programmeFor(challenge.programmeId);
  useEffect(() => { track('coding_challenge_started', { challenge: challenge.id }); }, [challenge.id]);

  async function runSamples() {
    setBusy('run'); setError('');
    try { setSamples(await judgeApi.runSamples(challenge.id, challenge.version, source)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The sample tests could not run.'); }
    finally { setBusy(null); }
  }
  async function submit() {
    setBusy('submit'); setError('');
    try {
      const result = await judgeApi.submit({ challengeId: challenge.id, challengeVersion: challenge.version, language: 'python', source, mode, declaredAiUse: declaredAi, idempotencyKey: submitKey.current });
      setSubmission(result);
      track('code_submitted', { challenge: challenge.id, state: result.state, passed: result.state === 'graded' && result.score.correctness === 100 && result.score.edge === 100 });
      if (result.state === 'graded') setStage('check');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Your code could not be submitted.'); }
    finally { setBusy(null); }
  }
  async function finishCheck(answers: { correct: number; total: number }) {
    setUnderstanding(answers);
    let latest = submission;
    if (submission && available) {
      try { latest = await judgeApi.recordUnderstanding(submission.submissionId, answers); setSubmission(latest); } catch { /* The local report still shows the answers. */ }
    }
    track('understanding_completed', { challenge: challenge.id, correct: answers.correct, total: answers.total, mode, ai: declaredAi, judged: !!latest });
    if (save) savePractice({ challengeId: challenge.id, at: new Date().toISOString(), mode, declaredAiUse: declaredAi, understanding: answers, judged: !!latest, total: latest?.score.total ?? null });
    setStage('report');
    requestAnimationFrame(() => document.getElementById('arena-report')?.focus());
  }

  return <>
    <div className="container"><Breadcrumbs items={[{ to: '/', label: 'Home' }, { to: '/coding-arena', label: 'Coding arena' }, { label: challenge.title }]}/></div>
    <section className="container pf-section" style={{ paddingTop: 16 }}>
      <div className="pf-spread" style={{ marginBottom: 16 }}>
        <h1 tabIndex={-1} className="display-title" style={{ fontSize: 'clamp(2rem, 4.6vw, 3.2rem)' }}>{challenge.title}</h1>
        <button type="button" className="text-link" onClick={onBack}><ArrowLeft size={16} aria-hidden="true"/>All challenges</button>
      </div>
      <div className="pf-workspace">
        <div className="pf-stack">
          <article className="pf-card pf-stack">
            <div className="pf-row"><span className="pf-chip">{difficultyLabel[challenge.difficulty]}</span>{challenge.topics.map(topic => <span key={topic} className="pf-chip pf-chip-muted">{topic}</span>)}</div>
            <p className="pf-mono">{challenge.signature}</p>
            <p style={{ fontSize: '.95rem', color: 'var(--text)' }}><RichText text={challenge.statement}/></p>
            <h2 style={{ fontSize: '1.1rem' }}>Examples</h2>
            <div className="pf-tests">{challenge.examples.map(example => <div key={example.id} className="pf-test-case"><span className="pf-mono">{challenge.functionName}({example.args.map(show).join(', ')})</span><span className="pf-mono">→ {'error' in example.expect ? `raises ${example.expect.error}` : show(example.expect.value)}</span>{example.note && <span className="pf-muted">{example.note}</span>}</div>)}</div>
            <h2 style={{ fontSize: '1.1rem' }}>Constraints</h2>
            <ul className="pf-small" style={{ margin: 0, paddingLeft: 18 }}>{challenge.constraints.map(item => <li key={item}>{item}</li>)}</ul>
            <p className="pf-small pf-muted">Your solution is also run against hidden edge-case, boundary and randomised tests. Their inputs are never shown.</p>
          </article>
        </div>
        <div className="pf-stack">
          <JudgeStatusNotice status={status}/>
          <fieldset className="pf-choices" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <legend>How are you practising?</legend>
            <label className="pf-choice"><input type="radio" name="mode" checked={mode === 'assisted'} onChange={() => setMode('assisted')}/><div><strong>AI-assisted practice</strong><span>Use any help you like and learn from it. Good for building understanding.</span></div></label>
            <label className="pf-choice"><input type="radio" name="mode" checked={mode === 'independent'} onChange={() => setMode('independent')}/><div><strong>Independent skill check</strong><span>Work on your own to see what you can do unaided. Unsupervised, so it relies on your honesty.</span></div></label>
          </fieldset>
          <CodeEditor value={source} onChange={setSource} label={`Your solution to ${challenge.title}`}/>
          <label className="pf-check"><input type="checkbox" checked={declaredAi} onChange={event => setDeclaredAi(event.target.checked)}/><span>I used AI assistance for this solution. <span className="pf-muted">Saying so is always fine; it changes how the report describes your result, never the score.</span></span></label>
          {error && <Notice tone="warning">{error}</Notice>}
          <div className="pf-actions">
            <button type="button" className="button button-secondary" onClick={runSamples} disabled={!available || !!busy} aria-disabled={!available || !!busy}><Play size={16} aria-hidden="true"/>{busy === 'run' ? 'Running…' : 'Run sample tests'}</button>
            <button type="button" className="button button-primary" onClick={submit} disabled={!available || !!busy || stage !== 'write'} aria-disabled={!available || !!busy || stage !== 'write'}><Send size={16} aria-hidden="true"/>{busy === 'submit' ? 'Judging…' : 'Submit solution'}</button>
            {!available && stage === 'write' && <button type="button" className="button button-secondary" onClick={() => setStage('check')}><FlaskConical size={16} aria-hidden="true"/>Take the understanding check</button>}
          </div>
          {samples && <SampleResults run={samples}/>}
          {submission && <SubmissionReport result={submission}/>}
          {stage === 'check' && <UnderstandingCheck challenge={challenge} judged={!!submission} save={save} onSave={setSave} onDone={finishCheck}/>}
          {stage === 'report' && understanding && <FinalReport challenge={challenge} submission={submission} understanding={understanding} mode={mode} declaredAi={declaredAi} programmeName={programme?.name} programmeSlug={programme?.slug}/>}
        </div>
      </div>
    </section>
  </>;
}

/** A plain-textarea editor: line numbers, Tab indents, and Esc then Tab leaves the field. */
function CodeEditor({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const area = useRef<HTMLTextAreaElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const releaseTab = useRef(false);
  const lineCount = value.split('\n').length;
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape') { releaseTab.current = true; return; }
    if (event.key !== 'Tab' || releaseTab.current || event.shiftKey) { releaseTab.current = false; return; }
    event.preventDefault();
    const element = event.currentTarget;
    const { selectionStart, selectionEnd } = element;
    const next = value.slice(0, selectionStart) + '    ' + value.slice(selectionEnd);
    onChange(next);
    requestAnimationFrame(() => { element.selectionStart = element.selectionEnd = selectionStart + 4; });
  }
  return <div className="pf-stack" style={{ gap: 6 }}>
    <label htmlFor="arena-editor" className="pf-small" style={{ fontWeight: 600, color: 'var(--text)' }}>{label}</label>
    <div className="pf-editor">
      <div ref={gutter} className="pf-editor-gutter" aria-hidden="true">{Array.from({ length: lineCount }, (_, index) => index + 1).join('\n')}</div>
      <textarea ref={area} id="arena-editor" value={value} spellCheck={false} autoCapitalize="off" autoCorrect="off" aria-describedby="editor-help" onChange={event => onChange(event.target.value)} onKeyDown={onKeyDown} onScroll={event => { if (gutter.current) gutter.current.scrollTop = event.currentTarget.scrollTop; }} rows={Math.max(12, lineCount + 2)}/>
    </div>
    <span id="editor-help" className="pf-small pf-muted">Tab inserts four spaces. Press Esc, then Tab, to move focus out of the editor.</span>
  </div>;
}

const verdictText: Record<PublicCase['verdict'], string> = { passed: 'Passed', wrong_answer: 'Wrong answer', runtime_error: 'Runtime error', time_limit: 'Time limit exceeded', memory_limit: 'Memory limit exceeded', compile_error: 'Did not compile', not_run: 'Not run' };
function CaseList({ cases }: { cases: PublicCase[] }) {
  return <div className="pf-tests">{cases.map(item => <div key={item.id} className="pf-test-case">
    <span className="pf-row"><span className={`pf-mark ${item.verdict === 'passed' ? 'pf-mark-ok' : 'pf-mark-miss'}`} aria-hidden="true">{item.verdict === 'passed' ? '✓' : '✕'}</span><strong>{verdictText[item.verdict]}</strong></span>
    <span className="pf-mono">Input: {item.args.map(show).join(', ')}</span>
    <span className="pf-mono">Expected: {typeof item.expected === 'string' && item.expected.startsWith('raises') ? item.expected : show(item.expected)}</span>
    {item.actual !== undefined && item.verdict !== 'passed' && <span className="pf-mono">Got: {show(item.actual)}</span>}
    {item.error && item.verdict !== 'passed' && <span className="pf-mono">Error: {item.error}</span>}
  </div>)}</div>;
}
function SampleResults({ run }: { run: SampleRun }) {
  if (run.state === 'judge_error') return <Notice tone="warning" title="Judging error">{run.message ?? 'The judging service failed. This is not a problem with your code.'}</Notice>;
  return <div className="pf-card pf-stack"><h2 style={{ fontSize: '1.15rem' }}>Sample tests</h2>{run.compileError && <Notice tone="warning" title="Your code did not load">{run.compileError}</Notice>}<CaseList cases={run.cases}/></div>;
}
function SubmissionReport({ result }: { result: SubmissionResult }) {
  if (result.state === 'judge_error') return <Notice tone="warning" title="Judging error — not a failed result">{result.judgeError} Submission {result.submissionId}.</Notice>;
  const rows: [string, number | null][] = [['Correctness', result.score.correctness], ['Edge cases', result.score.edge], ['Understanding', result.score.understanding], ['Code quality', result.score.quality]];
  return <div className="pf-card pf-stack">
    <h2 style={{ fontSize: '1.15rem' }}>Judged result</h2>
    {result.compileError && <Notice tone="warning" title="Your code did not load">{result.compileError}</Notice>}
    <p>Hidden tests passed: <strong>{result.hidden.passed} of {result.hidden.total}</strong></p>
    <div className="pf-tags">{Object.entries(result.hidden.byTag).map(([tag, tally]) => <span key={tag}>{tag}: {tally.passed}/{tally.total}</span>)}</div>
    {rows.map(([label, value]) => <div key={label} className="pf-skill-row"><div className="pf-spread"><span>{label}</span><span>{value === null ? 'Not assessed' : `${value}%`}</span></div>{value !== null && <Meter value={value} label={label}/>}</div>)}
    <p className="pf-small pf-muted">Score so far: {result.score.total ?? '—'}% of the {result.score.assessedWeight}% of the rubric assessed. Grader {result.graderVersion}{result.correctedBy ? `; corrected by staff: ${result.correctionReason}` : ''}.</p>
    <CaseList cases={result.publicCases}/>
  </div>;
}

function UnderstandingCheck({ challenge, judged, save, onSave, onDone }: { challenge: Challenge; judged: boolean; save: boolean; onSave: (value: boolean) => void; onDone: (answers: { correct: number; total: number }) => void }) {
  const items = useMemo(() => understandingCheck(challenge.id, Math.floor(Math.random() * 2 ** 31)), [challenge.id]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const correct = items.filter(item => answers[item.question.id] === item.question.answer).length;
  const complete = items.every(item => answers[item.question.id]);
  return <section className="pf-card pf-stack" aria-labelledby="check-title">
    <h2 id="check-title" style={{ fontSize: '1.25rem' }}>{judged ? 'Your code passed judging. Now let\'s check you can work with it.' : 'Understanding check (your code was not judged)'}</h2>
    <p className="pf-small pf-muted">These questions are about this problem and solutions like yours. They check understanding; they do not try to detect who or what wrote the code.</p>
    {items.map(({ question, optionOrder }, index) => {
      const chosen = answers[question.id];
      return <fieldset key={question.id} className="pf-choices pf-question">
        <legend>{index + 1}. {question.prompt}</legend>
        {question.code && <CodeBlock language={question.code.language} source={question.code.source}/>}
        {optionOrder.map(id => { const option = question.options.find(item => item.id === id)!; return <label key={id} className={`pf-choice ${question.codeOptions ? 'pf-choice-code' : ''}`}><input type="radio" name={question.id} value={id} disabled={submitted} checked={chosen === id} onChange={() => setAnswers(current => ({ ...current, [question.id]: id }))}/><div><strong style={{ whiteSpace: 'pre-wrap' }}>{option.text}</strong></div></label>; })}
        {submitted && <Notice tone={chosen === question.answer ? 'success' : 'info'} title={chosen === question.answer ? 'Correct' : `Answer: ${question.options.find(item => item.id === question.answer)!.text}`}>{question.explanation}</Notice>}
      </fieldset>;
    })}
    {!submitted ? <div className="pf-stack">
      <label className="pf-check"><input type="checkbox" checked={save} onChange={event => onSave(event.target.checked)}/><span>Save this attempt to my practice history on this device.</span></label>
      <div className="pf-actions"><button type="button" className="button button-primary" disabled={!complete} aria-disabled={!complete} onClick={() => setSubmitted(true)}>Check my answers<ArrowRight size={16} aria-hidden="true"/></button>{!complete && <span className="pf-small pf-muted">Answer every question to continue.</span>}</div>
    </div> : <div className="pf-actions"><button type="button" className="button button-primary" onClick={() => onDone({ correct, total: items.length })}>See my skill report<ArrowRight size={16} aria-hidden="true"/></button></div>}
  </section>;
}

function FinalReport({ challenge, submission, understanding, mode, declaredAi, programmeName, programmeSlug }: { challenge: Challenge; submission: SubmissionResult | null; understanding: { correct: number; total: number }; mode: LearningMode; declaredAi: boolean; programmeName?: string; programmeSlug?: string }) {
  const judged = submission?.state === 'graded';
  const fullyCorrect = judged && submission.score.correctness === 100 && submission.score.edge === 100;
  const understood = understanding.correct === understanding.total;
  const focus = challenge.topics[0].toLowerCase();
  const lines: ReactNode[] = [];
  if (!judged) lines.push('Your code was not judged because the judging service is not connected, so this report covers understanding only.');
  else if (fullyCorrect) lines.push('Your solution works: it passed every public, hidden and edge-case test.');
  else lines.push(`Your solution passed ${submission.hidden.passed} of ${submission.hidden.total} hidden tests. The failing categories above show where to look.`);
  lines.push(understood ? `You answered all ${understanding.total} follow-up questions correctly, which suggests you can read, extend and debug this kind of code.` : `You answered ${understanding.correct} of ${understanding.total} follow-up questions correctly. More independent practice with ${focus} could strengthen your skills.`);
  if (declaredAi || mode === 'assisted') lines.push('You practised with AI help, so treat this as a learning exercise rather than a measure of unaided skill. Try the same problem again in independent mode when you are ready.');
  return <section id="arena-report" tabIndex={-1} className="pf-card pf-card-dark pf-stack" aria-labelledby="report-title">
    <h2 id="report-title">Your skill report</h2>
    {lines.map((line, index) => <p key={index}>{line}</p>)}
    <div className="pf-grid pf-grid-2">
      <div><span className="pf-small">Code correctness</span><p style={{ color: '#fff', fontSize: '1.4rem' }}>{judged ? `${submission.score.correctness}%` : 'Not judged'}</p></div>
      <div><span className="pf-small">Understanding check</span><p style={{ color: '#fff', fontSize: '1.4rem' }}>{understanding.correct}/{understanding.total}</p></div>
    </div>
    <div className="pf-actions">
      {programmeSlug && <Link to={programmeSlug} className="button button-primary" style={{ background: '#fff', color: 'var(--accent)' }} onClick={() => track('course_viewed', { programme: challenge.programmeId, from: 'arena' })}>Learn to Build and Debug Independently<ArrowRight size={16} aria-hidden="true"/></Link>}
      <Link to="/coding-arena" className="button button-secondary" style={{ color: '#fff', borderColor: 'rgb(255 255 255 / .3)', background: 'transparent' }}><Code2 size={16} aria-hidden="true"/>Try another challenge</Link>
    </div>
    {programmeName && <p className="pf-small"><ShieldCheck size={14} aria-hidden="true"/> Recommended: {programmeName}, which covers {challenge.topics.join(' and ').toLowerCase()}.</p>}
    <p className="pf-small"><X size={12} aria-hidden="true"/> No part of this report claims to know whether AI wrote your code.</p>
  </section>;
}
