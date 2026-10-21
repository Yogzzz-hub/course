import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Clock3, Code2, ListChecks, LockKeyhole, Printer, RotateCcw, X } from 'lucide-react';
import { assessmentApi, type AttemptView } from '../assessment/api';
import { type AssessmentResult, bandLabel, levelLabel } from '../assessment/results';
import { difficultyLabel, focusAreas, skillInfo, tracks, type FocusId, type TrackId } from '../assessment/skills';
import { track } from '../analytics/events';
import { useExperiment } from '../analytics/experiments';
import { CodeBlock, Meter, Notice, ToolHero } from '../components/platform/ui';
import { sqlFixtures } from '../assessment/questionBank';

type Phase = { kind: 'setup'; resume: AttemptView | null } | { kind: 'question'; view: AttemptView } | { kind: 'results'; result: AssessmentResult } | { kind: 'loading' };
const newKey = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export default function SkillTest() {
  const [search] = useSearchParams();
  const [phase, setPhase] = useState<Phase>({ kind: 'setup', resume: null });
  const [error, setError] = useState('');
  useEffect(() => {
    assessmentApi.resume().then(resume => setPhase(current => current.kind === 'setup' ? { kind: 'setup', resume } : current)).catch(() => {});
  }, []);
  const initialFocus = focusAreas.some(item => item.id === search.get('focus')) ? search.get('focus') as FocusId : 'core';

  async function start(trackId: TrackId, focus: FocusId, save: boolean) {
    setError('');
    setPhase({ kind: 'loading' });
    try {
      const view = await assessmentApi.start({ track: trackId, focus, saveProgress: save });
      track('assessment_started', { track: trackId, focus });
      setPhase({ kind: 'question', view });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The test could not start.'); setPhase({ kind: 'setup', resume: null }); }
  }
  async function finish(view: AttemptView) {
    const result = await assessmentApi.result(view.attemptId);
    track('assessment_completed', { percent: result.total.percent, correct: result.total.correct, asked: result.total.asked, track: view.track, focus: view.focus, ...Object.fromEntries(result.skills.flatMap(item => [[`s_${item.skill}`, item.percent], [`l_${item.skill}`, item.level]])) });
    setPhase({ kind: 'results', result });
    requestAnimationFrame(() => document.getElementById('results-title')?.focus());
  }

  return <>
    {phase.kind !== 'question' && phase.kind !== 'results' && <ToolHero
      title={<>Developer Reality Check.<br/><span className="text-gradient">Know where you stand.</span></>}
      description="A free, adaptive skill test for aspiring developers. Answer ten questions on Python, logic, SQL, JavaScript, debugging and the web, then see exactly what you got right, why, and what to learn next."
      aside={<div className="pf-card pf-card-dark pf-stack">
        <h2>What you get</h2>
        <ul className="pf-stack pf-small" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {['A score calculated only from your answers', 'A skill-by-skill breakdown', 'An explanation for every question', 'Course modules that match your gaps', 'A route into your personalised roadmap'].map(item => <li key={item} className="pf-row"><Check size={16} aria-hidden="true"/>{item}</li>)}
        </ul>
      </div>}>
      <div className="pf-hero-meta"><span><ListChecks size={15} aria-hidden="true"/>10 questions</span><span><Clock3 size={15} aria-hidden="true"/>About 5–10 minutes</span><span><LockKeyhole size={15} aria-hidden="true"/>No account needed</span></div>
    </ToolHero>}
    <section className="container pf-section">
      {error && <Notice tone="warning" title="Something went wrong">{error}</Notice>}
      {phase.kind === 'setup' && <Setup resume={phase.resume} initialFocus={initialFocus} onStart={start} onResume={view => setPhase({ kind: 'question', view })}/>}
      {phase.kind === 'loading' && <p role="status" className="pf-muted">Preparing your questions…</p>}
      {phase.kind === 'question' && <QuestionStep view={phase.view} onAnswered={async view => { if (view.status === 'completed') await finish(view); else setPhase({ kind: 'question', view }); }} onQuit={async () => { await assessmentApi.discard(phase.view.attemptId); setPhase({ kind: 'setup', resume: null }); }}/>}
      {phase.kind === 'results' && <Results result={phase.result} onRestart={() => setPhase({ kind: 'setup', resume: null })}/>}
    </section>
  </>;
}

function Setup({ resume, initialFocus, onStart, onResume }: { resume: AttemptView | null; initialFocus: FocusId; onStart: (track: TrackId, focus: FocusId, save: boolean) => void; onResume: (view: AttemptView) => void }) {
  const [trackId, setTrack] = useState<TrackId>('beginner');
  const [focus, setFocus] = useState<FocusId>(initialFocus);
  const [save, setSave] = useState(false);
  function submit(event: FormEvent) { event.preventDefault(); onStart(trackId, focus, save); }
  return <div className="pf-test">
    {resume && <div className="pf-prompt" role="region" aria-label="Saved test">
      <div><strong>You have a test in progress</strong><p>Question {resume.index + 1} of {resume.total}, saved on this device.</p></div>
      <button type="button" className="button button-primary" onClick={() => onResume(resume)}>Resume test<ArrowRight size={16} aria-hidden="true"/></button>
    </div>}
    <form className="pf-card pf-stack" onSubmit={submit} aria-labelledby="setup-title" style={{ gap: 26 }}>
      <h2 id="setup-title">Set up your test</h2>
      <fieldset className="pf-choices pf-choices-3">
        <legend>Where are you starting from?</legend>
        {tracks.map(item => <label key={item.id} className="pf-choice"><input type="radio" name="track" value={item.id} checked={trackId === item.id} onChange={() => setTrack(item.id)}/><div><strong>{item.label}</strong><span>{item.description}</span></div></label>)}
      </fieldset>
      <fieldset className="pf-choices pf-choices-3">
        <legend>What should it cover?</legend>
        {focusAreas.map(item => <label key={item.id} className="pf-choice"><input type="radio" name="focus" value={item.id} checked={focus === item.id} onChange={() => setFocus(item.id)}/><div><strong>{item.label}</strong><span>{item.description}</span></div></label>)}
      </fieldset>
      <label className="pf-check"><input type="checkbox" checked={save} onChange={event => setSave(event.target.checked)}/><span><strong>Save my progress on this device.</strong> Your answers stay in this browser so you can resume later. Leave this unticked and nothing is stored after you close the page.</span></label>
      <p className="pf-small pf-muted">The difficulty adapts as you go: correct answers lead to harder questions, missed ones to easier questions. Your result is calculated only from your answers. This short test is a learning check, not a hiring assessment.</p>
      <div className="pf-actions"><button type="submit" className="button button-primary">Take the Free Skill Test<ArrowRight size={16} aria-hidden="true"/></button></div>
    </form>
  </div>;
}

function QuestionStep({ view, onAnswered, onQuit }: { view: AttemptView; onAnswered: (view: AttemptView) => Promise<void>; onQuit: () => void }) {
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const key = useRef(newKey());
  const question = view.question!;
  useEffect(() => { setSelected(''); key.current = newKey(); heading.current?.focus({ preventScroll: false }); }, [question.id]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected || busy) return;
    setBusy(true); setError('');
    try { await onAnswered(await assessmentApi.answer(view.attemptId, selected, key.current)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Your answer could not be saved.'); }
    finally { setBusy(false); }
  }
  const progress = Math.round((view.index / view.total) * 100);
  return <div className="pf-test">
    <div className="pf-test-head">
      <div className="pf-spread"><span className="pf-small pf-muted">Question {view.index + 1} of {view.total}</span><button type="button" className="text-link" onClick={onQuit}><X size={15} aria-hidden="true"/>Leave test</button></div>
      <div className="pf-progress" role="progressbar" aria-label="Test progress" aria-valuemin={0} aria-valuemax={view.total} aria-valuenow={view.index}><span style={{ width: `${progress}%` }}/></div>
    </div>
    <form className="pf-card pf-question" onSubmit={submit}>
      <div className="pf-row"><span className="pf-chip">{skillInfo[question.skill].label}</span><span className="pf-chip pf-chip-muted">{difficultyLabel[question.difficulty]}</span></div>
      <h2 ref={heading} tabIndex={-1} id="question-prompt">{question.prompt}</h2>
      {question.code?.fixture && <details className="pf-small"><summary className="text-link">Show the tables this query uses</summary><CodeBlock language="sql" source={sqlFixtures[question.code.fixture]} label="Table definitions"/></details>}
      {question.code && <CodeBlock language={question.code.language} source={question.code.source}/>}
      <fieldset className="pf-choices" aria-labelledby="question-prompt">
        <legend className="sr-only">Choose one answer</legend>
        {question.options.map(option => <label key={option.id} className={`pf-choice ${question.codeOptions ? 'pf-choice-code' : ''}`}>
          <input type="radio" name={`answer-${question.id}`} value={option.id} checked={selected === option.id} onChange={() => setSelected(option.id)}/>
          <div><strong style={{ whiteSpace: 'pre-wrap' }}>{option.text}</strong></div>
        </label>)}
      </fieldset>
      {error && <p className="pf-error" role="alert">{error}</p>}
      <div className="pf-actions"><button type="submit" className="button button-primary" disabled={!selected || busy} aria-disabled={!selected || busy}>{view.index + 1 === view.total ? 'Finish and see results' : 'Submit answer'}<ArrowRight size={16} aria-hidden="true"/></button>{!selected && <span className="pf-small pf-muted">Choose an answer to continue.</span>}</div>
    </form>
  </div>;
}

function Results({ result, onRestart }: { result: AssessmentResult; onRestart: () => void }) {
  const cta = useExperiment('results-cta-2026-10');
  return <div className="pf-stack" style={{ gap: 24 }}>
    <div className="pf-grid pf-grid-2">
      <div className="pf-card pf-card-dark pf-stack">
        <h1 id="results-title" tabIndex={-1} className="display-title" style={{ color: '#fff', fontSize: 'clamp(2rem, 4.4vw, 3rem)' }}>Your results</h1>
        <div className="pf-result-score"><strong>{result.total.correct}/{result.total.asked}</strong><span>correct · {result.total.percent}% of available points</span></div>
        <p><span className="pf-chip pf-chip-strong">{bandLabel[result.band]}</span> The test settled at <strong style={{ color: '#fff' }}>{difficultyLabel[result.settledAt]}</strong> questions.</p>
        <p>{result.summary}</p>
        <p className="pf-small">Harder questions are worth more points (1, 2 or 3). Nothing is curved, adjusted or compared with other people. A short online test can't measure job readiness; treat this as a snapshot of these ten answers.</p>
      </div>
      <div className="pf-card">
        <h2>Skill by skill</h2>
        <div style={{ marginTop: 10 }}>{result.skills.map(item => <div key={item.skill} className="pf-skill-row">
          <div className="pf-spread"><strong>{skillInfo[item.skill].label}</strong><span>{item.correct}/{item.asked} correct · {levelLabel[item.level]}</span></div>
          <Meter value={item.percent} label={`${skillInfo[item.skill].label} points earned`} tone={item.level === 'developing' ? 'muted' : item.level === 'insufficient' ? 'soft' : 'accent'}/>
        </div>)}</div>
      </div>
    </div>
    <div className="pf-grid pf-grid-2">
      <div className="pf-card"><h2>Strengths</h2>{result.strengths.length ? <div className="pf-tags" role="list" aria-label="Strengths">{result.strengths.map(skill => <span role="listitem" key={skill}>{skillInfo[skill].label}</span>)}</div> : <p>No skill reached a solid level in this attempt. That is useful to know: the review below shows exactly where to start.</p>}</div>
      <div className="pf-card"><h2>Areas to improve</h2>{result.gaps.length ? <div className="pf-tags" role="list" aria-label="Areas to improve">{result.gaps.map(skill => <span role="listitem" key={skill}>{skillInfo[skill].label}</span>)}</div> : <p>No skill scored below 50% in this attempt. Try the advanced level or a coding challenge to stretch further.</p>}</div>
    </div>
    {result.recommendations.length > 0 && <div className="pf-card pf-stack">
      <h2>Recommended next steps</h2>
      <p>These programme modules teach the topics behind the questions you missed.</p>
      <div className="pf-grid pf-grid-2">{result.recommendations.map(item => <Link key={item.programmeId} to={item.slug} className="pf-challenge-card" onClick={() => track('course_viewed', { programme: item.programmeId, from: 'results' })}>
        <span className="pf-chip">{item.skills.map(skill => skillInfo[skill].short).join(' · ')}</span>
        <h3>{item.programmeName}</h3>
        {item.modules.length > 0 && <p>Modules: {item.modules.join(', ')}</p>}
        <p className="pf-small pf-muted">{item.reasons.slice(0, 2).join('; ')}</p>
      </Link>)}</div>
    </div>}
    <div className="pf-prompt">
      <div><strong>Turn this into a plan</strong><p>Pick a target role and get an ordered roadmap built from these results.</p></div>
      <div className="pf-actions"><Link to="/roadmap" className="button button-primary">{cta.label}<ArrowRight size={16} aria-hidden="true"/></Link><Link to="/coding-arena" className="button button-secondary"><Code2 size={16} aria-hidden="true"/>Try a coding challenge</Link></div>
    </div>
    <section className="pf-review" aria-labelledby="review-title">
      <h2 id="review-title" style={{ fontSize: '1.5rem', marginBottom: 12 }}>Review every answer</h2>
      {result.review.map((item, index) => {
        const text = (id: string) => item.question.options.find(option => option.id === id)?.text ?? '';
        return <details key={item.question.id} open={!item.correct && index < 2}>
          <summary><span className={`pf-mark ${item.correct ? 'pf-mark-ok' : 'pf-mark-miss'}`} aria-label={item.correct ? 'Correct' : 'Incorrect'}>{item.correct ? '✓' : '✕'}</span><span>{index + 1}. {item.question.prompt}</span></summary>
          <div className="pf-review-body">
            {item.question.code && <CodeBlock language={item.question.code.language} source={item.question.code.source}/>}
            <div className="pf-answer"><span className="pf-answer-label">Your answer</span><code>{text(item.selected)}</code></div>
            {!item.correct && <div className="pf-answer"><span className="pf-answer-label">Correct answer</span><code>{text(item.question.answer)}</code></div>}
            <p>{item.question.explanation}</p>
            <p className="pf-small pf-muted">Learning objective: {item.question.objective} · Module: {item.question.module.module} · Question {item.question.id} v{item.question.version}</p>
          </div>
        </details>;
      })}
    </section>
    <div className="pf-actions no-print"><button type="button" className="button button-secondary" onClick={onRestart}><RotateCcw size={16} aria-hidden="true"/>Take another test</button><button type="button" className="button button-secondary" onClick={() => window.print()}><Printer size={16} aria-hidden="true"/>Print or save as PDF</button></div>
  </div>;
}
