import type { ReactNode } from 'react';
import { NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { api } from './api';
import { useApi } from './hooks';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { Loading, ErrorNotice, Notice } from './ui';
import './panels.css';

export interface Me {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

export interface NavItem { to: string; label: string; end?: boolean }

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super admin',
  manager: 'Manager',
  financier: 'Financier',
  admin: 'Admin',
  trainer: 'Trainer',
  student: 'Student',
};

export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role;
}

/** Shell for every panel: side navigation on desktop, a top bar with a menu on phones. */
export function PanelShell({ brand, items, me, children }: { brand: string; items: NavItem[]; me: Me; children: ReactNode }) {
  const navigate = useNavigate();

  async function signOut() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // Leaving the page still matters even if the service is unreachable.
    }
    navigate('/login');
  }

  return (
    <div className="panel-root">
      <aside className="p-side" aria-label={`${brand} navigation`}>
        <div className="p-side-brand">
          {brand}
          <span>{me.name}</span>
        </div>
        <nav className="p-nav" aria-label={`${brand} sections`}>
          {items.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end ?? true}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-side-foot">
          <ThemeSwitcher compact />
          <button type="button" className="p-btn p-btn-ghost" onClick={signOut}>
            <LogOut size={16} aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>
      <div className="p-main" tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}

/** Loads the signed-in person. */
export function useMe() {
  const result = useApi<Me>('/me');
  const unauthorised = result.error?.status === 401;
  return { ...result, unauthorised };
}

/**
 * Guards a panel: signed-out people go to sign-in, people without the role see a clear message.
 * The super admin passes every panel.
 */
export function PanelFrame({ role, brand, items, children }: { role: string; brand: string; items: NavItem[]; children: (me: Me) => ReactNode }) {
  const me = useMe();
  const location = useLocation();
  if (me.unauthorised) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (me.error) return <section className="container page-hero"><ErrorNotice error={me.error} /></section>;
  if (!me.data) return <section className="container page-hero"><Loading /></section>;
  const allowed = me.data.roles.includes(role) || me.data.roles.includes('super_admin');
  if (!allowed) {
    return (
      <section className="container page-hero">
        <Notice tone="danger">This area is for the {roleLabel(role).toLowerCase()} role. Ask the super admin if you need access.</Notice>
      </section>
    );
  }
  return <PanelShell brand={brand} items={items} me={me.data}>{children(me.data)}</PanelShell>;
}
