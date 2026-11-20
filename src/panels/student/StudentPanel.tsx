import { useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks';
import { Card, Empty, ErrorNotice, Loading, PageHead, StatusChip, fmtDate, fmtInr } from '../ui';
import { PanelShell, useMe, type Me } from '../PanelShell';

export interface SessionItem { id: string; type: string; startsAt: string; mode: string; status: string; rescheduleCount: number }
export interface PlanItem { id: string; counsellor: string; summary: string; validUntil: string; offers: { id: string; packageName: string; finalPrice: number; inclusions: string[]; paymentPlans: string[] }[] }
export interface ScheduleItem { id: string; title: string; startsAt: string; kind: string }
export interface PaymentItem { id: string; label: string; amount: number; status: string; dueDate: string | null }

const prospectNav = [
  { to: '/app', label: 'Home' },
  { to: '/app/sessions', label: 'My sessions' },
  { to: '/app/book', label: 'Book a session' },
  { to: '/app/plan', label: 'My learning plan' },
  { to: '/app/profile', label: 'Profile & settings' },
];
const enrolledNav = [
  { to: '/app', label: 'Dashboard' },
  { to: '/app/schedule', label: 'Schedule' },
  { to: '/app/assignments', label: 'Assignments' },
  { to: '/app/payments', label: 'Payments & invoices' },
  { to: '/app/profile', label: 'Profile & settings' },
];

/** One panel, two modes (spec §17): Prospect before purchase, Enrolled after. */
export default function StudentPanel() {
  const { data: me, error, unauthorised, loading } = useMe();
  if (unauthorised) return <Navigate to="/login?next=/app" replace />;
  const enrolled = me?.mode === 'enrolled' || me?.mode === 'alumni';
  return (
    <PanelShell brand="My Academy" items={enrolled ? enrolledNav : prospectNav} me={me}>
      {loading && <Loading />}
      {error && !unauthorised && <ErrorNotice error={error} />}
      <Routes>
        <Route index element={<Home me={me ?? null} />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="book" element={<BookSession />} />
        <Route path="plan" element={<LearningPlan />} />
        <Route path="checkout/:offerId" element={<Checkout />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="assignments" element={<Assignments />} />
        <Route path="payments" element={<Payments />} />
        <Route path="profile" element={<Profile me={me ?? null} />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </PanelShell>
  );
}

const steps = ['Register', 'Session', 'Learning plan', 'Enrol'];

function stepStates(status?: string): ('done' | 'current' | 'todo')[] {
  const position: Record<string, number> = { REGISTERED: 0, SESSION_BOOKED: 1, PENDING_APPROVAL: 1, NO_SHOW: 1, SESSION_COMPLETED: 2, OFFER_SENT: 2, PAYMENT_PENDING: 3, WON: 4 };
  const current = status ? position[status] ?? 0 : 0;
  return steps.map((_, index) => (index < current ? 'done' : index === current ? 'current' : 'todo'));
}

function Home({ me }: { me: Me | null }) {
  const states = stepStates(me?.status);
  const enrolled = me?.mode === 'enrolled';
  return (
    <>
      <PageHead title={me ? `Hello, ${me.name.split(' ')[0]}` : 'Your home'} description={enrolled ? 'Your classes, assignments and payments in one place.' : 'Here is your next step. There is no obligation to enrol.'} />
      <div className="p-grid">
        <Card className="p-next" title={enrolled ? 'Next class' : 'Your next step'}>
          {me?.status === 'SESSION_BOOKED' || me?.status === 'REGISTERED' || !me?.status ? (
            <>
              <p>{me?.status === 'SESSION_BOOKED' ? 'Your one-on-one session is booked. The join button opens 10 minutes before the start.' : 'Book a 20-minute one-on-one call. We will talk about your goals and the options that fit.'}</p>
              <a className="p-btn" href="/app/book">{me?.status === 'SESSION_BOOKED' ? 'View my session' : 'Book my session'}</a>
            </>
          ) : (
            <p>Your counsellor is preparing your learning plan. It usually arrives within 24 hours of your session.</p>
          )}
        </Card>
        <Card title="What happens next">
          <ol className="p-steps" aria-label="Your progress">
            {steps.map((label, index) => <li key={label} data-state={states[index]}>{label}</li>)}
          </ol>
        </Card>
        <Card title="Before your call">
          <ul className="p-muted" style={{ paddingLeft: 18, lineHeight: 1.7, margin: 0 }}>
            <li>Do I need prior programming experience?</li>
            <li>How are classes delivered?</li>
            <li>Can I pay in instalments?</li>
          </ul>
        </Card>
      </div>
    </>
  );
}

function Sessions() {
  const { data, error, loading, reload } = useApi<SessionItem[]>('/me/sessions');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function cancel(id: string) {
    setBusy(id);
    setNotice(null);
    try {
      await api(`/sessions/${id}`, { method: 'PATCH', body: { action: 'cancel' } });
      setNotice('Your session has been cancelled. You can book a new time whenever you like.');
      reload();
    } catch (caught) {
      setNotice((caught as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHead title="My sessions" description="Upcoming and past one-on-one calls. You can reschedule up to two times, until two hours before the start." actions={<a className="p-btn" href="/app/book">Book a session</a>} />
      {notice && <p className="p-alert p-alert-info" role="status">{notice}</p>}
      {loading && <Loading />}
      {error && <ErrorNotice error={error} onRetry={reload} />}
      {data && data.length === 0 && <Empty title="No sessions yet">Book a one-on-one call to talk through your options.</Empty>}
      {data && data.length > 0 && (
        <ul className="p-list">
          {data.map(item => (
            <li key={item.id}>
              <div>
                <strong>{item.type}</strong>
                <small>{fmtDate(item.startsAt)} · {item.mode}</small>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusChip status={item.status} />
                {(item.status === 'BOOKED' || item.status === 'PENDING_APPROVAL') && (
                  <button type="button" className="p-btn p-btn-ghost" disabled={busy === item.id} onClick={() => cancel(item.id)}>Cancel</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const levels = ['Beginner', 'Some coding', 'Working developer', 'Not sure'];
const goals = ['Change careers into tech', 'Upskill in my current role', 'Build projects for my portfolio', 'Prepare for interviews'];
const starts = ['As soon as possible', 'Next month', 'In 2–3 months', 'Just exploring'];

/** Booking in four short steps (spec §13.6). Times are shown in the learner's zone, with IST alongside. */
function BookSession() {
  const [step, setStep] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [answers, setAnswers] = useState({ level: '', goal: '', hours: '', start: '', question: '' });
  const [holdId, setHoldId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<SessionItem | null>(null);
  const slots = useApi<{ starts: string[] }>('/public/availability?type=counselling&days=14');
  const navigate = useNavigate();

  async function hold(startsAt: string) {
    setSlot(startsAt);
    setError(null);
    try {
      const result = await api<{ holdId: string }>('/sessions/hold', { body: { type: 'counselling', startsAt } });
      setHoldId(result.holdId);
      setStep(1);
    } catch (caught) {
      setError((caught as Error).message);
      slots.reload();
    }
  }

  async function confirm() {
    if (!holdId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api<SessionItem>('/sessions', { body: { holdId, answers }, idempotencyKey: holdId });
      setDone(result);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <>
        <PageHead title="Your session is booked" />
        <Card>
          <p>{fmtDate(done.startsAt)} · 20-minute video call. We'll send a calendar invite and reminders 24 hours and 1 hour before.</p>
          <p className="p-muted">There is no obligation to enrol.</p>
          <button className="p-btn" onClick={() => navigate('/app/sessions')}>See my sessions</button>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHead title="Let's find the right learning path for you" description="Tell us a little about your goals and book a one-on-one conversation with our team. We'll help you understand programme options, learning expectations, fees and available support." />
      <ol className="p-steps" aria-label="Booking steps" style={{ marginBottom: 22 }}>
        {['Pick a time', 'Four questions and confirm'].map((label, index) => <li key={label} data-state={index === step ? 'current' : index < step ? 'done' : 'todo'}>{label}</li>)}
      </ol>
      {error && <p className="p-alert p-alert-danger" role="alert">{error}</p>}

      {step === 0 && (
        <Card title="Pick a time">
          {slots.loading && <Loading label="Finding free times…" />}
          {slots.error && <ErrorNotice error={slots.error} onRetry={slots.reload} />}
          {slots.data && slots.data.starts.length === 0 && <Empty title="No free times in the next 14 days">Leave your preferred times and our team will reach out.</Empty>}
          {slots.data && slots.data.starts.length > 0 && (
            <div className="p-slots" role="group" aria-label="Available times">
              {slots.data.starts.map(startsAt => (
                <button key={startsAt} type="button" aria-pressed={slot === startsAt} onClick={() => hold(startsAt)}>{fmtDate(startsAt)}</button>
              ))}
            </div>
          )}
        </Card>
      )}

      {step === 1 && (
        <Card title="Four short questions">
          <div className="p-field"><label htmlFor="q-level">Your current level</label><select id="q-level" className="p-select" value={answers.level} onChange={e => setAnswers({ ...answers, level: e.target.value })}><option value="">Choose one</option>{levels.map(v => <option key={v}>{v}</option>)}</select></div>
          <div className="p-field"><label htmlFor="q-goal">Your main goal</label><select id="q-goal" className="p-select" value={answers.goal} onChange={e => setAnswers({ ...answers, goal: e.target.value })}><option value="">Choose one</option>{goals.map(v => <option key={v}>{v}</option>)}</select></div>
          <div className="p-field"><label htmlFor="q-hours">Hours per week you can give</label><input id="q-hours" className="p-input" inputMode="numeric" value={answers.hours} onChange={e => setAnswers({ ...answers, hours: e.target.value.replace(/\D/g, '').slice(0, 2) })} /></div>
          <div className="p-field"><label htmlFor="q-start">When would you like to start?</label><select id="q-start" className="p-select" value={answers.start} onChange={e => setAnswers({ ...answers, start: e.target.value })}><option value="">Choose one</option>{starts.map(v => <option key={v}>{v}</option>)}</select></div>
          <div className="p-field"><label htmlFor="q-question">Anything else you'd like us to know? (optional)</label><textarea id="q-question" className="p-textarea" maxLength={1000} value={answers.question} onChange={e => setAnswers({ ...answers, question: e.target.value })} /></div>
          <button className="p-btn" disabled={busy || !answers.level || !answers.goal || !answers.start} onClick={confirm}>{busy ? 'Confirming…' : 'Confirm my session'}</button>
        </Card>
      )}

    </>
  );
}

function LearningPlan() {
  const { data, error, loading, reload } = useApi<PlanItem>('/me/plan');
  return (
    <>
      <PageHead title="My learning plan" description="A written recommendation from your counsellor, with the packages, fee and the date the offer is valid until." />
      {loading && <Loading />}
      {error && <ErrorNotice error={error} onRetry={reload} />}
      {!loading && !error && !data && <Empty title="Your plan arrives after your session">Your counsellor publishes it within 24 hours of your call.</Empty>}
      {data && (
        <>
          <Card title="Summary"><p>{data.summary}</p><small className="p-muted">Prepared by {data.counsellor} · Valid until {fmtDate(data.validUntil)}</small></Card>
          <div className="p-grid" style={{ marginTop: 18 }}>
            {data.offers.map(offer => (
              <Card key={offer.id} title={offer.packageName}>
                <p><strong style={{ fontSize: 22 }}>{fmtInr(offer.finalPrice)}</strong> <span className="p-muted">incl. taxes as shown at checkout</span></p>
                <ul className="p-muted" style={{ paddingLeft: 18, lineHeight: 1.7 }}>{offer.inclusions.map(i => <li key={i}>{i}</li>)}</ul>
                <p className="p-hint">Payment plans: {offer.paymentPlans.join(' · ') || 'Full payment'}</p>
                <a className="p-btn" href={`/app/checkout/${offer.id}`}>Enrol now</a>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function Checkout() {
  const { offerId } = useParams();
  const { data, error, loading, reload } = useApi<PlanItem['offers'][number]>(offerId ? `/offers/${offerId}` : null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [agree, setAgree] = useState(false);

  async function pay() {
    if (!offerId) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await api<{ checkoutUrl?: string }>('/checkout', { body: { offerId, paymentPlan: 'full', termsAccepted: agree }, idempotencyKey: `checkout-${offerId}` });
      if (result.checkoutUrl) window.location.assign(result.checkoutUrl);
      else setNotice('Your payment window is not available right now. Please try again shortly.');
    } catch (caught) {
      setNotice((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead title="Checkout" description="Review your plan, agree to the terms and pay through our secure gateway. We never see your card details." />
      {loading && <Loading />}
      {error && <ErrorNotice error={error} onRetry={reload} />}
      {notice && <p className="p-alert p-alert-danger" role="alert">{notice}</p>}
      {data && (
        <Card title={data.packageName}>
          <p><strong style={{ fontSize: 22 }}>{fmtInr(data.finalPrice)}</strong></p>
          <label className="p-check"><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} /> I agree to the Terms & Conditions, Refund & Cancellation Policy and Internship & Placement Terms.</label>
          <button className="p-btn" disabled={!agree || busy} onClick={pay}>{busy ? 'Opening secure payment…' : 'Pay securely'}</button>
        </Card>
      )}
    </>
  );
}

function ListPage<T>({ title, description, path, render, empty }: { title: string; description: string; path: string; render: (items: T[]) => ReactNode; empty: string }) {
  const { data, error, loading, reload } = useApi<T[]>(path);
  return (
    <>
      <PageHead title={title} description={description} />
      {loading && <Loading />}
      {error && <ErrorNotice error={error} onRetry={reload} />}
      {data && data.length === 0 && <Empty title={empty} />}
      {data && data.length > 0 && render(data)}
    </>
  );
}

function Schedule() {
  return <ListPage<ScheduleItem> title="Schedule" description="Your classes, mentorship and deadlines in one calendar." path="/me/schedule" empty="Nothing scheduled yet" render={items => <ul className="p-list">{items.map(i => <li key={i.id}><div><strong>{i.title}</strong><small>{i.kind}</small></div><small>{fmtDate(i.startsAt)}</small></li>)}</ul>} />;
}

function Assignments() {
  return <ListPage<{ id: string; title: string; dueAt: string; status: string }> title="Assignments" description="To do, submitted and reviewed work for your batch." path="/me/assignments" empty="No assignments yet" render={items => <ul className="p-list">{items.map(i => <li key={i.id}><div><strong>{i.title}</strong><small>Due {fmtDate(i.dueAt)}</small></div><StatusChip status={i.status} /></li>)}</ul>} />;
}

function Payments() {
  return <ListPage<PaymentItem> title="Payments & invoices" description="Your plan, instalments and receipts." path="/me/payments" empty="No payments yet" render={items => <ul className="p-list">{items.map(i => <li key={i.id}><div><strong>{i.label}</strong><small>{i.dueDate ? `Due ${fmtDate(i.dueDate)}` : 'Paid on verification'}</small></div><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><strong>{fmtInr(i.amount)}</strong><StatusChip status={i.status} /></div></li>)}</ul>} />;
}

function Profile({ me }: { me: Me | null }) {
  return (
    <>
      <PageHead title="Profile & settings" description="Your details, sign-in methods and your data." />
      <div className="p-grid">
        <Card title="Your details">
          <p>{me?.name ?? '—'}</p>
          <p className="p-muted">{me?.email ?? '—'}</p>
        </Card>
        <Card title="Your data">
          <p>Download a copy of your data or ask us to delete your account. Invoices are kept for the period the law requires.</p>
          <button type="button" className="p-btn p-btn-ghost" onClick={() => api('/me/export', { method: 'POST' }).catch(() => undefined)}>Request my data</button>
        </Card>
      </div>
    </>
  );
}
