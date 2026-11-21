import { useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useApi } from '../hooks';
import { PanelFrame, type NavItem } from '../PanelShell';
import { AuditLogView } from '../AuditLogView';
import { RolesAccess } from './RolesAccess';
import './superadmin-mobile.css';
import { SettingsPage } from './SettingsPage';
import { Card, Empty, ErrorNotice, Field, Notice, PageHead, Stat, Table, fmtDateTime } from '../ui';

const NAV: NavItem[] = [
  { to: '/superadmin', label: 'Overview' },
  { to: '/superadmin/roles', label: 'Roles & access' },
  { to: '/superadmin/settings', label: 'Settings' },
  { to: '/superadmin/audit-log', label: 'Audit log' },
  { to: '/superadmin/panels', label: 'Open any panel' },
];

function Overview() {
  const { data, error } = useApi<{ users: number; batches: number; enrolments: number; verified_income_inr: number }>('/superadmin/overview');
  return (
    <>
      <PageHead title="Super admin" text="Full control: roles, settings, every panel and the complete audit trail." />
      <ErrorNotice error={error} />
      <div className="p-stats">
        <Stat label="Accounts" value={data?.users} />
        <Stat label="Batches" value={data?.batches} />
        <Stat label="Enrolments" value={data?.enrolments} />
        <Stat label="Verified income" value={data ? `₹${data.verified_income_inr.toLocaleString('en-IN')}` : null} />
      </div>
    </>
  );
}

function AuditLog() {
  return <AuditLogView endpoint="/superadmin/audit-log?limit=300" text="Every change on the platform, in order." />;
}

function Panels() {
  const links = [
    { to: '/manager', label: 'Manager' },
    { to: '/trainer', label: 'Trainer' },
    { to: '/finance', label: 'Financier' },
    { to: '/admin/overview', label: 'Admin' },
    { to: '/app', label: 'Student' },
  ];
  return (
    <>
      <PageHead title="Open any panel" text="As super admin you can open every panel to check exactly what each role sees." />
      <Card>
        <div className="p-row sa-panels">
          {links.map(link => <Link key={link.to} className="p-btn" to={link.to}>{link.label}</Link>)}
        </div>
      </Card>
    </>
  );
}

export default function SuperAdminPanel() {
  return (
    <PanelFrame role="super_admin" brand="Super admin" items={NAV}>
      {() => (
        <Routes>
          <Route index element={<Overview />} />
          <Route path="roles" element={<RolesAccess />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="audit-log" element={<AuditLog />} />
          <Route path="panels" element={<Panels />} />
          <Route path="*" element={<Empty>This page does not exist.</Empty>} />
        </Routes>
      )}
    </PanelFrame>
  );
}
