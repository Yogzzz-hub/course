import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Award, Building2, CalendarCheck, CreditCard, Minus, Plus, RotateCcw, Save, ShieldCheck, TriangleAlert } from 'lucide-react';
import { api, ApiError } from '../api';
import { useApi } from '../hooks';
import { ErrorNotice, PageHead, fieldErrors } from '../ui';
import './settings-page.css';

interface Settings {
  attendance_threshold_percent: number;
  require_fees_cleared: boolean;
  academy_name: string;
  payment_instructions: string;
}

const PRESETS = [50, 60, 75, 90];
const CLASS_MINUTES = 60;

/** The same limits the server enforces, so mistakes are caught before saving. */
function validate(values: Settings): Partial<Record<keyof Settings, string>> {
  const errors: Partial<Record<keyof Settings, string>> = {};
  const percent = values.attendance_threshold_percent;
  if (!Number.isInteger(percent) || percent < 1 || percent > 100) errors.attendance_threshold_percent = 'Enter a whole number from 1 to 100.';
  const name = values.academy_name.trim();
  if (name.length < 2) errors.academy_name = 'The academy name needs at least 2 characters.';
  else if (name.length > 120) errors.academy_name = 'Keep the academy name under 120 characters.';
  if (values.payment_instructions.length > 2000) errors.payment_instructions = 'Keep the payment instructions under 2,000 characters.';
  return errors;
}

function Section({ area, icon, title, text, children }: { area: string; icon: ReactNode; title: string; text: string; children: ReactNode }) {
  return (
    <section className={`st-card st-${area}`}>
      <header className="st-head">
        <span className="st-icon" aria-hidden="true">{icon}</span>
        <div>
          <h2>{title}</h2>
          <p>{text}</p>
        </div>
      </header>
      <div className="st-body">{children}</div>
    </section>
  );
}

