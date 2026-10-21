import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RETENTION_DAYS, POLICY_VERSION, deleteAllLocalData, setConsent, useConsent } from '../analytics/consent';
import { Notice, ToolHero } from '../components/platform/ui';

const stored = [
  { key: 'Analytics choice', purpose: 'Remembers whether optional analytics may run. Kept until you change it.', when: 'When you choose' },
  { key: 'Product events', purpose: `Page views and milestones such as "test completed", with no free text or contact details. Deleted after ${RETENTION_DAYS} days.`, when: 'Only with analytics allowed' },
  { key: 'Random visitor id', purpose: 'Groups your events and keeps experiment variants stable. Not linked to you or your device.', when: 'Only with analytics allowed' },
  { key: 'Skill test progress and history', purpose: 'Lets you resume a test and compare attempts.', when: 'Only if you tick "Save my progress"' },
  { key: 'Latest result for this tab', purpose: 'Passes your finished test to the roadmap page. Cleared when the tab closes.', when: 'After you finish a test' },
  { key: 'Roadmap and coding practice', purpose: 'Your roadmap answers and challenge history, so you can return to them.', when: 'Only if you choose to save them' },
];

export default function PrivacyChoices() {
  const consent = useConsent();
  const [message, setMessage] = useState('');
  return <>
    <ToolHero title="Privacy choices" description="Decide whether optional analytics run on this device, see what is stored and delete it. Everything listed here stays in your browser; nothing is sent to a server by these features."/>
    <section className="container pf-section pf-stack" style={{ gap: 20 }}>
      {message && <Notice tone="success">{message}</Notice>}
      <div className="pf-card pf-stack">
        <h2>Optional analytics</h2>
        <p>Current choice: <strong>{consent ? (consent.choice === 'analytics' ? 'Analytics allowed' : 'Essential only') : 'Not chosen yet (nothing optional runs)'}</strong>{consent && <span className="pf-muted"> · since {new Date(consent.decidedAt).toLocaleDateString()}</span>}</p>
        <p className="pf-small pf-muted">Analytics help the academy see which pages and tools are useful. They are first-party only: no advertising networks, no cross-site tracking, no fingerprinting. Policy version {POLICY_VERSION}.</p>
        <div className="pf-actions">
          <button type="button" className="button button-primary" aria-pressed={consent?.choice === 'analytics'} onClick={() => { setConsent('analytics'); setMessage('Analytics allowed. You can change this at any time.'); }}>Allow analytics</button>
          <button type="button" className="button button-secondary" aria-pressed={consent?.choice === 'essential'} onClick={() => { setConsent('essential'); setMessage('Optional analytics are off and their stored data has been removed.'); }}>Essential only</button>
        </div>
      </div>
      <div className="pf-card pf-stack">
        <h2>What can be stored on this device</h2>
        <div className="pf-table-wrap"><table className="pf-table"><thead><tr><th scope="col">Data</th><th scope="col">Why</th><th scope="col">When</th></tr></thead><tbody>{stored.map(row => <tr key={row.key}><th scope="row">{row.key}</th><td>{row.purpose}</td><td>{row.when}</td></tr>)}</tbody></table></div>
      </div>
      <div className="pf-card pf-stack">
        <h2>Delete everything</h2>
        <p>Removes every Aintrix Academy item from this browser: analytics, saved tests, roadmaps and preferences. Counselling bookings and enquiries are handled by the academy's services and are not affected; contact the academy for those.</p>
        <div className="pf-actions"><button type="button" className="button button-secondary" onClick={() => { deleteAllLocalData(); setMessage('All Aintrix Academy data on this device has been deleted.'); }}>Delete my data on this device</button></div>
      </div>
      <Notice title="Legal review pending">This page describes how the site behaves. The academy's privacy notice, including its obligations under India's Digital Personal Data Protection Act, still needs legal approval. <Link to="/privacy-policy" className="text-link">Read the draft privacy notice</Link></Notice>
    </section>
  </>;
}
