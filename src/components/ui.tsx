import { useMotionVisibility } from './MotionSystem';
import { AnimatedText } from './AnimatedText';
import { ArrowUpRight, ArrowRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AnimatedDetails } from './AnimatedDetails';
import { journey } from '../data/programmes';
import { faqs } from '../data/faqs';

export function Button({ to, children, secondary = false, className = '' }: { to: string; children: ReactNode; secondary?: boolean; className?: string }) {
  return <Link to={to} className={`button ${secondary ? 'button-secondary' : 'button-primary'} ${className}`}>{children}<ArrowUpRight size={17} aria-hidden="true" /></Link>;
}
export function TextLink({ to, children }: { to: string; children: ReactNode }) { return <Link className="text-link" to={to}>{children}<ArrowRight size={17} aria-hidden="true" /></Link>; }
export function Eyebrow({ children }: { children: ReactNode }) { return <p className="eyebrow"><span className="small-line" />{children}</p>; }
export function SectionHeading({ number, label, title, description }: { number?: string; label: string; title: ReactNode; description?: string }) {
  return <div className="section-heading"><Eyebrow>{number && `${number} / `}{label}</Eyebrow><h2><AnimatedText>{title}</AnimatedText></h2>{description && <p>{description}</p>}</div>;
}
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={className} data-reveal>{children}</div>;
}
export function Tags({ items }: { items: string[] }) { return <div className="tags">{items.map(item => <span key={item}>{item}</span>)}</div>; }
export function Accordion({ items }: { items: { question: string; answer: ReactNode }[] }) {
  return <div className="accordion">{items.map((item, index) => <AnimatedDetails key={item.question} summary={<><span className="accordion-number">{String(index + 1).padStart(2, '0')}</span><span>{item.question}</span><Plus className="accordion-icon" size={19} aria-hidden="true" /></>}><div className="accordion-body">{item.answer}</div></AnimatedDetails>)}</div>;
}
export function FAQ({ compact = false }: { compact?: boolean }) {
  return <section className="section container faq-section"><SectionHeading label="A little more clarity" title={<>Good questions.<br /><span className="muted">Straight answers.</span></>} /><div><Accordion items={compact ? faqs.slice(0, 4) : faqs} />{compact && <TextLink to="/contact#faqs">See all FAQs</TextLink>}</div></section>;
}
export function Journey() {
  return <ol className="journey">{journey.map((stage, i) => <li key={stage.title}><span className="journey-dot">{String(i + 1).padStart(2, '0')}</span><h3>{stage.title}</h3><p>{stage.text}</p></li>)}</ol>;
}
export function BookingCTA() { const ref = useMotionVisibility<HTMLDivElement>(); return <section className="container cta-wrap"><div className="booking-cta" ref={ref}><div><Eyebrow>Let's find your direction</Eyebrow><h2><AnimatedText>Your next step starts<br />with a conversation.</AnimatedText></h2><p>Bring your questions. Let's talk about your goals,<br className="desktop-break" /> your starting point and the path ahead.</p></div><div><Button to="/book-session">Book a one-on-one call</Button><span className="cta-note">A conversation about your learning goals.</span></div></div></section>; }
export function PageHero({ eyebrow, title, description, children }: { eyebrow: string; title: ReactNode; description: string; children?: ReactNode }) { return <section className="container page-hero"><Eyebrow>{eyebrow}</Eyebrow><h1 tabIndex={-1}><AnimatedText>{title}</AnimatedText></h1><p>{description}</p>{children}</section>; }
