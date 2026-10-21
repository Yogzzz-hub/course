import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, ClipboardCheck, Download, FlaskConical, Gauge, GitBranch, LineChart, ListChecks, ScrollText, Users } from 'lucide-react';
import { z } from 'zod';
import { eventsSnapshot, serverEventsSnapshot, subscribeEvents } from '../analytics/events';
import { challengeQuality, experimentReport, funnel, marketing, overview, rate, skillIntelligence } from '../analytics/metrics';
import { experiments } from '../analytics/experiments';
import { safeStorage } from '../analytics/consent';
import { BANK_VERSION, type Question } from '../assessment/questionBank';
import { questionSchema, validateBank } from '../assessment/schema';
import { difficultyLabel, skillInfo, skills } from '../assessment/skills';
import { challengeById } from '../arena/challenges';
import { can, roleLabels, roles, type Action, type Role } from '../admin-console/permissions';
import { discardDrafts, readConsoleAudit, readDrafts, retire, saveNewVersion, workingBank } from '../admin-console/questionStore';
import { BarList, EmptyState, Notice, Stat, ToolHero } from '../components/platform/ui';

type SectionId = 'overview' | 'funnel' | 'skills' | 'leads' | 'quality' | 'questions' | 'marketing' | 'experiments' | 'audit';
const sections: { id: SectionId; label: string; icon: typeof Gauge; needs: Action }[] = [
  { id: 'overview', label: 'Executive overview', icon: Gauge, needs: 'overview.view' },
  { id: 'funnel', label: 'Conversion funnel', icon: LineChart, needs: 'funnel.view' },
  { id: 'skills', label: 'Skill intelligence', icon: BarChart3, needs: 'skills.view' },
  { id: 'leads', label: 'Lead management', icon: Users, needs: 'leads.view' },
  { id: 'quality', label: 'Assessment quality', icon: ClipboardCheck, needs: 'quality.view' },
  { id: 'questions', label: 'Question bank', icon: ListChecks, needs: 'questions.view' },
  { id: 'marketing', label: 'Marketing analytics', icon: GitBranch, needs: 'marketing.view' },
  { id: 'experiments', label: 'Experiments', icon: FlaskConical, needs: 'experiments.view' },
  { id: 'audit', label: 'Audit log', icon: ScrollText, needs: 'audit.view' },
];

const sessionSchema = z.object({ userId: z.string(), role: z.enum(roles) });
type Session = { mode: 'server'; userId: string; role: Role } | { mode: 'demo'; userId: string; role: Role } | { mode: 'denied'; message: string };
const ROLE_KEY = 'aintrix-admin-role';

/** With a console API configured, the server decides who you are and what you may see. Otherwise: labelled demo mode. */
async function loadSession(): Promise<Session> {
  const base = import.meta.env.VITE_CONSOLE_API_URL;
  if (base) {
    const response = await fetch(`${base.replace(/\/$/, '')}/console/session`, { credentials: 'include' });
    if (response.status === 401 || response.status === 403) return { mode: 'denied', message: 'Sign in with an authorised staff account to use the console.' };
    if (!response.ok) return { mode: 'denied', message: 'The console service is unavailable.' };
    const parsed = sessionSchema.parse(await response.json());
    return { mode: 'server', ...parsed };
  }
  let role: Role = 'owner';
  try { const saved = safeStorage()?.getItem(ROLE_KEY); if (saved && (roles as readonly string[]).includes(saved)) role = saved as Role; } catch { /* default */ }
  return { mode: 'demo', userId: 'demo-staff', role };
}

