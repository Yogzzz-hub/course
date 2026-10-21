import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Award, Code2 } from 'lucide-react';
import { readPractice, type PracticeEntry } from '../arena/api';
import { challengeById } from '../arena/challenges';
import { difficultyLabel, skillInfo, skills, type Difficulty, type Skill } from '../assessment/skills';
import { notifyStorageChange, safeStorage } from '../analytics/consent';
import { badgeRules, basePoints, pseudonymFor, SCORING_VERSION, UNDERSTANDING_BONUS, type Period, type Standing } from '../leaderboard/scoring';
import { EmptyState, Notice, ToolHero } from '../components/platform/ui';

const standingSchema = z.object({ position: z.number(), userId: z.string(), pseudonym: z.string(), points: z.number(), challenges: z.number(), reachedAt: z.string(), badges: z.array(z.string()) });
const PROFILE_KEY = 'aintrix-leaderboard-profile';

/** Rankings come only from the academy's server, computed from judged submissions. */
async function fetchStandings(params: { period: Period; difficulty?: Difficulty; skill?: Skill }): Promise<{ connected: boolean; standings: Standing[] }> {
  const base = import.meta.env.VITE_LEADERBOARD_API_URL;
  if (!base) return { connected: false, standings: [] };
  const query = new URLSearchParams({ period: params.period, ...(params.difficulty ? { difficulty: String(params.difficulty) } : {}), ...(params.skill ? { skill: params.skill } : {}) });
  const response = await fetch(`${base.replace(/\/$/, '')}/leaderboard?${query}`, { credentials: 'include' });
  if (!response.ok) throw new Error('The leaderboard could not be loaded.');
  return { connected: true, standings: z.array(standingSchema).parse(await response.json()) };
}

