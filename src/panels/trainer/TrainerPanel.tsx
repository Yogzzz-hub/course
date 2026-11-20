import { useState, type FormEvent, type ReactNode } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useApi } from '../hooks';
import { Card, Empty, ErrorNotice, Loading, PageHead, StatusChip, fmtDate } from '../ui';
import { PanelShell, useMe } from '../PanelShell';

export interface TodayItem { id: string; kind: 'session' | 'outcome' | 'review' | 'follow_up'; title: string; startsAt: string; href: string; status: string }
export interface QueueItem { id: string; learner: string; type: string; startsAt: string; status: string; outcomeDue: string | null }
export interface LeadRow { id: string; name: string; programme: string | null; status: string; nextFollowUpAt: string | null }
export interface SessionBrief {
  id: string; learner: string; currentStatus: string; timezone: string; programme: string | null; source: string | null;
  enquiryMessage: string | null; answers: { question: string; answer: string }[]; previousSessions: number;
}

const navItems = [
  { to: '/trainer', label: 'Today' },
  { to: '/trainer/counselling', label: 'Counselling queue' },
  { to: '/trainer/leads', label: 'My leads' },
];

export default function TrainerPanel() {
  const { data: me, error, unauthorised, loading } = useMe();
  if (unauthorised) return <Navigate to="/login?next=/trainer" replace />;
  return (
    <PanelShell brand="Trainer & Counsellor" items={navItems} me={me}>
      {loading && <Loading />}
      {error && !unauthorised && <ErrorNotice error={error} />}
      <Routes>
        <Route index element={<Today />} />
        <Route path="counselling" element={<Queue />} />
        <Route path="counselling/:sessionId" element={<SessionOutcome />} />
        <Route path="leads" element={<MyLeads />} />
        <Route path="*" element={<Navigate to="/trainer" replace />} />
      </Routes>
    </PanelShell>
  );
}