function toCsv(rows: (string | number | null)[][]) {
  return rows.map(row => row.map(cell => { const text = cell === null ? '' : String(cell); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }).join(',')).join('\n');
}
function download(name: string, rows: (string | number | null)[][]) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminConsole() {
  const [session, setSession] = useState<Session | null>(null);
  const [active, setActive] = useState<SectionId>('overview');
  const events = useSyncExternalStore(subscribeEvents, eventsSnapshot, serverEventsSnapshot);
  useEffect(() => { loadSession().then(setSession).catch(() => setSession({ mode: 'denied', message: 'The console service is unavailable.' })); }, []);
  if (!session) return <ToolHero title="Growth & assessment console" description="Checking your access…"/>;
  if (session.mode === 'denied') return <><ToolHero title="Growth & assessment console" description={session.message}/><section className="container pf-section"><Link to="/auth/admin/sign-in" className="button button-primary">Sign in</Link></section></>;
  const allowed = sections.filter(section => can(session.role, section.needs));
  const current = allowed.find(section => section.id === active) ?? allowed[0];
  const actor = { id: session.userId, role: session.role };
  return <>
    <ToolHero title="Growth & assessment console" description="Conversion, assessment quality and content management for the academy team. Every figure is a count of recorded events; nothing is estimated or invented, and empty sections stay empty."/>
    <section className="container pf-section pf-stack" style={{ gap: 18 }}>
      {session.mode === 'demo' && <Notice tone="warning" title="Demo mode — not a protected area">No console service is connected, so this page shows analytics recorded in <strong>this browser only</strong> (with analytics consent) and lets you pick a role to preview what each role can see. Real access control needs the academy's sign-in service and the same permission checks on the server (<code className="pf-mono">src/admin-console/permissions.ts</code>).
        <div className="pf-field" style={{ maxWidth: 280, marginTop: 10 }}><label htmlFor="console-role">Preview as role</label><select id="console-role" value={session.role} onChange={event => { const role = event.target.value as Role; try { safeStorage()?.setItem(ROLE_KEY, role); } catch { /* ignore */ } setSession({ ...session, role }); }}>{roles.map(role => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></div>
      </Notice>}
      <div className="pf-console">
        <nav className="pf-console-nav" aria-label="Console sections">{sections.map(section => {
          const permitted = can(session.role, section.needs);
          return <button key={section.id} type="button" disabled={!permitted} aria-current={current?.id === section.id} onClick={() => setActive(section.id)} title={permitted ? undefined : `${roleLabels[session.role]} cannot view this section`}><section.icon size={16} aria-hidden="true"/>{section.label}</button>;
        })}</nav>
        <div className="pf-stack" style={{ gap: 16, minWidth: 0 }}>
          {!current ? <EmptyState title="No sections for this role">Ask an owner to change your role.</EmptyState> : <>
            <h2 className="display-title" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}>{current.label}</h2>
            {events.length === 0 && ['overview', 'funnel', 'skills', 'marketing', 'experiments', 'quality'].includes(current.id) && <Notice>No consented events have been recorded in this browser yet. Allow analytics in <Link to="/privacy-choices" className="text-link">Privacy choices</Link> and use the site to see real figures here.</Notice>}
            {current.id === 'overview' && <Overview events={events}/>}
            {current.id === 'funnel' && <Funnel events={events}/>}
            {current.id === 'skills' && <Skills events={events}/>}
            {current.id === 'leads' && <Leads events={events} canExport={can(session.role, 'leads.export')}/>}
            {current.id === 'quality' && <Quality events={events}/>}
            {current.id === 'questions' && <QuestionBank canEdit={can(session.role, 'questions.edit')} actor={actor}/>}
            {current.id === 'marketing' && <Marketing events={events}/>}
            {current.id === 'experiments' && <Experiments events={events}/>}
            {current.id === 'audit' && <AuditLog/>}
          </>}
        </div>
      </div>
    </section>
  </>;
}

type Events = ReturnType<typeof eventsSnapshot>;
const pct = (value: number | null) => value === null ? '—' : `${value}%`;

function Overview({ events }: { events: Events }) {
  const stats = overview(events);
  return <>
    <div className="pf-grid pf-grid-4">
      <Stat label="Unique visitors" value={stats.visitors}/>
      <Stat label="Assessment starts" value={stats.assessmentStarts}/>
      <Stat label="Assessment completions" value={stats.assessmentCompletions} note={`Completion rate ${pct(stats.completionRate)}`}/>
      <Stat label="Course page views" value={stats.courseViews}/>
      <Stat label="Roadmaps viewed" value={stats.roadmapViews}/>
      <Stat label="Package comparisons" value={stats.packageComparisons}/>
      <Stat label="Counselling requests" value={stats.counsellingRequests}/>
      <Stat label="Enrollment starts" value={stats.enrollmentStarts}/>
    </div>
    <div className="pf-grid pf-grid-2">
      <EmptyState title="Verified paid enrollments: no data">Paid enrollments and revenue are counted only from server-confirmed payment records. The payment service is not connected, so these stay empty rather than estimated.</EmptyState>
      <EmptyState title="Qualified leads: no data">Lead qualification lives in the Admin Panel's lead pipeline, which needs the admin API. <Link to="/admin-panel" className="text-link">Open the Admin Panel</Link></EmptyState>
    </div>
  </>;
}

function Funnel({ events }: { events: Events }) {
  const stages = funnel(events);
  return <div className="pf-card pf-stack">
    <div className="pf-spread"><p className="pf-small pf-muted">A visitor counts at a stage only after reaching every earlier stage.</p><button type="button" className="button button-secondary" onClick={() => download('funnel.csv', [['Stage', 'Visitors', 'From previous %'], ...stages.map(stage => [stage.label, stage.count, stage.fromPrevious])])}><Download size={16} aria-hidden="true"/>Export CSV</button></div>
    <BarList empty="No visits recorded yet." rows={stages.map(stage => ({ label: stage.label, value: stage.count, note: stage.id === 'payment_confirmed' ? 'server only' : stage.fromPrevious === null ? '' : `${stage.fromPrevious}% of previous` }))}/>
  </div>;
}

function Skills({ events }: { events: Events }) {
  const intel = skillIntelligence(events);
  const quality = challengeQuality(events);
  return <>
    <div className="pf-card pf-stack">
      <div className="pf-spread"><h3>Most commonly developing skills</h3><button type="button" className="button button-secondary" onClick={() => download('skills.csv', [['Skill', 'Attempts', 'Average %', 'Developing'], ...intel.map(item => [item.label, item.attempts, item.averagePercent, item.developing])])}><Download size={16} aria-hidden="true"/>Export CSV</button></div>
      <BarList empty="No completed assessments yet." rows={intel.map(item => ({ label: item.label, value: item.developing, note: item.attempts ? `of ${item.attempts}, avg ${item.averagePercent}%` : 'no data' }))}/>
    </div>
    <div className="pf-card pf-stack">
      <h3>Challenge performance</h3>
      {quality.length === 0 ? <EmptyState title="No challenge activity yet">Starts, submissions and understanding checks appear here.</EmptyState> : <div className="pf-table-wrap"><table className="pf-table"><thead><tr><th scope="col">Challenge</th><th scope="col">Level</th><th scope="col" className="num">Starts</th><th scope="col" className="num">Submissions</th><th scope="col" className="num">Fully passed</th><th scope="col" className="num">Understanding</th></tr></thead><tbody>{quality.map(row => { const challenge = challengeById(row.challenge); return <tr key={row.challenge}><th scope="row">{challenge?.title ?? row.challenge}</th><td>{challenge ? difficultyLabel[challenge.difficulty] : '—'}</td><td className="num">{row.starts}</td><td className="num">{row.submissions}</td><td className="num">{pct(rate(row.passed, row.submissions))}</td><td className="num">{row.checkTotal ? `${row.checkCorrect}/${row.checkTotal}` : '—'}</td></tr>; })}</tbody></table></div>}
    </div>
  </>;
}

function Leads({ events, canExport }: { events: Events; canExport: boolean }) {
  const requests = events.filter(event => event.name === 'counselling_requested');
  const byProgramme = Object.entries(requests.reduce<Record<string, number>>((acc, event) => { const key = String(event.props.programme ?? 'Not specified'); acc[key] = (acc[key] ?? 0) + 1; return acc; }, {}));
  return <>
    <Notice title="Contact details are not stored here">Consented leads (name, email, preferred contact, counsellor, follow-ups and outcome) are managed in the Admin Panel's lead pipeline through the admin API. This console only sees anonymous counts.</Notice>
    <div className="pf-card pf-stack">
      <div className="pf-spread"><h3>Counselling requests by programme interest</h3>{canExport && <button type="button" className="button button-secondary" onClick={() => download('counselling-requests.csv', [['Programme', 'Requests'], ...byProgramme])}><Download size={16} aria-hidden="true"/>Export CSV</button>}</div>
      <BarList empty="No counselling requests recorded in this browser." rows={byProgramme.map(([label, value]) => ({ label, value }))}/>
    </div>
    <Link to="/admin-panel" className="button button-primary" style={{ justifySelf: 'start' }}>Open the lead pipeline</Link>
  </>;
}

function Quality({ events }: { events: Events }) {
  const quality = challengeQuality(events);
  const issues = validateBank(workingBank());
  const judgeErrors = quality.reduce((sum, row) => sum + row.judgeErrors, 0);
  return <>
    <div className="pf-grid pf-grid-3">
      <Stat label="Question bank" value={BANK_VERSION} note={issues.length ? `${issues.length} validation issue(s)` : 'Structure valid; answer keys verified in CI'}/>
      <Stat label="Judging errors" value={judgeErrors} note="Never counted as candidate failures"/>
      <Stat label="Submissions recorded" value={quality.reduce((sum, row) => sum + row.submissions, 0)}/>
    </div>
    {issues.length > 0 && <Notice tone="warning" title="Validation issues in drafts">{issues.map(issue => `${issue.id}: ${issue.path} — ${issue.message}`).join('; ')}</Notice>}
    <EmptyState title="Grading review and corrections need the judging service">Rejudging, false-negative reports and score corrections are handled by the grading service, which records each change in its audit log and enforces the grades.correct and grades.rejudge permissions. It is not connected, so there are no submissions to review.</EmptyState>
  </>;
}

const blankQuestion = (): Question => ({ id: '', version: 1, status: 'draft', skill: 'python', difficulty: 1, kind: 'mcq', prompt: '', options: [{ id: 'a', text: '' }, { id: 'b', text: '' }, { id: 'c', text: '' }, { id: 'd', text: '' }], answer: 'a', explanation: '', objective: '', module: { programmeId: 'programming-python-foundation', module: 'Core Data Structures' }, check: { kind: 'review', reviewed: new Date().toISOString().slice(0, 10) } });

function QuestionBank({ canEdit, actor }: { canEdit: boolean; actor: { id: string; role: string } }) {
  const [revision, setRevision] = useState(0);
  const bank = useMemo(() => { void revision; return workingBank(); }, [revision]);
  const drafts = useMemo(() => { void revision; return readDrafts(); }, [revision]);
  const [filter, setFilter] = useState<{ skill: string; status: string; query: string }>({ skill: '', status: 'active', query: '' });
  const [editing, setEditing] = useState<Question | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const shown = bank.filter(item => (!filter.skill || item.skill === filter.skill) && (!filter.status || item.status === filter.status) && (!filter.query || `${item.id} ${item.prompt}`.toLowerCase().includes(filter.query.toLowerCase())));
  function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const parsed = questionSchema.safeParse(editing);
    if (!parsed.success) { setErrors(parsed.error.issues.map(issue => `${issue.path.join('.') || 'question'}: ${issue.message}`)); return; }
    const outcome = saveNewVersion(editing, actor);
    if (!outcome.ok) { setErrors(outcome.issues.map(issue => `${issue.path}: ${issue.message}`)); return; }
    setErrors([]); setEditing(null); setRevision(value => value + 1);
  }
  const field = (key: keyof Question, value: unknown) => setEditing(current => current ? { ...current, [key]: value } as Question : current);
  return <>
    <Notice title="Drafts stay on this device">Edits create a new version and retire the old one, but without a content API they are local drafts and the live test keeps using the shipped bank. To publish, add the version to <code className="pf-mono">src/assessment/questionBank.ts</code>: <code className="pf-mono">npm test</code> then executes every answer key before release.</Notice>
    <div className="pf-row">
      <div className="pf-field"><label htmlFor="qb-search">Search</label><input id="qb-search" value={filter.query} onChange={event => setFilter({ ...filter, query: event.target.value })}/></div>
      <div className="pf-field"><label htmlFor="qb-skill">Skill</label><select id="qb-skill" value={filter.skill} onChange={event => setFilter({ ...filter, skill: event.target.value })}><option value="">All</option>{skills.map(skill => <option key={skill} value={skill}>{skillInfo[skill].label}</option>)}</select></div>
      <div className="pf-field"><label htmlFor="qb-status">Status</label><select id="qb-status" value={filter.status} onChange={event => setFilter({ ...filter, status: event.target.value })}><option value="">All</option><option value="active">Active</option><option value="draft">Draft</option><option value="retired">Retired</option></select></div>
      {canEdit && <button type="button" className="button button-primary" onClick={() => setEditing(blankQuestion())}>New question</button>}
      {canEdit && drafts.length > 0 && <button type="button" className="button button-secondary" onClick={() => { discardDrafts(actor); setRevision(value => value + 1); }}>Discard {drafts.length} local draft{drafts.length === 1 ? '' : 's'}</button>}
    </div>
    {editing && <form className="pf-card pf-stack" onSubmit={save} aria-label="Edit question">
      <h3>{editing.id ? `New version of ${editing.id}` : 'New question'}</h3>
      {errors.length > 0 && <Notice tone="warning" title="Fix these before saving"><ul style={{ margin: 0, paddingLeft: 18 }}>{errors.map(error => <li key={error}>{error}</li>)}</ul></Notice>}
      <div className="pf-grid pf-grid-3">
        <div className="pf-field"><label htmlFor="q-id">ID</label><input id="q-id" value={editing.id} onChange={event => field('id', event.target.value)}/></div>
        <div className="pf-field"><label htmlFor="q-skill">Skill</label><select id="q-skill" value={editing.skill} onChange={event => field('skill', event.target.value)}>{skills.map(skill => <option key={skill} value={skill}>{skillInfo[skill].label}</option>)}</select></div>
        <div className="pf-field"><label htmlFor="q-difficulty">Difficulty</label><select id="q-difficulty" value={editing.difficulty} onChange={event => field('difficulty', Number(event.target.value))}>{([1, 2, 3] as const).map(level => <option key={level} value={level}>{difficultyLabel[level]}</option>)}</select></div>
      </div>
      <div className="pf-field"><label htmlFor="q-prompt">Prompt</label><textarea id="q-prompt" value={editing.prompt} onChange={event => field('prompt', event.target.value)}/></div>
      <fieldset className="pf-choices"><legend>Options (select the correct one)</legend>{editing.options.map((option, index) => <div key={option.id} className="pf-row"><input type="radio" name="q-answer" aria-label={`Option ${option.id} is correct`} checked={editing.answer === option.id} onChange={() => field('answer', option.id)}/><div className="pf-field" style={{ flex: 1 }}><label htmlFor={`q-opt-${option.id}`}>Option {option.id.toUpperCase()}</label><input id={`q-opt-${option.id}`} value={option.text} onChange={event => field('options', editing.options.map((item, i) => i === index ? { ...item, text: event.target.value } : item))}/></div></div>)}</fieldset>
      <div className="pf-field"><label htmlFor="q-explanation">Explanation</label><textarea id="q-explanation" value={editing.explanation} onChange={event => field('explanation', event.target.value)}/></div>
      <div className="pf-grid pf-grid-2">
        <div className="pf-field"><label htmlFor="q-objective">Learning objective</label><input id="q-objective" value={editing.objective} onChange={event => field('objective', event.target.value)}/></div>
        <div className="pf-field"><label htmlFor="q-status">Status</label><select id="q-status" value={editing.status} onChange={event => field('status', event.target.value)}><option value="draft">Draft</option><option value="active">Active</option></select></div>
      </div>
      <div className="pf-actions"><button type="submit" className="button button-primary">Validate and save version</button><button type="button" className="button button-secondary" onClick={() => { setEditing(null); setErrors([]); }}>Cancel</button></div>
    </form>}
    <div className="pf-table-wrap"><table className="pf-table"><caption className="sr-only">Questions</caption><thead><tr><th scope="col">ID</th><th scope="col" className="num">Ver.</th><th scope="col">Skill</th><th scope="col">Level</th><th scope="col">Check</th><th scope="col">Status</th>{canEdit && <th scope="col"><span className="sr-only">Actions</span></th>}</tr></thead><tbody>{shown.map(item => <tr key={`${item.id}@${item.version}`}><th scope="row"><span className="pf-mono">{item.id}</span><br/><span className="pf-small pf-muted">{item.prompt.slice(0, 70)}{item.prompt.length > 70 ? '…' : ''}</span></th><td className="num">{item.version}</td><td>{skillInfo[item.skill].short}</td><td>{difficultyLabel[item.difficulty]}</td><td>{item.check.kind === 'review' ? `Reviewed ${item.check.reviewed}` : `Executed (${item.check.kind})`}</td><td>{item.status}{drafts.some(draft => draft.id === item.id && draft.version === item.version) ? ' (local)' : ''}</td>{canEdit && <td><div className="pf-row"><button type="button" className="text-link" onClick={() => setEditing({ ...item, status: 'active' })}>New version</button>{item.status === 'active' && <button type="button" className="text-link" onClick={() => { retire(item, actor); setRevision(value => value + 1); }}>Retire</button>}</div></td>}</tr>)}</tbody></table></div>
  </>;
}

