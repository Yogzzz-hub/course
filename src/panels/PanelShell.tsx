import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ArrowRight, LogOut } from 'lucide-react';
import { api } from './api';
import { useApi } from './hooks';
import './panels.css';

export interface Me {
  id: string;
  name: string;
  email: string;
  roles: string[];
  mode?: 'prospect' | 'enrolled' | 'alumni';
  status?: string;
}

export interface NavItem { to: string; label: string }

/** The shared frame for all three panels: side navigation on desktop, a scrolling bar on phones. */
export function PanelShell({ brand, items, me, children }: { brand: string; items: NavItem[]; me?: Me | null; children: ReactNode }) {
  const navigate = useNavigate();

  async function signOut() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // Signing out locally still matters even if the service is unreachable.
    }
    navigate('/login');
  }

  return (
    <div className="panel-root">
      <aside className="p-side" aria-label={`${brand} navigation`}>
        <div className="p-side-brand">{brand}<span>{me ? me.name : 'Signed in'}</span></div>
        <nav className="p-nav" aria-label={`${brand} sections`}>
          {items.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to.split('/').length <= 2}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button type="button" className="p-btn p-btn-ghost" style={{ marginTop: 'auto' }} onClick={signOut}>
          <LogOut size={16} aria-hidden="true" /> Sign out
        </button>
      </aside>
      <main className="p-main" id="main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

/** Loads the signed-in person. A missing session sends them to sign-in; an unreachable service just returns the error. */
export function useMe() {
  const result = useApi<Me>('/me');
  const unauthorised = result.error?.status === 401;
  return { ...result, unauthorised };
}

export function NextArrow() {
  return <ArrowRight size={16} aria-hidden="true" />;
}
