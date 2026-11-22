import { useMemo, useState, type ReactNode } from 'react';
import { Award, BookOpen, CircleAlert, CreditCard, Download, GraduationCap, Layers, Search, Settings2, UserRound, Users, X } from 'lucide-react';
import { useApi } from './hooks';
import { useInfiniteList } from './useInfinite';
import { ErrorNotice, PageHead, Pager, CurvedSelect } from './ui';
import './audit-log.css';

interface Entry { at: string; actor: string; action: string; entity: string; entity_id: string }
type Tone = 'ok' | 'bad' | 'info' | 'neutral';
type Group = 'money' | 'people' | 'learning' | 'certificates' | 'settings';

const IST = 'Asia/Kolkata';

/** Plain-English wording for every action the server records. Unknown ones fall back to "<verb> <thing>". */
const WORDS: Record<string, { text: string; tone: Tone }> = {
  'assignment.create': { text: 'created assignment', tone: 'info' },
  'batch.create': { text: 'created batch', tone: 'info' },
  'batch.trainer_assign': { text: 'assigned a trainer to batch', tone: 'info' },
  'batch.trainer_remove': { text: 'removed a trainer from batch', tone: 'bad' },
  'certificate.issue': { text: 'issued certificate', tone: 'ok' },
  'certificate.revoke': { text: 'revoked certificate', tone: 'bad' },
  'class.start': { text: 'started class', tone: 'info' },
  'class.end': { text: 'ended class', tone: 'neutral' },
  'class.links': { text: 'updated links for class', tone: 'neutral' },
  'enrolment.status': { text: 'changed the status of enrolment', tone: 'neutral' },
  'expense.create': { text: 'recorded expense', tone: 'info' },
  'payment.verify': { text: 'verified payment', tone: 'ok' },
  'payment.reject': { text: 'rejected payment', tone: 'bad' },
  'programme.create': { text: 'created programme', tone: 'info' },
  'quiz.create': { text: 'created quiz', tone: 'info' },
  'settings.update': { text: 'updated the academy settings', tone: 'neutral' },
  'student.onboard': { text: 'onboarded a student on enrolment', tone: 'ok' },
  'submission.grade': { text: 'graded submission', tone: 'neutral' },
  'task.create': { text: 'created task', tone: 'info' },
  'user.create': { text: 'created user', tone: 'info' },
  'user.roles': { text: 'changed the roles of user', tone: 'neutral' },
  'user.status': { text: 'changed the status of user', tone: 'neutral' },
};

const GROUPS: { id: Group; label: string; icon: ReactNode }[] = [
  { id: 'money', label: 'Money', icon: <CreditCard size={15} /> },
  { id: 'people', label: 'People', icon: <Users size={15} /> },
  { id: 'learning', label: 'Learning', icon: <BookOpen size={15} /> },
  { id: 'certificates', label: 'Certificates', icon: <Award size={15} /> },
  { id: 'settings', label: 'Settings', icon: <Settings2 size={15} /> },
];

function groupOf(entity: string): Group {
  if (entity === 'payment' || entity === 'expense') return 'money';
  if (entity === 'user' || entity === 'enrolment') return 'people';
  if (entity === 'certificate') return 'certificates';
  if (entity === 'settings') return 'settings';
  return 'learning';
}

function iconFor(entity: string): ReactNode {
  switch (groupOf(entity)) {
    case 'money': return <CreditCard size={18} />;
    case 'people': return entity === 'enrolment' ? <GraduationCap size={18} /> : <UserRound size={18} />;
    case 'certificates': return <Award size={18} />;
    case 'settings': return <Settings2 size={18} />;
    default: return entity === 'batch' ? <Layers size={18} /> : <BookOpen size={18} />;
  }
}

function describe(entry: Entry) {
  const known = WORDS[entry.action];
  if (known) return known;
  const [thing = entry.entity, verb = 'changed'] = entry.action.split('.');
  return { text: `${verb.replace(/_/g, ' ')} ${thing}`, tone: 'neutral' as Tone };
}

const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: IST });
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: IST });
const fullDate = (iso: string) => `${new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: IST })} IST`;

function dayLabel(key: string): string {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: IST });
  const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString('en-CA', { timeZone: IST });
  if (key === today) return 'Today';
  if (key === yesterday) return 'Yesterday';
  return new Date(`${key}T12:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: IST });
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]!.toUpperCase()).join('') || '?';

interface Row { first: Entry; count: number; times: string[] }

/** Identical neighbouring entries (same person, action and record) are folded into one row with a count. */
function fold(entries: Entry[]): Row[] {
  const rows: Row[] = [];
  for (const entry of entries) {
    const last = rows[rows.length - 1];
    if (last && last.first.actor === entry.actor && last.first.action === entry.action && last.first.entity === entry.entity && last.first.entity_id === entry.entity_id && dayKey(last.first.at) === dayKey(entry.at)) {
      last.count += 1;
      last.times.push(entry.at);
    } else rows.push({ first: entry, count: 1, times: [entry.at] });
  }
  return rows;
}

function csvCell(value: string) { return `"${value.replace(/"/g, '""')}"`; }

