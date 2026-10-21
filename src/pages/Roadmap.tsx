import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, Copy, Printer } from 'lucide-react';
import { latestAttempt, readHistory } from '../assessment/store';
import { scoreAttempt } from '../assessment/results';
import type { SkillLevel, SkillResult } from '../assessment/results';
import type { Skill } from '../assessment/skills';
import { notifyStorageChange, safeStorage } from '../analytics/consent';
import { track } from '../analytics/events';
import { buildRoadmap, educationLevels, experienceLevels, interestAreas, type Roadmap as RoadmapResult, type RoadmapInput } from '../roadmap/engine';
import { FRAMEWORK_VERSION, nodes, roleById, roles, type RoleId } from '../roadmap/frameworks';
import { Notice, ToolHero } from '../components/platform/ui';

const SAVED_KEY = 'aintrix-roadmap';
const statusLabel = { demonstrated: 'Demonstrated', claimed: 'Self-reported', 'needs-practice': 'Needs practice', 'not-assessed': 'To learn' } as const;

/** The most recent skill test on this device: the finished attempt in this tab, else saved history. */
function latestAssessment(): { completedAt: string; skills: SkillResult[] } | null {
  const attempt = latestAttempt();
  if (attempt) { const result = scoreAttempt(attempt); return { completedAt: result.completedAt, skills: result.skills }; }
  const last = readHistory().at(-1);
  if (!last) return null;
  return { completedAt: last.completedAt, skills: Object.entries(last.skills).map(([skill, value]) => ({ skill: skill as Skill, asked: 0, correct: 0, earned: 0, possible: 0, percent: value!.percent, level: value!.level as SkillLevel })) };
}