function Today() {
  const { data, error, loading, reload } = useApi<TodayItem[]>('/staff/me/today');
  return (
    <>
      <PageHead title="Today" description="Today's sessions, outcomes waiting to be recorded, and leads due for follow-up." />
      {loading && <Loading />}
      {error && <ErrorNotice error={error} onRetry={reload} />}
      {data && data.length === 0 && <Empty title="Nothing due today">Outcomes are due within 24 hours of each session.</Empty>}
      {data && data.length > 0 && (
        <ul className="p-list">
          {data.map(item => (
            <li key={item.id}>
              <div><strong>{item.title}</strong><small>{fmtDate(item.startsAt)}</small></div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusChip status={item.status} label={item.kind.replace('_', ' ')} />
                <a className="p-btn p-btn-secondary" href={item.href}>Open</a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Queue() {
  const { data, error, loading, reload } = useApi<QueueItem[]>('/staff/me/sessions?type=counselling');
  return (
    <>
      <PageHead title="Counselling queue" description="Upcoming sessions with their briefs. Overdue outcomes are highlighted." />
      {loading && <Loading />}
      {error && <ErrorNotice error={error} onRetry={reload} />}
      {data && data.length === 0 && <Empty title="No counselling sessions booked">New bookings appear here as soon as a learner picks a time.</Empty>}
      {data && data.length > 0 && (
        <div className="p-table-wrap">
          <table className="p-table">
            <caption className="p-hint" style={{ textAlign: 'left', padding: '0 0 10px' }}>Sessions in time order</caption>
            <thead><tr><th scope="col">Learner</th><th scope="col">When</th><th scope="col">Status</th><th scope="col">Outcome</th></tr></thead>
            <tbody>
              {data.map(item => {
                const overdue = !!item.outcomeDue && new Date(item.outcomeDue).getTime() < Date.now() && item.status !== 'COMPLETED';
                return (
                  <tr key={item.id} style={overdue ? { background: '#FBE7EA' } : undefined}>
                    <td><a href={`/trainer/counselling/${item.id}`}>{item.learner}</a></td>
                    <td>{fmtDate(item.startsAt)}</td>
                    <td><StatusChip status={item.status} /></td>
                    <td>{overdue ? <span className="p-chip p-chip-danger">Overdue</span> : item.outcomeDue ? `Due ${fmtDate(item.outcomeDue)}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const concernOptions = ['Fee', 'Time', 'Level', 'Other'];

/** The conversion screen (spec §18.2): read the brief, run the call, record the outcome within 24 hours. */
function SessionOutcome() {
  const { sessionId } = useParams();
  const brief = useApi<SessionBrief>(sessionId ? `/sessions/${sessionId}/brief` : null);
  const [form, setForm] = useState({ attendance: '', fit: '', programme: '', concerns: [] as string[], summary: '', privateNotes: '', nextStep: '', followUpAt: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(previous => ({ ...previous, [key]: value }));
  }

  function toggleConcern(value: string) {
    set('concerns', form.concerns.includes(value) ? form.concerns.filter(c => c !== value) : [...form.concerns, value]);
  }

  function validate(): Record<string, string> {
    const problems: Record<string, string> = {};
    if (!form.attendance) problems.attendance = 'Record whether the learner attended.';
    if (!form.fit) problems.fit = 'Choose how well this learner fits.';
    if (form.attendance === 'attended' && form.summary.trim().length < 20) problems.summary = 'Write at least 20 characters. The learner sees this summary on their plan.';
    return problems;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problems = validate();
    setFieldErrors(problems);
    if (Object.keys(problems).length) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/sessions/${sessionId}/outcome`, { method: 'PUT', body: form });
      setSaved(true);
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusy(false);
    }
  }

  if (saved) {
    return (
      <>
        <PageHead title="Outcome saved" />
        <p className="p-alert p-alert-success" role="status">Thanks. The learner will see your summary on their learning plan. Any discount you ask for goes to Admin for approval.</p>
        <a className="p-btn p-btn-ghost" href="/trainer/counselling">Back to the queue</a>
      </>
    );
  }

  return (
    <>
      <PageHead title="Session & outcome" description="Read the brief, run the call, then record what happened. The outcome is required within 24 hours." />
      {brief.loading && <Loading />}
      {brief.error && <ErrorNotice error={brief.error} onRetry={brief.reload} />}
      {brief.data && (
        <div className="p-grid" style={{ marginBottom: 18 }}>
          <Card title="Prospect brief">
            <dl style={{ margin: 0, display: 'grid', gap: 8, gridTemplateColumns: 'auto 1fr', fontSize: 14 }}>
              <dt className="p-muted">Name</dt><dd style={{ margin: 0 }}>{brief.data.learner}</dd>
              <dt className="p-muted">Status</dt><dd style={{ margin: 0 }}><StatusChip status={brief.data.currentStatus} /></dd>
              <dt className="p-muted">Time zone</dt><dd style={{ margin: 0 }}>{brief.data.timezone}</dd>
              <dt className="p-muted">Interested in</dt><dd style={{ margin: 0 }}>{brief.data.programme ?? '—'}</dd>
              <dt className="p-muted">Found us via</dt><dd style={{ margin: 0 }}>{brief.data.source ?? '—'}</dd>
              <dt className="p-muted">Previous sessions</dt><dd style={{ margin: 0 }}>{brief.data.previousSessions}</dd>
            </dl>
            {brief.data.enquiryMessage && <p style={{ marginTop: 12 }}><em>&ldquo;{brief.data.enquiryMessage}&rdquo;</em></p>}
          </Card>
          <Card title="Pre-session answers">
            {brief.data.answers.length === 0 ? <p className="p-muted">No answers recorded.</p> : (
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>{brief.data.answers.map(a => <li key={a.question}><strong>{a.question}</strong><br />{a.answer}</li>)}</ul>
            )}
          </Card>
        </div>
      )}

      <Card title="Outcome form">
        <form onSubmit={submit} noValidate>
          {error && <p className="p-alert p-alert-danger" role="alert">{error.code === 'NETWORK' ? 'The service is not connected yet, so this outcome was not saved.' : error.message}</p>}
          <div className="p-form-grid">
            <Field id="o-attendance" label="Attendance" error={fieldErrors.attendance}>
              <select id="o-attendance" className="p-select" value={form.attendance} onChange={e => set('attendance', e.target.value)}>
                <option value="">Choose one</option><option value="attended">Attended</option><option value="no_show">No-show</option><option value="staff_cancelled">Staff cancelled</option>
              </select>
            </Field>
            <Field id="o-fit" label="Fit" error={fieldErrors.fit}>
              <select id="o-fit" className="p-select" value={form.fit} onChange={e => set('fit', e.target.value)}>
                <option value="">Choose one</option><option value="strong">Strong</option><option value="possible">Possible</option><option value="not_fit_now">Not a fit now</option>
              </select>
            </Field>
            <Field id="o-programme" label="Recommended programme and package">
              <input id="o-programme" className="p-input" value={form.programme} onChange={e => set('programme', e.target.value)} />
            </Field>
            <Field id="o-followup" label="Follow-up date (optional)">
              <input id="o-followup" className="p-input" type="date" value={form.followUpAt} onChange={e => set('followUpAt', e.target.value)} />
            </Field>
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: '0 0 14px' }}>
            <legend className="p-label" style={{ marginBottom: 8 }}>Concerns raised</legend>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {concernOptions.map(option => (
                <label key={option} className="p-check" style={{ margin: 0 }}><input type="checkbox" checked={form.concerns.includes(option)} onChange={() => toggleConcern(option)} /> {option}</label>
              ))}
            </div>
          </fieldset>
          <Field id="o-summary" label="Summary for the learner (shown on their plan)" error={fieldErrors.summary}>
            <textarea id="o-summary" className="p-textarea" maxLength={1200} value={form.summary} onChange={e => set('summary', e.target.value)} />
          </Field>
          <Field id="o-next" label="Next step">
            <input id="o-next" className="p-input" value={form.nextStep} onChange={e => set('nextStep', e.target.value)} />
          </Field>
          <Field id="o-private" label="Private notes (staff only)">
            <textarea id="o-private" className="p-textarea" value={form.privateNotes} onChange={e => set('privateNotes', e.target.value)} />
          </Field>
          <button className="p-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save outcome'}</button>
        </form>
      </Card>
    </>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="p-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <p className="p-error" role="alert">{error}</p>}
    </div>
  );
}

function MyLeads() {
  const { data, error, loading, reload } = useApi<LeadRow[]>('/leads?owner=me');
  return (
    <>
      <PageHead title="My leads" description="Learners assigned to you, with their status and when to follow up." />
      {loading && <Loading />}
      {error && <ErrorNotice error={error} onRetry={reload} />}
      {data && data.length === 0 && <Empty title="No leads assigned">New enquiries are assigned automatically to counsellors with free time.</Empty>}
      {data && data.length > 0 && (
        <ul className="p-list">
          {data.map(lead => (
            <li key={lead.id}>
              <div><strong>{lead.name}</strong><small>{lead.programme ?? 'Programme not chosen yet'}</small></div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusChip status={lead.status} />
                <small>{lead.nextFollowUpAt ? `Follow up ${fmtDate(lead.nextFollowUpAt)}` : 'No follow-up set'}</small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