export default function Leaderboard() {
  const [period, setPeriod] = useState<Period>('week');
  const [difficulty, setDifficulty] = useState<Difficulty | 0>(0);
  const [skill, setSkill] = useState<Skill | ''>('');
  const [data, setData] = useState<{ connected: boolean; standings: Standing[] } | null>(null);
  const [error, setError] = useState('');
  const [practice, setPractice] = useState<PracticeEntry[]>([]);
  const [profile, setProfile] = useState<{ pseudonym: string; optedIn: boolean } | null>(null);
  useEffect(() => {
    setPractice(readPractice());
    try { setProfile(JSON.parse(safeStorage()?.getItem(PROFILE_KEY) || 'null')); } catch { setProfile(null); }
  }, []);
  useEffect(() => {
    let live = true;
    setError('');
    fetchStandings({ period, difficulty: difficulty || undefined, skill: skill || undefined }).then(value => { if (live) setData(value); }).catch(cause => { if (live) { setError(cause instanceof Error ? cause.message : 'The leaderboard could not be loaded.'); setData({ connected: true, standings: [] }); } });
    return () => { live = false; };
  }, [period, difficulty, skill]);
  function updateProfile(optedIn: boolean) {
    const next = { pseudonym: profile?.pseudonym ?? pseudonymFor(globalThis.crypto?.randomUUID?.() ?? String(Math.random())), optedIn };
    setProfile(next);
    try { safeStorage()?.setItem(PROFILE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    notifyStorageChange();
  }

  return <>
    <ToolHero title={<>Leaderboard.<br/><span className="text-gradient">Verified points only.</span></>} description="Rankings count only challenges graded by the academy's sandboxed judging service. Each challenge counts once per period, at your best attempt. Taking part is optional and public names are pseudonyms."/>
    <section className="container pf-section pf-stack" style={{ gap: 20 }}>
      <div className="pf-spread">
        <div className="pf-tabs" role="tablist" aria-label="Period">{(['week', 'month', 'all'] as const).map(item => <button key={item} type="button" role="tab" aria-selected={period === item} onClick={() => setPeriod(item)}>{item === 'week' ? 'Weekly' : item === 'month' ? 'Monthly' : 'All time'}</button>)}</div>
        <div className="pf-row">
          <div className="pf-field" style={{ minWidth: 170 }}><label htmlFor="lb-level">Level</label><select id="lb-level" value={difficulty} onChange={event => setDifficulty(Number(event.target.value) as Difficulty | 0)}><option value={0}>All levels</option>{([1, 2, 3] as const).map(level => <option key={level} value={level}>{difficultyLabel[level]}</option>)}</select></div>
          <div className="pf-field" style={{ minWidth: 190 }}><label htmlFor="lb-skill">Skill</label><select id="lb-skill" value={skill} onChange={event => setSkill(event.target.value as Skill | '')}><option value="">All skills</option>{skills.map(item => <option key={item} value={item}>{skillInfo[item].label}</option>)}</select></div>
        </div>
      </div>
      {error && <Notice tone="warning">{error}</Notice>}
      {!data ? <p role="status" className="pf-muted">Loading rankings…</p>
        : !data.connected ? <EmptyState title="No verified results yet" action={<Link to="/coding-arena" className="button button-secondary"><Code2 size={16} aria-hidden="true"/>Practise in the arena</Link>}>Rankings appear once the academy's judging service is connected and learners opt in. No sample or placeholder entries are shown.</EmptyState>
        : data.standings.length === 0 ? <EmptyState title="Nobody has verified points for this view yet">Try another period, level or skill.</EmptyState>
        : <div className="pf-table-wrap"><table className="pf-table"><caption className="sr-only">Leaderboard</caption><thead><tr><th scope="col">#</th><th scope="col">Learner</th><th scope="col" className="num">Points</th><th scope="col" className="num">Challenges</th><th scope="col">Badges</th></tr></thead><tbody>{data.standings.map(row => <tr key={row.userId}><td>{row.position}</td><th scope="row">{row.pseudonym}</th><td className="num">{row.points}</td><td className="num">{row.challenges}</td><td>{row.badges.join(', ') || '—'}</td></tr>)}</tbody></table></div>}

      <div className="pf-grid pf-grid-2">
        <div className="pf-card pf-stack">
          <h2>How points work</h2>
          <ul className="pf-small pf-stack" style={{ margin: 0, paddingLeft: 18 }}>
            <li>Each challenge is worth {basePoints[1]}, {basePoints[2]} or {basePoints[3]} points for beginner, intermediate or advanced.</li>
            <li>You earn that base multiplied by the share of tests your solution passed.</li>
            <li>The understanding check adds up to {UNDERSTANDING_BONUS * 100}% of the base.</li>
            <li>Only your best judged attempt on each challenge counts in a period, so resubmitting cannot inflate points.</li>
            <li>Ties go to more distinct challenges, then to whoever reached the total first.</li>
            <li>Score corrections are made only by authorised staff and recorded in an audit log.</li>
          </ul>
          <p className="pf-small pf-muted">Rules version {SCORING_VERSION}. Weekly periods start on Monday and monthly periods on the 1st (UTC).</p>
        </div>
        <div className="pf-card pf-stack">
          <h2>Badges</h2>
          <ul className="pf-stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>{badgeRules.map(rule => <li key={rule.id} className="pf-row pf-small"><Award size={16} aria-hidden="true" style={{ color: 'var(--accent)' }}/><span><strong>{rule.label}</strong>: {rule.description}</span></li>)}</ul>
        </div>
      </div>

      <div className="pf-card pf-stack">
        <h2>Taking part</h2>
        <p>Public participation is optional. If you join, only a random pseudonym, your points, challenge count and badges are shown — never your name, email or results breakdown.</p>
        <label className="pf-check"><input type="checkbox" checked={!!profile?.optedIn} onChange={event => updateProfile(event.target.checked)}/><span>Show me on the leaderboard as <strong>{profile?.pseudonym ?? 'a random pseudonym'}</strong> once verified judging is available.</span></label>
      </div>

      <div className="pf-card pf-stack">
        <h2>Your practice on this device</h2>
        <p className="pf-small pf-muted">Private and unverified: these attempts were not judged by the sandbox, so they never count towards rankings.</p>
        {practice.length === 0 ? <EmptyState title="No saved practice yet">Tick "Save this attempt" after an understanding check in the coding arena to keep a history here.</EmptyState>
          : <div className="pf-table-wrap"><table className="pf-table"><caption className="sr-only">Practice history</caption><thead><tr><th scope="col">Date</th><th scope="col">Challenge</th><th scope="col">Mode</th><th scope="col" className="num">Understanding</th><th scope="col">Judged</th></tr></thead><tbody>{[...practice].reverse().map(entry => <tr key={entry.at}><td>{new Date(entry.at).toLocaleDateString()}</td><th scope="row">{challengeById(entry.challengeId)?.title ?? entry.challengeId}</th><td>{entry.mode === 'assisted' ? 'AI-assisted' : 'Independent'}{entry.declaredAiUse ? ' (AI used)' : ''}</td><td className="num">{entry.understanding.correct}/{entry.understanding.total}</td><td>{entry.judged ? `${entry.total ?? '—'}%` : 'No'}</td></tr>)}</tbody></table></div>}
      </div>
    </section>
  </>;
}
