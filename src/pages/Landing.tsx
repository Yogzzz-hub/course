import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { landingFor, landingPages } from '../data/landingPages';
import { Accordion, BookingCTA } from '../components/ui';
import { Breadcrumbs, ToolHero } from '../components/platform/ui';

/** Search landing pages: distinct educational content per path, each leading into a real tool. */
export default function Landing() {
  const { pathname } = useLocation();
  const page = landingFor(pathname) ?? landingPages[0];
  return <>
    <div className="container"><Breadcrumbs items={[{ to: '/', label: 'Home' }, { label: page.title }]}/></div>
    <ToolHero title={page.h1} description={page.lede} aside={<div className="pf-card pf-card-dark pf-stack">
      <h2>Try it now</h2>
      <p>{page.tool.note}</p>
      <Link to={page.tool.to} className="button button-primary" style={{ background: '#fff', color: 'var(--accent)', justifySelf: 'start' }}>{page.tool.label}<ArrowRight size={16} aria-hidden="true"/></Link>
    </div>}/>
    <section className="container pf-section pf-stack" style={{ gap: 20 }}>
      {page.sections.map(section => <article key={section.heading} className="pf-card">
        <h2>{section.heading}</h2>
        <p>{section.body}</p>
        {section.points && <ul className="pf-stack" style={{ listStyle: 'none', padding: 0, margin: '14px 0 0' }}>{section.points.map(point => <li key={point} className="pf-row pf-small"><Check size={16} aria-hidden="true" style={{ color: 'var(--accent)' }}/>{point}</li>)}</ul>}
      </article>)}
      <section className="pf-card" aria-labelledby="landing-faq">
        <h2 id="landing-faq">Questions</h2>
        <div style={{ marginTop: 12 }}><Accordion items={page.faqs.map(faq => ({ question: faq.question, answer: <p>{faq.answer}</p> }))}/></div>
      </section>
      <nav className="pf-card" aria-label="Related pages">
        <h2>Keep exploring</h2>
        <div className="pf-row" style={{ marginTop: 12 }}>{page.related.map(link => <Link key={link.to} to={link.to} className="button button-secondary">{link.label}</Link>)}</div>
      </nav>
    </section>
    <BookingCTA/>
  </>;
}
