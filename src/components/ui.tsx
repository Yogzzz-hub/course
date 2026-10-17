import { useMotionVisibility } from './MotionSystem';
import { AnimatedText } from './AnimatedText';
import { ArrowUpRight, ArrowRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AnimatedDetails } from './AnimatedDetails';
import { faqs } from '../data/faqs';
import { Eclipse, EclipseRing } from './Eclipse';

export function Button({ to, children, secondary = false, className = '' }: { to: string; children: ReactNode; secondary?: boolean; className?: string }) {
  return <Link to={to} className={`button ${secondary ? 'button-secondary' : 'button-primary'} ${className}`}>{children}<ArrowUpRight size={17} aria-hidden="true" /></Link>;
}
export function TextLink({ to, children }: { to: string; children: ReactNode }) { return <Link className="text-link" to={to}>{children}<ArrowRight size={17} aria-hidden="true" /></Link>; }
/** A section heading speaks for itself: no kicker above it, no number beside it. */
export function SectionHeading({ title, description }: { title: ReactNode; description?: string }) {
  return <div className="section-heading"><h2><AnimatedText>{title}</AnimatedText></h2>{description && <p>{description}</p>}</div>;
}
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={className} data-reveal>{children}</div>;
}
export function Tags({ items }: { items: string[] }) { return <div className="tags">{items.map(item => <span key={item}>{item}</span>)}</div>; }
export function Accordion({ items }: { items: { question: string; answer: ReactNode }[] }) {
  return <div className="accordion">{items.map(item => <AnimatedDetails key={item.question} summary={<><span>{item.question}</span><Plus className="accordion-icon" size={19} aria-hidden="true" /></>}><div className="accordion-body">{item.answer}</div></AnimatedDetails>)}</div>;
}
export function FAQ({ compact = false }: { compact?: boolean }) {
  return <section className="section container faq-section"><SectionHeading title={<>Good questions.<br /><span className="muted">Straight answers.</span></>} /><div><Accordion items={compact ? faqs.slice(0, 4) : faqs} />{compact && <TextLink to="/contact#faqs">See all FAQs</TextLink>}</div></section>;
}
export function BookingCTA() { const ref = useMotionVisibility<HTMLDivElement>(); return <section className="container cta-wrap"><div className="booking-cta" ref={ref}><div className="cta-sphere" aria-hidden="true"><Eclipse live={false}/></div><div><h2><AnimatedText>Your next step starts<br />with a conversation.</AnimatedText></h2><p>Bring your questions. Let's talk about your goals,<br className="desktop-break" /> your starting point and the path ahead.</p></div><div><span data-magnetic className="inline-flex"><Button to="/book-session">Book a one-on-one call</Button></span><span className="cta-note">A conversation about your learning goals.</span></div></div></section>; }
/** The shadow-sphere mark for light inner-page heroes: CSS only, with two annotations on its orbit. */
export function PageEclipse({ labels = ['Learn', 'Build'] }: { labels?: [string, string] | string[] }) {
  return <div className="page-eclipse" data-tilt="10" aria-hidden="true"><EclipseRing half="back"/><Eclipse className="page-eclipse-mark" live={false}/><EclipseRing half="front"/><span className="page-eclipse-label page-eclipse-label-a">{labels[0]}</span><span className="page-eclipse-label page-eclipse-label-b">{labels[1]}</span></div>;
}
export function PageHero({ title, description, children, labels, visual }: { title: ReactNode; description: string; children?: ReactNode; labels?: [string, string]; visual?: ReactNode }) { return <section className="container page-hero"><div className="page-hero-copy"><h1 tabIndex={-1}><AnimatedText>{title}</AnimatedText></h1><p>{description}</p>{children}</div>{visual ?? <PageEclipse labels={labels}/>}</section>; }