function download(entries: Entry[]) {
  const lines = [['When (IST)', 'Who', 'Action', 'Record'].join(',')];
  for (const e of entries) lines.push([fullDate(e.at), e.actor, e.action, `${e.entity} #${e.entity_id}`].map(csvCell).join(','));
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-log-${new Date().toLocaleDateString('en-CA', { timeZone: IST })}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Shared audit log for the admin and super admin panels: search, filters, day-by-day timeline, CSV export. */
export function AuditLogView({
  endpoint = '/admin/audit-log?limit=300',
  text = 'Who changed what, and when. Nothing here can be edited.',
}: {
  endpoint?: string;
  text?: string;
}) {
  const list = useApi<{ items: Entry[] }>(endpoint);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<Group | 'all'>('all');
  const [actor, setActor] = useState('all');

  const items = useMemo(() => list.data?.items ?? [], [list.data]);
  const actors = useMemo(() => [...new Set(items.map(item => item.actor))].sort((a, b) => a.localeCompare(b)), [items]);
  const actorOptions = useMemo(() => [
    { value: 'all', label: 'Everyone', icon: Users },
    ...actors.map(name => ({ value: name, label: name, icon: UserRound })),
  ], [actors]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter(item => {
      if (group !== 'all' && groupOf(item.entity) !== group) return false;
      if (actor !== 'all' && item.actor !== actor) return false;
      if (!needle) return true;
      return `${item.actor} ${describe(item).text} ${item.action} ${item.entity} ${item.entity_id}`.toLowerCase().includes(needle);
    });
  }, [items, query, group, actor]);

  const rows = useMemo(() => fold(filtered), [filtered]);
  const { start, end, more, sentinel, loadMore, paged, page, pages, setPage } = useInfiniteList(rows.length, `${query}|${group}|${actor}`);
  const visible = rows.slice(start, end);
  const days = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of visible) {
      const key = dayKey(row.first.at);
      map.set(key, [...(map.get(key) ?? []), row]);
    }
    return [...map.entries()];
  }, [visible]);

  const filtering = query.trim() !== '' || group !== 'all' || actor !== 'all';
  const reset = () => { setQuery(''); setGroup('all'); setActor('all'); };

  return (
    <div className="al">
      <PageHead title="Audit log" text={text} />
      <ErrorNotice error={list.error} />

      <div className="al-tools">
        <label className="al-search">
          <Search size={17} aria-hidden="true" />
          <input type="search" value={query} placeholder="Search by person, action or record" aria-label="Search the audit log" onChange={event => setQuery(event.target.value)} />
        </label>
        <div className="al-select-wrap">
          <CurvedSelect
            value={actor}
            onChange={setActor}
            options={actorOptions}
            placeholder="Everyone"
          />
        </div>
        <button type="button" className="p-btn p-btn-ghost p-btn-small" onClick={() => download(filtered)} disabled={filtered.length === 0}>
          <Download size={14} aria-hidden="true" /> <span>Export CSV</span>
        </button>
      </div>

      <div className="al-chips" role="group" aria-label="Filter by area">
        <button type="button" className="al-chip" aria-pressed={group === 'all'} onClick={() => setGroup('all')}>All</button>
        {GROUPS.map(item => (
          <button key={item.id} type="button" className="al-chip" aria-pressed={group === item.id} onClick={() => setGroup(item.id)}>{item.icon}{item.label}</button>
        ))}
      </div>

      {list.data && (
        <p className="al-count" aria-live="polite">
          {filtered.length === 0 ? 'No matching activity' : `${filtered.length} ${filtered.length === 1 ? 'change' : 'changes'}${filtering ? ' match' : ''}`}
          {filtering && <button type="button" className="al-clear" onClick={reset}><X size={13} aria-hidden="true" /> Clear filters</button>}
        </p>
      )}

      {list.data && filtered.length === 0 && (
        <div className="al-empty">
          <CircleAlert size={26} aria-hidden="true" />
          <strong>{filtering ? 'Nothing matches those filters' : 'No activity yet'}</strong>
          <span>{filtering ? 'Try a different search, or clear the filters.' : 'Changes made by staff will appear here as they happen.'}</span>
        </div>
      )}

      {days.map(([key, dayRows]) => (
        <section className="al-day" key={key} aria-label={dayLabel(key)}>
          <h2 className="al-day-title">{dayLabel(key)}<span>{dayRows.reduce((sum, row) => sum + row.count, 0)}</span></h2>
          <ol className="al-list">
            {dayRows.map(row => {
              const entry = row.first;
              const what = describe(entry);
              return (
                <li className={`al-row tone-${what.tone}`} key={`${entry.at}-${entry.action}-${entry.entity_id}`}>
                  <span className="al-icon" aria-hidden="true">{iconFor(entry.entity)}</span>
                  <div className="al-main">
                    <p className="al-line">
                      <span className="al-avatar" aria-hidden="true">{initials(entry.actor)}</span>
                      <strong>{entry.actor}</strong> {what.text} <span className="al-record">#{entry.entity_id === 'global' ? 'all' : entry.entity_id}</span>
                      {row.count > 1 && <span className="al-times" title={row.times.map(fullDate).join('\n')}>×{row.count}</span>}
                    </p>
                    <p className="al-code"><code>{entry.action}</code></p>
                  </div>
                  <time className="al-time" dateTime={entry.at} title={fullDate(entry.at)}>{timeOf(entry.at)}</time>
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      {paged ? <Pager page={page} pages={pages} onChange={setPage} /> : more && (
        <div className="al-more" ref={sentinel}>
          <button type="button" className="p-btn p-btn-ghost p-btn-small" onClick={loadMore}>Loading more… ({rows.length - end} left)</button>
        </div>
      )}
    </div>
  );
}
