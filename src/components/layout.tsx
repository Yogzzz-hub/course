import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowUp, ArrowUpRight, Menu, X, Orbit } from 'lucide-react';
import { academy } from '../config/academy';
import { navigation } from '../data/routes';
import { Button } from './ui';
import { ReadingProgress, MotionToggle } from './MotionSystem';
import { ThemeSwitcher } from './ThemeSwitcher';
import { PaletteMenu } from './PaletteMenu';

export function Logo() { return <Link to="/" className="logo" aria-label={`${academy.name} home`}><Orbit size={35} aria-hidden="true"/><span className="logo-wordmark"><span className="logo-name">{academy.name.replace(/\s+Technical Academy$/i, "")}</span><span className="logo-subtitle">Technical Academy</span></span></Link>; }
export function Header() {
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
  return <><a href="#main" className="skip-link">Skip to content</a><header className="site-header"><div className="container header-inner"><Logo/><nav className="desktop-nav" aria-label="Main navigation">{navigation.map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'}>{n.label}</NavLink>)}</nav><PaletteMenu/><Button to="/book-session" className="header-cta" secondary>Book a call</Button><button ref={trigger} className="menu-trigger icon-button" aria-label="Open navigation" aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(true)}><Menu/></button></div><ReadingProgress/></header>
  <dialog ref={dialog} id="mobile-navigation" className="mobile-drawer" aria-label="Navigation" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === dialog.current) close(); }}><div className="drawer-inner"><div className="drawer-top"><Logo/><button className="icon-button" onClick={close} aria-label="Close navigation" autoFocus><X/></button></div><div className="drawer-theme"><p className="eyebrow">THEME</p><ThemeSwitcher/></div><p className="eyebrow">YOUR NEXT CHAPTER</p><nav aria-label="Mobile navigation">{[...navigation, { to: '/career-support', label: 'Career support' }].map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={close}>{n.label}<ArrowUpRight/></NavLink>)}</nav><div onClick={close}><Button to="/book-session">Book a one-on-one call</Button></div><div className="drawer-legal"><Link to="/privacy-policy" onClick={close}>Privacy</Link><Link to="/terms-and-conditions" onClick={close}>Terms</Link></div><p className="muted">{academy.tagline}</p></div></dialog></>;
}
export function Footer() { return <footer className="site-footer"><div className="container"><div className="footer-grid"><div className="footer-brand"><Logo/><p>Turn understanding into ability.<br/>And ambition into your next chapter.</p><span className="eyebrow">{academy.tagline}</span></div><div><h2>Explore</h2><Link to="/programmes">Programmes</Link><Link to="/learning-experience">Learning experience</Link><Link to="/career-support">Career support</Link><Link to="/about">About the academy</Link></div><div><h2>Take the next step</h2><Link to="/book-session">Book a counselling call</Link><Link to="/contact">Contact & FAQs</Link><Link to="/programmes">Programme fees & catalogue</Link>{academy.email && <a href={`mailto:${academy.email}`}>{academy.email}</a>}{academy.phone && <a href={`tel:${academy.phone}`}>{academy.phone}</a>}</div><button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })} aria-label="Back to top"><ArrowUp size={20}/></button></div><div className="footer-bottom"><span>© {new Date().getFullYear()} {academy.name}. {academy.brandApproved ? 'Learn. Build. Evolve.' : 'Brand identity pending approval.'}</span><div><Link to="/privacy-policy">Privacy policy</Link><Link to="/terms-and-conditions">Terms & conditions</Link></div></div><div className="footer-toggles"><MotionToggle/></div><p className="footer-disclaimer">Internships depend on eligibility, availability and confirmed package terms. Placement support does not guarantee employment.</p></div></footer>; }