function Marketing({ events }: { events: Events }) {
  const report = marketing(events);
  const table = (title: string, rows: ReturnType<typeof marketing>['channels'], empty: string) => <div className="pf-card pf-stack"><h3>{title}</h3>{rows.length === 0 ? <EmptyState title="No data yet">{empty}</EmptyState> : <div className="pf-table-wrap"><table className="pf-table"><thead><tr><th scope="col">{title.split(' ')[0]}</th><th scope="col" className="num">Sessions</th><th scope="col" className="num">Started a test</th><th scope="col" className="num">Requested counselling</th></tr></thead><tbody>{rows.map(row => <tr key={row.key}><th scope="row">{row.key}</th><td className="num">{row.sessions}</td><td className="num">{row.assessments} ({pct(rate(row.assessments, row.sessions))})</td><td className="num">{row.counselling}</td></tr>)}</tbody></table></div>}</div>;
  return <>
    {table('Channel (organic, direct, referral, campaign)', report.channels, 'Sessions are classified from the referrer and UTM tags.')}
    {table('Landing pages', report.landings, 'The first page of each session appears here.')}
    {table('Campaigns', report.campaigns, 'Add utm_campaign to campaign links to attribute sessions.')}
    <p className="pf-small pf-muted">Enrollment attribution needs server-confirmed payments joined to sessions, which this browser cannot see.</p>
  </>;
}

