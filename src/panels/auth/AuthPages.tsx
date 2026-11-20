import { useEffect, useState, type FormEvent } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import '../panels.css';

const shell = (children: ReactNode) => (
  <section className="container page-hero" style={{ maxWidth: 560 }}>
    <div className="p-card" style={{ padding: 28 }}>{children}</div>
  </section>
);

function FieldError({ error, field }: { error: ApiError | null; field: string }) {
  const message = error?.fields?.[field];
  return message ? <p className="p-error" role="alert">{message}</p> : null;
}

function FormError({ error }: { error: ApiError | null }) {
  if (!error) return null;
  const notConnected = error.code === 'NETWORK';
  return (
    <p className="p-alert p-alert-danger" role="alert" style={{ margin: '0 0 14px' }}>
      {notConnected ? 'The academy service is not connected yet. Please try again once it is running.' : error.message}
    </p>
  );
}

/** Sign in for learners and staff. Staff accounts add a 6-digit authenticator step (spec §29.2). */
export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [needsSecondFactor, setNeedsSecondFactor] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!needsSecondFactor) {
        const result = await api<{ next?: string; redirect?: string }>('/auth/login', { body: { email, password } });
        if (result.next === '2fa') {
          setNeedsSecondFactor(true);
        } else {
          navigate(params.get('next') || result.redirect || '/app');
        }
      } else {
        const result = await api<{ redirect?: string }>('/auth/2fa/verify', { body: { code } });
        navigate(params.get('next') || result.redirect || '/admin/leads');
      }
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusy(false);
    }
  }

  return shell(
    <form onSubmit={submit} noValidate>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, margin: '0 0 6px' }}>Sign in</h1>
      <p className="p-muted" style={{ margin: '0 0 22px' }}>Learners and staff use the same sign-in. Staff accounts also need a code from your authenticator app.</p>
      <FormError error={error} />
      {!needsSecondFactor ? (
        <>
          <div className="p-field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" className="p-input" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} />
            <FieldError error={error} field="email" />
          </div>
          <div className="p-field">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" className="p-input" type="password" autoComplete="current-password" required minLength={10} value={password} onChange={e => setPassword(e.target.value)} />
            <FieldError error={error} field="password" />
          </div>
        </>
      ) : (
        <div className="p-field">
          <label htmlFor="login-code">Authenticator code</label>
          <input id="login-code" className="p-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
          <p className="p-hint">Enter the 6-digit code from your authenticator app.</p>
        </div>
      )}
      <button className="p-btn" type="submit" disabled={busy} style={{ width: '100%' }}>{busy ? 'Signing in…' : needsSecondFactor ? 'Verify and sign in' : 'Sign in'}</button>
      <p style={{ margin: '18px 0 0', fontSize: 14 }}>
        <Link to="/forgot-password">Forgot password?</Link>
        {' · '}
        New here? <Link to="/register">Create an account</Link>
      </p>
    </form>,
  );
}

const statusOptions = ['School student', 'College student', 'Working professional', 'Career break', 'Other'];