/** A number you can type straight into, with − / + steps (5 at a time; Arrow keys step by 1). */
function PercentField({ value, invalid, onChange }: { value: number; invalid: boolean; onChange: (value: number) => void }) {
  const [text, setText] = useState(String(value));
  const lastValid = useRef(Number.isFinite(value) ? value : 60);
  useEffect(() => {
    if (Number.isFinite(value)) lastValid.current = value;
    if (Number.isFinite(value) && Number(text) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const clamp = (n: number) => Math.min(100, Math.max(1, n));
  const base = Number.isFinite(value) ? value : 0;
  const step = (amount: number) => { const next = clamp(base + amount); setText(String(next)); onChange(next); };

  return (
    <div className="st-stepper">
      <button type="button" className="st-step" aria-label="Decrease by 5" onClick={() => step(-5)} disabled={base <= 1}><Minus size={18} aria-hidden="true" /></button>
      <label className={`st-number${invalid ? ' is-invalid' : ''}`}>
        <input
          id="st-attendance"
          inputMode="numeric"
          autoComplete="off"
          maxLength={3}
          style={{ width: `${Math.max(text.length, 1)}ch` }}
          value={text}
          aria-label="Attendance needed to count a class, in percent"
          aria-invalid={invalid || undefined}
          onFocus={event => event.currentTarget.select()}
          onChange={event => {
            const digits = event.target.value.replace(/\D/g, '');
            setText(digits);
            onChange(digits === '' ? Number.NaN : Number(digits));
          }}
          onBlur={() => {
            if (text === '' || !Number.isFinite(value)) { setText(String(lastValid.current)); onChange(lastValid.current); return; }
            const next = clamp(value);
            setText(String(next));
            if (next !== value) onChange(next);
          }}
          onKeyDown={event => {
            if (event.key === 'ArrowUp') { event.preventDefault(); step(event.shiftKey ? 5 : 1); }
            if (event.key === 'ArrowDown') { event.preventDefault(); step(event.shiftKey ? -5 : -1); }
          }}
        />
        <span aria-hidden="true">%</span>
      </label>
      <button type="button" className="st-step" aria-label="Increase by 5" onClick={() => step(5)} disabled={base >= 100}><Plus size={18} aria-hidden="true" /></button>
    </div>
  );
}

/** Settings: rules that apply across the academy, grouped into cards, with a save bar that appears only when something changed. */
export function SettingsPage() {
  const current = useApi<Settings>('/superadmin/settings');
  const [draft, setDraft] = useState<Partial<Settings>>({});
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const values = useMemo(() => (current.data ? { ...current.data, ...draft } : null), [current.data, draft]);
  const changes = useMemo(() => {
    if (!current.data) return [];
    const original = current.data;
    const list: string[] = [];
    if (draft.attendance_threshold_percent !== undefined && draft.attendance_threshold_percent !== original.attendance_threshold_percent) list.push(`Attendance ${original.attendance_threshold_percent}% → ${draft.attendance_threshold_percent}%`);
    if (draft.require_fees_cleared !== undefined && draft.require_fees_cleared !== original.require_fees_cleared) list.push(draft.require_fees_cleared ? 'Certificates now need fees paid' : 'Certificates no longer need fees paid');
    if (draft.academy_name !== undefined && draft.academy_name !== original.academy_name) list.push('Academy name');
    if (draft.payment_instructions !== undefined && draft.payment_instructions !== original.payment_instructions) list.push('Payment instructions');
    return list;
  }, [current.data, draft]);
  const dirty = changes.length > 0;
  const problems = values ? validate(values) : {};
  const server = fieldErrors(error);

  // Leaving the page with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 6000);
    return () => window.clearTimeout(timer);
  }, [saved]);

  function change<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSaved(false);
    setDraft(old => {
      const next = { ...old, [key]: value };
      if (current.data && current.data[key] === value) delete next[key];
      return next;
    });
  }

  async function save() {
    if (!values || Object.keys(problems).length > 0) return;
    setError(null);
    setBusy(true);
    try {
      await api('/superadmin/settings', { method: 'PUT', body: { ...values, academy_name: values.academy_name.trim() } });
      setDraft({});
      setSaved(true);
      current.reload();
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusy(false);
    }
  }

  if (!values) return <ErrorNotice error={current.error} />;

  const minutes = Math.ceil((CLASS_MINUTES * (Number.isFinite(values.attendance_threshold_percent) ? values.attendance_threshold_percent : 0)) / 100);
  const instructions = values.payment_instructions.trim();

  const percentError = problems.attendance_threshold_percent ?? server.attendance_threshold_percent;
  const nameError = problems.academy_name ?? server.academy_name;
  const payError = problems.payment_instructions ?? server.payment_instructions;

  return (
    <div className="st">
      <div className="st-top">
        <PageHead title="Settings" text="Rules that apply across the academy." />
        {saved && !dirty && <p className="st-toast" role="status">Settings saved.</p>}
        {dirty && (
          <div className="st-bar" role="region" aria-label="Unsaved changes">
            <div className="st-bar-text">
              <strong>Unsaved changes</strong>
              <span title={changes.join(' · ')}>{changes.join(' · ')}</span>
            </div>
            <button type="button" className="p-btn p-btn-ghost p-btn-small" onClick={() => { setDraft({}); setError(null); }} disabled={busy}>
              <RotateCcw size={14} aria-hidden="true" /> Discard
            </button>
            <button type="button" className="p-btn p-btn-small" onClick={save} disabled={busy || Object.keys(problems).length > 0}>
              <Save size={14} aria-hidden="true" /> {busy ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        )}
      </div>
      <ErrorNotice error={error} />

      <div className="st-grid">
        <Section area="attendance" icon={<CalendarCheck size={20} />} title="Class attendance" text="When a student counts as having attended a class.">
          <div className="st-att">
            <div className="st-att-left">
              <PercentField value={values.attendance_threshold_percent} invalid={Boolean(percentError)} onChange={value => change('attendance_threshold_percent', value)} />
              <div className="st-presets" role="group" aria-label="Common values">
                {PRESETS.map(preset => (
                  <button key={preset} type="button" className="st-preset" aria-pressed={values.attendance_threshold_percent === preset} onClick={() => change('attendance_threshold_percent', preset)}>{preset}%</button>
                ))}
              </div>
            </div>
            <div className="st-att-right">
              <p className="st-example">
                In a {CLASS_MINUTES}-minute class, a student must stay connected for at least <strong>{minutes} minutes</strong>.
              </p>
              <div className="st-meter" aria-hidden="true">
                {Array.from({ length: 20 }, (_, index) => <i key={index} className={(index + 1) * 5 <= (Number.isFinite(values.attendance_threshold_percent) ? values.attendance_threshold_percent : 0) ? 'on' : ''} />)}
              </div>
              {percentError && <p className="st-error" role="alert">{percentError}</p>}
            </div>
          </div>
        </Section>

        <Section area="certificates" icon={<Award size={20} />} title="Certificates" text="What a student needs before a certificate can be issued.">
          <div className="st-switch-row">
            <button
              type="button"
              role="switch"
              aria-checked={values.require_fees_cleared}
              aria-labelledby="st-fees-label"
              className="st-switch"
              onClick={() => change('require_fees_cleared', !values.require_fees_cleared)}
            ><i /></button>
            <div>
              <p id="st-fees-label" className="st-switch-title">Certificates need all fees paid <span className={`st-state${values.require_fees_cleared ? ' is-on' : ''}`}>{values.require_fees_cleared ? 'On' : 'Off'}</span></p>
              <p className="st-muted">Applies when a certificate is issued.</p>
            </div>
          </div>
          {values.require_fees_cleared
            ? <p className="st-note"><ShieldCheck size={16} aria-hidden="true" /> A student cannot receive a certificate until every fee is verified.</p>
            : <p className="st-note st-warn"><TriangleAlert size={16} aria-hidden="true" /> Certificates can be issued even if fees are unpaid, so a student can finish with fees outstanding.</p>}
        </Section>

        <Section area="name" icon={<Building2 size={20} />} title="Academy name" text="How your academy is named for students and staff.">
          <div>
            <label className="st-label" htmlFor="st-name">Name</label>
            <input
              id="st-name"
              className="st-input"
              value={values.academy_name}
              maxLength={140}
              aria-invalid={nameError ? true : undefined}
              onChange={event => change('academy_name', event.target.value)}
            />
            <div className="st-meta">
              {nameError ? <p className="st-error" role="alert">{nameError}</p> : <span />}
              <span className="st-count">{values.academy_name.length}/120</span>
            </div>
          </div>
          <div className="st-brand" aria-label="Preview of the name">
            <span className="st-brand-mark" aria-hidden="true">{(values.academy_name.trim()[0] ?? '?').toUpperCase()}</span>
            <span className="st-brand-name">{values.academy_name.trim() || 'Your academy'}</span>
          </div>
        </Section>

        <Section area="payment" icon={<CreditCard size={20} />} title="Payment instructions" text="Shown to students on their fee page before they pay.">
          <div className="st-pay">
            <div className="st-pay-edit">
              <label className="st-label" htmlFor="st-pay">Message</label>
              <textarea
                id="st-pay"
                className="st-input st-textarea"
                value={values.payment_instructions}
                aria-invalid={payError ? true : undefined}
                onChange={event => change('payment_instructions', event.target.value)}
              />
              <div className="st-meta">
                {payError ? <p className="st-error" role="alert">{payError}</p> : <span className="st-muted">Leave empty until finance is ready.</span>}
                <span className="st-count">{values.payment_instructions.length}/2000</span>
              </div>
            </div>
            <div className="st-preview" aria-label="Preview of what students see">
              <p className="st-preview-tag">What students see</p>
              {instructions ? <p className="st-preview-text">{instructions}</p> : <p className="st-preview-empty">Nothing yet. Students will see no payment instructions.</p>}
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