export default function Roadmap() {
  const [search] = useSearchParams();
  const [assessment, setAssessment] = useState<ReturnType<typeof latestAssessment>>(null);
  const [useAssessment, setUseAssessment] = useState(true);
  const [input, setInput] = useState<Omit<RoadmapInput, 'assessment'>>({ role: roleById(search.get('role'))?.id ?? 'backend', education: 'graduate', experience: 'learning', claimed: [], interests: [], jobDescription: '' });
  const [save, setSave] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapResult | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setAssessment(latestAssessment());
    try {
      const saved = JSON.parse(safeStorage()?.getItem(SAVED_KEY) || 'null') as Omit<RoadmapInput, 'assessment'> | null;
      if (saved && roleById(saved.role)) { setInput(saved); setSave(true); }
    } catch { /* start fresh */ }
  }, []);
  const toggle = (key: 'claimed' | 'interests', id: string) => setInput(current => ({ ...current, [key]: current[key].includes(id) ? current[key].filter(item => item !== id) : [...current[key], id] }));
  function submit(event: FormEvent) {
    event.preventDefault();
    const result = buildRoadmap({ ...input, assessment: useAssessment ? assessment : null });
    setRoadmap(result);
    try { if (save) safeStorage()?.setItem(SAVED_KEY, JSON.stringify(input)); else safeStorage()?.removeItem(SAVED_KEY); } catch { /* storage unavailable */ }
    notifyStorageChange();
    track('roadmap_viewed', { role: input.role, withTest: !!(useAssessment && assessment), jd: !!input.jobDescription });
    requestAnimationFrame(() => document.getElementById('roadmap-title')?.focus());
  }
  const summary = useMemo(() => roadmap ? [`${roadmap.role.label} roadmap (framework ${roadmap.frameworkVersion})`, ...roadmap.steps.map((step, index) => `${index + 1}. ${step.node.label} — ${statusLabel[step.status]} — ${step.node.module.module} (${step.programmeName})`)].join('\n') : '', [roadmap]);

  return <>
    <ToolHero title={<>Your personalised<br/><span className="text-gradient">learning roadmap.</span></>} description="Choose the role you are aiming for and tell us where you are. The roadmap orders what to learn next, using only your skill test results and what you tell it. No salary figures, no placement promises."/>
    <section className="container pf-section pf-stack" style={{ gap: 22 }}>
      <form className="pf-card pf-stack" style={{ gap: 24 }} onSubmit={submit} aria-labelledby="roadmap-form-title">
        <h2 id="roadmap-form-title">About you</h2>
        <fieldset className="pf-choices" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <legend>Target role</legend>
          {roles.map(role => <label key={role.id} className="pf-choice"><input type="radio" name="role" checked={input.role === role.id} onChange={() => setInput(current => ({ ...current, role: role.id as RoleId }))}/><div><strong>{role.label}</strong><span>{role.summary}</span></div></label>)}
        </fieldset>
        <div className="pf-grid pf-grid-2">
          <div className="pf-field"><label htmlFor="roadmap-experience">Experience</label><select id="roadmap-experience" value={input.experience} onChange={event => setInput(current => ({ ...current, experience: event.target.value as RoadmapInput['experience'] }))}>{experienceLevels.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
          <div className="pf-field"><label htmlFor="roadmap-education">Education</label><select id="roadmap-education" value={input.education} onChange={event => setInput(current => ({ ...current, education: event.target.value as RoadmapInput['education'] }))}>{educationLevels.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
        </div>
        <fieldset className="pf-choices" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <legend>Skills you already have <span className="pf-small pf-muted">(self-reported, shown as unverified)</span></legend>
          {nodes.map(node => <label key={node.id} className="pf-check"><input type="checkbox" checked={input.claimed.includes(node.id)} onChange={() => toggle('claimed', node.id)}/><span>{node.label}</span></label>)}
        </fieldset>
        <fieldset className="pf-choices" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <legend>What interests you?</legend>
          {interestAreas.map(area => <label key={area.id} className="pf-check"><input type="checkbox" checked={input.interests.includes(area.id)} onChange={() => toggle('interests', area.id)}/><span>{area.label}</span></label>)}
        </fieldset>
        <div className="pf-field">
          <label htmlFor="roadmap-jd">Paste a job description (optional)</label>
          <textarea id="roadmap-jd" maxLength={8000} value={input.jobDescription} onChange={event => setInput(current => ({ ...current, jobDescription: event.target.value }))} aria-describedby="roadmap-jd-help"/>
          <span id="roadmap-jd-help" className="pf-small pf-muted">Only scanned in your browser for skill keywords such as "SQL" or "Docker". Instructions inside it are ignored and it is not sent anywhere.</span>
        </div>
        {assessment ? <label className="pf-check"><input type="checkbox" checked={useAssessment} onChange={event => setUseAssessment(event.target.checked)}/><span>Use my skill test result from {new Date(assessment.completedAt).toLocaleDateString()} to mark demonstrated skills.</span></label>
          : <Notice title="No skill test result on this device">Without one, nothing can be marked as demonstrated. <Link to="/skill-test" className="text-link">Take the free skill test</Link></Notice>}
        <label className="pf-check"><input type="checkbox" checked={save} onChange={event => setSave(event.target.checked)}/><span>Save these answers on this device so I can come back to my roadmap.</span></label>
        <div className="pf-actions"><button type="submit" className="button button-primary">Build my roadmap<ArrowRight size={16} aria-hidden="true"/></button></div>
      </form>

      {roadmap && <section className="pf-stack" style={{ gap: 18 }} aria-labelledby="roadmap-title">
        <div className="pf-card pf-card-dark pf-stack">
          <h2 id="roadmap-title" tabIndex={-1} className="display-title" style={{ color: '#fff', fontSize: 'clamp(1.9rem, 4vw, 2.8rem)' }}>Your Personalized Learning Roadmap</h2>
          <p>{roadmap.role.label}: {roadmap.role.summary}</p>
          {roadmap.notes.map(note => <p key={note} className="pf-small">{note}</p>)}
          <div className="pf-grid pf-grid-3">
            <div><span className="pf-small">Demonstrated in the skill test</span><p style={{ color: '#fff' }}>{roadmap.demonstrated.map(node => node.label).join(', ') || 'None yet'}</p></div>
            <div><span className="pf-small">Priority learning areas</span><p style={{ color: '#fff' }}>{roadmap.priorities.map(node => node.label).join(', ') || 'None'}</p></div>
            <div><span className="pf-small">Skills to build</span><p style={{ color: '#fff' }}>{roadmap.missing.length}</p></div>
          </div>
          {roadmap.jobDescriptionMatches.length > 0 && <p className="pf-small">From the job description: {roadmap.jobDescriptionMatches.join(', ')}</p>}
        </div>
        <ol className="pf-steps" aria-label="Suggested study sequence">{roadmap.steps.map(step => <li key={step.node.id}><div>
          <div className="pf-spread"><h3>{step.node.label}</h3><span className={`pf-chip ${step.status === 'demonstrated' ? 'pf-chip-strong' : step.status === 'needs-practice' ? '' : 'pf-chip-muted'}`}>{statusLabel[step.status]}</span></div>
          <p>{step.node.description}</p>
          <div className="pf-tags">{step.reasons.map(reason => <span key={reason}>{reason}</span>)}<span>{step.importance === 'core' ? 'Core for this role' : step.importance === 'supporting' ? 'Supporting skill' : 'From the job description'}</span></div>
          {step.status !== 'demonstrated' && <p className="pf-small" style={{ marginTop: 10 }}>Project: {step.node.project}<br/>Module: <Link to={step.programmeSlug} className="text-link" onClick={() => track('course_viewed', { programme: step.node.module.programmeId, from: 'roadmap' })}>{step.node.module.module} · {step.programmeName}</Link></p>}
        </div></li>)}</ol>
        {roadmap.modules.length > 0 && <div className="pf-card pf-stack">
          <h2>Academy modules for this plan</h2>
          <div className="pf-grid pf-grid-2">{roadmap.modules.map(item => <Link key={item.programmeId} to={item.slug} className="pf-challenge-card" onClick={() => track('course_viewed', { programme: item.programmeId, from: 'roadmap' })}><h3>{item.programmeName}</h3><p>{item.modules.join(', ')}</p></Link>)}</div>
        </div>}
        <div className="pf-prompt">
          <div><strong>Talk it through with a counsellor</strong><p>Bring this roadmap to a free one-on-one conversation about your starting point and the right programme.</p></div>
          <Link to={`/book-session?programme=${encodeURIComponent(roadmap.modules[0]?.programmeId ?? 'python-full-stack')}`} className="button button-primary"><CalendarDays size={16} aria-hidden="true"/>Request counselling</Link>
        </div>
        <div className="pf-actions no-print">
          <button type="button" className="button button-secondary" onClick={() => window.print()}><Printer size={16} aria-hidden="true"/>Print or save as PDF</button>
          <button type="button" className="button button-secondary" onClick={() => { navigator.clipboard?.writeText(summary).then(() => setCopied(true)).catch(() => setCopied(false)); }}><Copy size={16} aria-hidden="true"/>{copied ? 'Copied' : 'Copy as text'}</button>
          <span className="pf-small pf-muted" role="status">{copied ? 'Roadmap copied to your clipboard.' : 'Share links will be available once the academy\'s server can make them revocable.'}</span>
        </div>
        <p className="pf-small pf-muted">Framework version {FRAMEWORK_VERSION}. Curated by the academy from its curriculum; it describes what to learn, not hiring outcomes.</p>
      </section>}
    </section>
  </>;
}
