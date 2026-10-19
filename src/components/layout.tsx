import { Personalization } from './learning/Personalization';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowUp, ArrowUpRight, CalendarDays, Mail, MapPin, Phone, X } from 'lucide-react';
import { LogoMark } from './LogoMark';
import { academy } from '../config/academy';
import { navigation } from '../data/routes';
import { Button } from './ui';
import { ReadingProgress } from './MotionSystem';
import { PaletteMenu } from './PaletteMenu';
import { Marquee } from './fx';

export { LogoMark };
export function Logo() { return <Link to="/" className="logo flex flex-row items-center flex-nowrap gap-3 shrink-0" aria-label={`${academy.name} home`}><span className="logo-mark"><LogoMark size={34} aria-hidden="true" className="shrink-0"/></span><span className="logo-wordmark flex flex-col justify-center leading-tight"><span className="logo-name whitespace-nowrap">{academy.name.replace(/\s+(Technical\s+)?Academy$/i, "")}</span><span className="logo-subtitle whitespace-nowrap">Academy</span></span></Link>; }

const isCurrent = (to: string, pathname: string) => to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);

/**
 * The dock's link island. A liquid lens glides to whichever link is hovered or focused and
 * settles back on the current page, which also keeps a small eclipse bead beneath its label.
 * Index numerals and the rolling duplicate label are hidden, so each link is named by its label alone.
 */
function DockNav() {
  const { pathname } = useLocation();
  const [hovered, setHovered] = useState<string | null>(null);
  const lens = hovered ?? navigation.find(item => isCurrent(item.to, pathname))?.to;
  return <nav className="desktop-nav dock-island dock-nav" aria-label="Main navigation" onMouseLeave={() => setHovered(null)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHovered(null); }}>
    {navigation.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'} className="dock-link" data-lens={lens === item.to} onMouseEnter={() => setHovered(item.to)} onFocus={() => setHovered(item.to)}>
      {lens === item.to && <motion.span layoutId="dock-lens" className="dock-lens" aria-hidden="true" transition={{ type: 'spring', stiffness: 480, damping: 36, mass: 0.7 }}/>}
      <span className="dock-label"><span>{item.label}</span><span aria-hidden="true">{item.label}</span></span>
    </NavLink>)}
  </nav>;
}

/** On the homepage the call-to-action scrolls to the in-page booking journey. */
export function Header({ onBook }: { onBook?: () => void }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  useEffect(() => { setOpen(false); }, [location]);
  useEffect(() => {
    const el = dialog.current;
    if (open) { el?.showModal(); document.body.style.overflow = 'hidden'; }
    else { el?.close(); document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  function close() { setOpen(false); trigger.current?.focus(); }
  const cta = onBook
    ? <button type="button" onClick={onBook} className="button button-primary header-cta ss-header-cta" aria-label="Book a counselling call" data-magnetic><CalendarDays size={17} aria-hidden="true"/>Book a call</button>
    : <span className="header-cta-wrap" data-magnetic><Button to="/book-session" className="header-cta">Book a call</Button></span>;
  return <><a href="#main" className="skip-link">Skip to content</a><header className="site-header"><div className="container header-inner dock"><div className="dock-island dock-brand"><Logo/></div><DockNav/><div className="dock-island header-tools"><PaletteMenu/>{cta}<button ref={trigger} className="menu-trigger icon-button" aria-label="Open navigation" aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(true)}><span className="menu-glyph" aria-hidden="true"><i/><i/></span></button></div></div><ReadingProgress/></header>
  <dialog ref={dialog} id="mobile-navigation" className="mobile-drawer" aria-label="Navigation" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === dialog.current) close(); }}><div className="drawer-inner"><div className="drawer-top"><Logo/><button className="icon-button" onClick={close} aria-label="Close navigation" autoFocus><X/></button></div><nav aria-label="Mobile navigation">{[...navigation, { to: '/career-support', label: 'Career support' }].map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={close}>{n.label}<ArrowUpRight/></NavLink>)}</nav><div onClick={close}><Button to="/book-session">Book a one-on-one call</Button></div><div className="drawer-legal"><Link to="/privacy-policy" onClick={close}>Privacy</Link><Link to="/terms-and-conditions" onClick={close}>Terms</Link></div><p className="muted">{academy.tagline}</p></div></dialog></>;
}

export function Footer() {
  const top = () => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  return <><Personalization/><footer className="site-footer stage">
    <Marquee className="footer-marquee" speed={60} items={['Learn', 'Build', 'Evolve'].map(word => <span className="footer-marquee-word">{word}</span>)}/>
    <div className="container">
      <div className="footer-grid">
        <div className="footer-brand"><Logo/><p>Turn understanding into ability.<br/>And ambition into your next chapter.</p></div>
        <div className="footer-col">
          <h2>Explore</h2>
          <Link to="/programmes">Programmes</Link>
          <Link to="/learning-experience">Learning experience</Link>
          <Link to="/career-support">Career support</Link>
          <Link to="/about">About the academy</Link>
        </div>
        <div className="footer-col footer-col-action">
          <h2>Take the next step</h2>
          <div className="footer-links-group">
            <Link to="/book-session">Book a counselling call</Link>
            <Link to="/contact">Contact & FAQs</Link>
            <Link to="/programmes">Programme fees & catalogue</Link>
          </div>
          {(academy.email || academy.phone || academy.address) && (
            <div className="footer-contact-block">
              {academy.email && (
                <a href={`mailto:${academy.email}`} className="footer-contact-item footer-email-link" aria-label={`Email ${academy.email}`}>
                  <Mail size={14} aria-hidden="true" className="shrink-0"/>
                  <span>{academy.email}</span>
                </a>
              )}
              {academy.phone && (
                <a href={`tel:${academy.phone}`} className="footer-contact-item footer-phone-link" aria-label={`Call ${academy.phone}`}>
                  <Phone size={14} aria-hidden="true" className="shrink-0"/>
                  <span>{academy.phone}</span>
                </a>
              )}
              {academy.address && (
                <div className="footer-address-item">
                  <div className="footer-address-row">
                    <MapPin size={14} aria-hidden="true" className="shrink-0"/>
                    <div className="footer-address-details">
                      <span className="footer-address-text">{academy.address}</span>
                      {academy.googleMapsUrl && (
                        <a href={academy.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="footer-map-link" aria-label="View Aintrix Academy on Google Maps">
                          View on Google Maps <ArrowUpRight size={13} aria-hidden="true"/>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <button className="back-top" onClick={top} aria-label="Back to top" data-magnetic><ArrowUp size={20}/></button>
      </div>
      <div className="footer-wordmark" aria-hidden="true">{academy.name}</div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} {academy.name}. {academy.brandApproved ? 'Learn. Build. Evolve.' : 'Brand identity pending approval.'}</span><div><Link to="/privacy-policy">Privacy policy</Link><Link to="/terms-and-conditions">Terms & conditions</Link></div></div>
      <p className="footer-disclaimer">Internships depend on eligibility, availability and confirmed package terms. Placement support does not guarantee employment.</p>
    </div>
  </footer></>;
}
