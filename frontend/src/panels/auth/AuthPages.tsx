import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { ErrorNotice, Notice } from '../ui';
import '../panels.css';

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

/** Sign in for learners and staff. Everyone uses the same page; the role decides where they land. */
export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const backend = useBackendState();

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

  return (
    <section className="container page-hero" style={{ maxWidth: 560 }}>
      <div className="p-card" style={{ padding: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, margin: '0 0 6px' }}>Sign in</h1>
        <p className="p-muted" style={{ margin: '0 0 22px' }}>Learners and staff use the same sign-in.</p>
        {backend === 'down' && (
          <Notice tone="danger">
            The academy backend is not running, so nobody can sign in yet. In the backend folder, double-click <strong>start-backend.bat</strong> (or run <strong>uvicorn app.main:app --port 8000</strong>), keep that window open, then refresh this page.
          </Notice>
        )}
        {backend === 'up' && <p className="p-hint" role="status" style={{ marginBottom: 12 }}>● Backend connected</p>}
        <ErrorNotice error={error} />

        {import.meta.env.DEV && (
          <div className="p-demo" aria-label="Development quick sign-in">
            <p className="p-demo-title">Choose a role to enter <span>development build only · no password</span></p>
            <div className="p-demo-grid">
              {DEV_ROLES.map(item => (
                <button key={item.role} type="button" className="p-demo-btn" disabled={busy} onClick={() => quickSignIn(item.role)}>
                  <strong>{item.label}</strong>
                  <span>{item.note}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={signIn} noValidate>
          <div className="p-field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" className="p-input" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} />
          </div>
          <div className="p-field">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" className="p-input" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
          </div>
          <button className="p-btn" type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </section>
  );
}
