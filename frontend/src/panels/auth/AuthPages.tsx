import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { flushSync } from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { AuthBar } from './AuthBar';
import { RibbonMascot } from './RibbonMascot';
import './signup.css';
import { Spinner } from '../../components/loading/Loaders';

type BackendState = 'checking' | 'up' | 'down';

/** Asks the academy backend (through /v1/health) whether it is running, so the page can say so before anyone clicks. */
function useBackendState(): BackendState {
  const [state, setState] = useState<BackendState>('checking');
  useEffect(() => {
    let alive = true;
    fetch('/v1/health', { cache: 'no-store', signal: AbortSignal.timeout(4000) })
      .then(response => {
        const isJson = response.headers.get('content-type')?.includes('application/json') ?? false;
        if (alive) setState(response.ok && isJson ? 'up' : 'down');
      })
      .catch(() => {
        if (alive) setState('down');
      });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

/** Roles offered by the development quick sign-in. Shown only in the development build, never in production. */
const DEV_ROLES = [
  { role: 'student', label: 'Student', note: 'Fees, classes, assignments, certificates' },
  { role: 'trainer', label: 'Trainer', note: 'Classes, assignments, quizzes, tasks' },
  { role: 'manager', label: 'Manager', note: 'Batches, students, certificates' },
  { role: 'financier', label: 'Financier', note: 'Payments, expenses, ledger' },
  { role: 'admin', label: 'Admin', note: 'Users and audit log' },
  { role: 'super_admin', label: 'Super admin', note: 'Everything, roles and settings' },
];

type Mode = 'student' | 'staff';

const STAFF_HOMES = /^\/(trainer|manager|finance|admin|superadmin)(\/|$)/;

type ViewTransitionDocument = Document & { startViewTransition?: (update: () => void) => { ready: Promise<void>; finished: Promise<void> } };

/** Sign in for learners and staff. Everyone uses the same endpoint; the role decides where they land. */
export function LoginPage() {
  const uid = useId();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [typingPassword, setTypingPassword] = useState(false);
  const [mode, setMode] = useState<Mode>('student');
  const [hopping, setHopping] = useState(false);
  const shell = useRef<HTMLDivElement>(null);
  const backend = useBackendState();
  const staff = mode === 'staff';

  // A link such as /login?next=/admin/users opens on the staff side. Done after mount so server and client HTML match.
  useEffect(() => {
    if (STAFF_HOMES.test(params.get('next') ?? '')) setMode('staff');
  }, [params]);

  /** Swaps Student and Staff with a circle that grows out of the clicked button (View Transitions API; instant where unsupported). */
  function switchMode(next: Mode, trigger: HTMLElement) {
    if (next === mode) return;
    setError(null);
    const doc = document as ViewTransitionDocument;
    const element = shell.current;
    if (!element || !doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMode(next);
      return;
    }
    const box = element.getBoundingClientRect();
    const button = trigger.getBoundingClientRect();
    const x = button.left + button.width / 2 - box.left;
    const y = button.top + button.height / 2 - box.top;
    const radius = Math.hypot(Math.max(x, box.width - x), Math.max(y, box.height - y));
    const root = document.documentElement;
    root.classList.add('su-vt');
    setHopping(true);
    window.setTimeout(() => setHopping(false), 900);
    const transition = doc.startViewTransition(() => flushSync(() => setMode(next)));
    transition.ready
      .then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 800, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(auth-shell)' },
        );
      })
      .catch(() => undefined);
    transition.finished.finally(() => root.classList.remove('su-vt'));
  }

  function goNext(redirect?: string) {
    const next = params.get('next');
    navigate(next && next.startsWith('/') ? next : redirect || '/app');
  }

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ redirect?: string }>('/auth/login', { body: { email, password } });
      goNext(result.redirect);
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusy(false);
    }
  }

  async function quickSignIn(role: string) {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ redirect?: string }>('/dev/login-as', { body: { role } });
      goNext(result.redirect);
    } catch (caught) {
      setError(caught as ApiError);
    } finally {
      setBusy(false);
    }
  }

  const devRoles = DEV_ROLES.filter(item => (staff ? item.role !== 'student' : item.role === 'student'));

  return (
    <section className={`su-page${staff ? ' is-staff' : ''}`} aria-labelledby={`${uid}-title`}>
      <div ref={shell} className="su-shell">
        <AuthBar />
        <div className="su-main">
          <div className="su-mode" role="group" aria-label="Sign-in type">
            <span className="su-mode-pill" aria-hidden="true" />
            <button type="button" aria-pressed={!staff} onClick={event => switchMode('student', event.currentTarget)}>Student</button>
            <button type="button" aria-pressed={staff} onClick={event => switchMode('staff', event.currentTarget)}>Staff</button>
          </div>

          <p className="su-eyebrow">{staff ? 'Management & administration' : 'Welcome back'}</p>
          <h1 id={`${uid}-title`} className="su-title">{staff ? 'Staff sign-in' : 'Student sign-in'}<span aria-hidden="true">.</span></h1>
          {staff ? (
            <p className="su-member">Trainers, managers, finance and admins. Accounts are created by an administrator.</p>
          ) : (
            <p className="su-member">New here? <Link to="/signup">Create an account</Link></p>
          )}

          {backend === 'down' && (
            <p className="su-alert su-alert-danger" role="alert">
              The academy backend is not running, so nobody can sign in yet. In the backend folder, double-click <strong>start-backend.bat</strong> (or run <strong>uvicorn app.main:app --port 8000</strong>), keep that window open, then refresh this page.
            </p>
          )}
          {backend === 'up' && <p className="su-backend" role="status">● Backend connected</p>}
          {error && <p className="su-alert su-alert-danger" role="alert">{error.message ?? 'Something went wrong.'}</p>}

          <form className="su-form" onSubmit={signIn} noValidate>
            <div className="su-field">
              <input id={`${uid}-email`} className="su-input" type="email" autoComplete="username" placeholder=" " required value={email} onChange={event => setEmail(event.target.value)} />
              <label htmlFor={`${uid}-email`}>{staff ? 'Work email' : 'Email'}</label>
            </div>
            <div className="su-field">
              <input
                id={`${uid}-password`}
                className="su-input"
                type="password"
                autoComplete="current-password"
                placeholder=" "
                required
                value={password}
                onChange={event => setPassword(event.target.value)}
                onFocus={() => setTypingPassword(true)}
                onBlur={() => setTypingPassword(false)}
              />
              <label htmlFor={`${uid}-password`}>Password</label>
            </div>
            <button className="su-btn su-btn-primary su-btn-wide" type="submit" disabled={busy}>
              {busy ? <><Spinner />Signing in…</> : staff ? 'Sign in to workspace' : 'Sign in'}
            </button>
          </form>

          {import.meta.env.DEV && (
            <div className="su-demo" aria-label="Development quick sign-in">
              <p className="su-demo-title">Choose a role to enter <span>development build only · no password</span></p>
              <div className={`su-demo-grid${devRoles.length === 1 ? ' is-single' : ''}`}>
                {devRoles.map(item => (
                  <button key={item.role} type="button" className="su-demo-btn" title={item.note} disabled={busy} onClick={() => quickSignIn(item.role)}>
                    <strong>{item.label}</strong>
                    <span>{item.note}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        <div className="su-art">
          <RibbonMascot eyesClosed={typingPassword} staff={staff} hopping={hopping} />
        </div>
      </div>
    </section>
  );
}