/** Registration asks only for what a session needs (spec §12.1). */
export function RegisterPage() {
  const navigate = useNavigate();
  const [programmes, setProgrammes] = useState<string[]>([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '+91 ', status: '', programme: '', password: '' });
  const [terms, setTerms] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);
  const [news, setNews] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    api<{ items: { name: string }[] }>('/public/programmes')
      .then(result => setProgrammes(result.items.map(item => item.name)))
      .catch(() => setProgrammes([]));
  }, []);

  function update(key: keyof typeof form, value: string) {
    setForm(previous => ({ ...previous, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!terms) {
      setError(new ApiError('VALIDATION', 'Please accept the terms and privacy policy to continue.', 422, { terms: 'Tick this box to continue.' }));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api('/auth/register', { body: { ...form, consents: { terms: true, whatsapp, news } } });
      navigate(`/verify?email=${encodeURIComponent(form.email)}`);
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusy(false);
    }
  }

  return shell(
    <form onSubmit={submit} noValidate>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, margin: '0 0 6px' }}>Create your account to book your session</h1>
      <p className="p-muted" style={{ margin: '0 0 22px' }}>We'll use these details to prepare for your conversation and send your confirmation.</p>
      <FormError error={error} />
      <div className="p-field">
        <label htmlFor="reg-name">Full name</label>
        <input id="reg-name" className="p-input" required minLength={2} maxLength={80} autoComplete="name" value={form.name} onChange={e => update('name', e.target.value)} />
        <FieldError error={error} field="name" />
      </div>
      <div className="p-field">
        <label htmlFor="reg-email">Email</label>
        <input id="reg-email" className="p-input" type="email" required autoComplete="email" value={form.email} onChange={e => update('email', e.target.value)} />
        <FieldError error={error} field="email" />
      </div>
      <div className="p-field">
        <label htmlFor="reg-phone">Phone (with country code)</label>
        <input id="reg-phone" className="p-input" type="tel" required autoComplete="tel" value={form.phone} onChange={e => update('phone', e.target.value)} />
        <FieldError error={error} field="phone" />
      </div>
      <div className="p-field">
        <label htmlFor="reg-status">Current status</label>
        <select id="reg-status" className="p-select" required value={form.status} onChange={e => update('status', e.target.value)}>
          <option value="">Choose one</option>
          {statusOptions.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>
      <div className="p-field">
        <label htmlFor="reg-programme">Programme of interest</label>
        <select id="reg-programme" className="p-select" required value={form.programme} onChange={e => update('programme', e.target.value)}>
          <option value="">Choose one</option>
          {programmes.map(name => <option key={name} value={name}>{name}</option>)}
          <option value="Not sure yet">Not sure yet</option>
        </select>
      </div>
      <div className="p-field">
        <label htmlFor="reg-password">Password</label>
        <input id="reg-password" className="p-input" type="password" required minLength={10} autoComplete="new-password" value={form.password} onChange={e => update('password', e.target.value)} />
        <p className="p-hint">At least 10 characters.</p>
        <FieldError error={error} field="password" />
      </div>
      <label className="p-check"><input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} /> I agree to the <Link to="/terms-and-conditions">Terms</Link>, <Link to="/privacy-policy">Privacy Policy</Link> and <Link to="/refund-policy">Refund Policy</Link>.</label>
      <label className="p-check"><input type="checkbox" checked={whatsapp} onChange={e => setWhatsapp(e.target.checked)} /> Send me WhatsApp reminders (optional).</label>
      <label className="p-check"><input type="checkbox" checked={news} onChange={e => setNews(e.target.checked)} /> Send me programme news (optional).</label>
      <button className="p-btn" type="submit" disabled={busy} style={{ width: '100%' }}>{busy ? 'Creating account…' : 'Create account'}</button>
      <p style={{ margin: '18px 0 0', fontSize: 14 }}>Already have an account? <Link to="/login">Sign in</Link></p>
    </form>,
  );
}

/** Six-digit email code (spec §12.2). Codes expire after 10 minutes and allow 5 attempts. */
export function VerifyPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/auth/verify-email', { body: { email, code } });
      navigate('/app');
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      await api('/auth/verify-email/resend', { body: { email } });
      setResent(true);
    } catch (caught) {
      setError(caught as ApiError);
    }
  }

  return shell(
    <form onSubmit={submit} noValidate>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, margin: '0 0 6px' }}>Check your email</h1>
      <p className="p-muted" style={{ margin: '0 0 22px' }}>{email ? <>We sent a 6-digit code to <strong>{email}</strong>.</> : 'Enter the 6-digit code we emailed you.'}</p>
      <FormError error={error} />
      {resent && <p className="p-alert p-alert-success" role="status">A new code is on its way.</p>}
      <div className="p-field">
        <label htmlFor="verify-code">Verification code</label>
        <input id="verify-code" className="p-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
      </div>
      <button className="p-btn" type="submit" disabled={busy || code.length !== 6} style={{ width: '100%' }}>{busy ? 'Checking…' : 'Verify and continue'}</button>
      <p style={{ margin: '18px 0 0', fontSize: 14 }}>
        Didn't get it? <button type="button" className="p-btn p-btn-ghost" style={{ minHeight: 0, padding: '4px 10px', marginLeft: 6 }} onClick={resend} disabled={!email}>Resend code</button>
      </p>
    </form>,
  );
}

/** Always gives the same reply, so the form cannot reveal which emails have accounts. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/auth/password/forgot', { body: { email } });
      setSent(true);
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusy(false);
    }
  }

  return shell(
    sent ? (
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, margin: '0 0 6px' }}>Check your inbox</h1>
        <p className="p-muted">If an account exists for that email, a reset link is on its way. The link is valid for 30 minutes.</p>
        <Link to="/login">Back to sign in</Link>
      </div>
    ) : (
      <form onSubmit={submit} noValidate>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, margin: '0 0 6px' }}>Reset your password</h1>
        <p className="p-muted" style={{ margin: '0 0 22px' }}>Enter the email you registered with and we'll send a reset link.</p>
        <FormError error={error} />
        <div className="p-field">
          <label htmlFor="forgot-email">Email</label>
          <input id="forgot-email" className="p-input" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <button className="p-btn" type="submit" disabled={busy} style={{ width: '100%' }}>{busy ? 'Sending…' : 'Send reset link'}</button>
        <p style={{ margin: '18px 0 0', fontSize: 14 }}><Link to="/login">Back to sign in</Link></p>
      </form>
    ),
  );
}