function Experiments({ events }: { events: Events }) {
  return <>{experiments.map(experiment => {
    const rows = experimentReport(events, experiment.id, experiment.goal);
    return <div key={experiment.id} className="pf-card pf-stack">
      <h3>{experiment.label}</h3>
      <p className="pf-small pf-muted">{experiment.surface} · goal: {experiment.goal.replace(/_/g, ' ')} · assignment is stable per consented visitor; others always see the control.</p>
      <div className="pf-table-wrap"><table className="pf-table"><thead><tr><th scope="col">Variant</th><th scope="col">Text</th><th scope="col" className="num">Visitors</th><th scope="col" className="num">Converted</th><th scope="col" className="num">Rate</th></tr></thead><tbody>{experiment.variants.map(variant => { const row = rows.find(item => item.variant === variant.id); return <tr key={variant.id}><th scope="row">{variant.id}</th><td>{variant.label}</td><td className="num">{row?.visitors ?? 0}</td><td className="num">{row?.conversions ?? 0}</td><td className="num">{pct(row?.rate ?? null)}</td></tr>; })}</tbody></table></div>
      <p className="pf-small pf-muted">Counts only. With small numbers, differences between variants are not meaningful; no significance is claimed.</p>
    </div>;
  })}</>;
}

function AuditLog() {
  const entries = readConsoleAudit();
  return entries.length === 0 ? <EmptyState title="No console actions yet">Question edits, retirements and other content changes are recorded here with who made them and when.</EmptyState>
    : <div className="pf-table-wrap"><table className="pf-table"><thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">Action</th><th scope="col">Target</th><th scope="col">Detail</th></tr></thead><tbody>{[...entries].reverse().map(entry => <tr key={`${entry.at}-${entry.target}`}><td>{new Date(entry.at).toLocaleString()}</td><td>{entry.actor} ({entry.role})</td><td>{entry.action}</td><td className="pf-mono">{entry.target}</td><td>{entry.detail ?? ''}</td></tr>)}</tbody></table></div>;
}

