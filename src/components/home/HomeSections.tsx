import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react';
import { ArrowDown, ArrowUpRight, Clock3, Database, MonitorSmartphone, Rocket, Server } from 'lucide-react';
import { CountUp, StackDeck, useActiveIndex, VelocityTape } from '../fx';
import { Eclipse, EclipseRing } from '../Eclipse';
import { useSiteMotion } from '../MotionSystem';
import { detailedProgrammes } from '../../data/programmeCatalog';
import { courses, journey, packages, programme } from '../../data/programmes';

const heroSteps = [
  { title: 'Find your direction', text: 'Explore programmes and compare package inclusions.' },
  { title: 'Plan a conversation', text: 'Verify your email and choose an available time.' },
  { title: 'Bring your goals', text: 'Share your background and prepare for counselling.' },
];

const wideQuery = '(min-width: 1100px)';
function subscribeWide(update: () => void) {
  const query = window.matchMedia(wideQuery);
  query.addEventListener('change', update);
  return () => query.removeEventListener('change', update);
}

export function HomeHero({ onBook }: { onBook: () => void }) {
  const [activeAction, setActiveAction] = useState<'test' | 'book'>('test');
  const section = useRef<HTMLElement>(null);
  const { enabled } = useSiteMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end start'] });
  const visualY = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  const visualScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const copyY = useTransform(scrollYProgress, [0, 1], ['0%', '-12%']);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  // The crescent opens while the sphere is still well in view.
  const reveal = useTransform(scrollYProgress, [0, 0.45], [0, 1]);
  // On phones the hero is several screens tall, so the copy stays put rather than fading while it is read.
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(wideQuery).matches, () => false);
  useEffect(() => {
    const node = section.current;
    if (!node) return;
    const root = document.documentElement;
    // The header is smoked glass while it floats over the hero (CSS default), and light once the hero leaves its band.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) delete root.dataset.headerTone;
      else root.dataset.headerTone = 'light';
    }, { rootMargin: '0px 0px -88% 0px' });
    observer.observe(node);
    return () => { observer.disconnect(); delete root.dataset.headerTone; };
  }, []);
  return <>
    <section ref={section} aria-labelledby="ss-hero-title" className="home-hero eclipse-hero stage">
      <div className="hero-sky" aria-hidden="true"/>
      <motion.div className="eclipse-frame" style={enabled ? { y: visualY, scale: visualScale } : undefined} aria-hidden="true">
        <EclipseRing half="back"/>
        <Eclipse className="hero-eclipse" progress={reveal}/>
        <EclipseRing half="front"/>
      </motion.div>
      <div className="container eclipse-layout">
        <motion.div className="eclipse-copy" style={enabled && wide ? { y: copyY, opacity: fade } : undefined}>
          <h1 id="ss-hero-title" tabIndex={-1} className="eclipse-title">
            <span className="hero-line"><span style={{ '--line': 0 } as CSSProperties}>Are You Ready for Your</span></span>
            <span className="hero-line hero-line-lit"><span style={{ '--line': 1 } as CSSProperties}>Next Developer Interview?</span></span>
          </h1>
          <p className="eclipse-lede">Discover your skills, identify your gaps, and build your personalized career roadmap.</p>
          <div
            className="eclipse-actions hero-action-dock"
            role="group"
            aria-label="Programme actions"
            onMouseLeave={() => setActiveAction('test')}
          >
            <Link
              to="/developer-readiness-test"
              aria-label="Take the Free Skill Test"
              className={`btn-hero-action btn-glow ${activeAction === 'test' ? 'is-active' : ''}`}
              onMouseEnter={() => setActiveAction('test')}
              onFocus={() => setActiveAction('test')}
              data-magnetic
            >
              {activeAction === 'test' && (
                <motion.span
                  layoutId="hero-action-lens"
                  className="hero-action-lens"
                  aria-hidden="true"
                  transition={{ type: 'spring', stiffness: 480, damping: 36, mass: 0.65 }}
                />
              )}
              <span className="hero-action-label">
                <span className="label-desktop">Take the Free Skill Test</span>
                <span className="label-mobile" aria-hidden="true">Free Skill Test</span>
              </span>
              <ArrowUpRight size={17} aria-hidden="true" className="hero-action-arrow" />
            </Link>
            <button
              type="button"
              onClick={onBook}
              className={`btn-hero-action btn-ghost ss-hero-cta ${activeAction === 'book' ? 'is-active' : ''}`}
              onMouseEnter={() => setActiveAction('book')}
              onFocus={() => setActiveAction('book')}
              data-magnetic
            >
              {activeAction === 'book' && (
                <motion.span
                  layoutId="hero-action-lens"
                  className="hero-action-lens"
                  aria-hidden="true"
                  transition={{ type: 'spring', stiffness: 480, damping: 36, mass: 0.65 }}
                />
              )}
              <span className="hero-action-label">Book counselling</span>
            </button>
          </div>
        </motion.div>
        <div className="eclipse-foot desktop-only-foot">
          <ol className="eclipse-path" aria-label="A connected learning path">
            {heroSteps.map((step, index) => <li key={step.title} style={{ '--i': index } as CSSProperties}>
              <h2>{step.title}</h2>
              <p>{step.text}</p>
            </li>)}
          </ol>
          <a href="#home-stack" className="scroll-cue" aria-label="Scroll to the learning stack"><span className="scroll-cue-track"><span/></span><ArrowDown size={14} aria-hidden="true"/></a>
        </div>
      </div>
    </section>
    <section className="hero-steps-band stage mobile-only-foot" aria-label="A connected learning path">
      <div className="container">
        <ol className="eclipse-path">
          {heroSteps.map((step, index) => <li key={step.title} style={{ '--i': index } as CSSProperties}>
            <h2>{step.title}</h2>
            <p>{step.text}</p>
          </li>)}
        </ol>
      </div>
    </section>
  </>;
}

export function TechMarquee() {
  const stack = ['Python', 'Django', 'React', 'PostgreSQL', 'Docker', 'Git', 'REST APIs', 'JavaScript', 'CI/CD', 'Testing'];
  const ideas = ['Understand', 'Practise', 'Build', 'Refine', 'Prepare', 'Ship', 'Iterate'];
  // Two tapes cross over the seam where the dark hero meets the page, running in opposite directions.
  return <section className="tape-band" aria-label="Technologies across the programme">
    <VelocityTape className="tape-ink" items={stack} speed={2.2}/>
    <VelocityTape className="tape-ice" items={ideas} speed={-2.8}/>
  </section>;
}

/** The programme at a glance, as one statement in large type rather than a row of number cards. */
export function StatsBand() {
  return <section className="container glance" aria-label="Programme at a glance">
    <p className="glance-statement"><strong><CountUp value={7}/> months</strong> from first principles to full stack, across <strong><CountUp value={courses.length}/> learning areas</strong>. Choose from <strong><CountUp value={detailedProgrammes.length}/> programmes and tracks</strong> and <strong><CountUp value={packages.length}/> master packages</strong>.</p>
  </section>;
}

const layers = [
  { icon: MonitorSmartphone, title: 'The interface', stack: 'HTML · CSS · JavaScript · React', text: 'Semantic, accessible, responsive interfaces built with modern React patterns.' },
  { icon: Server, title: 'The logic', stack: 'Python · Django · REST APIs', text: 'Server-side systems, authentication and clean API contracts that hold the product together.' },
  { icon: Database, title: 'The data', stack: 'SQL · PostgreSQL', text: 'Model real domains, write efficient queries and keep data consistent under load.' },
  { icon: Rocket, title: 'The delivery', stack: 'Git · Testing · Docker · Deployment', text: 'Version, test, containerise and ship — the habits that turn code into a running service.' },
];

/** Isometric plates start fused and separate into four labelled layers on scroll. */
export function ExplodedStack() {
  const section = useRef<HTMLElement>(null);
  const { enabled } = useSiteMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 });
  const active = useActiveIndex(scrollYProgress, layers.length);
  // Phones get a shorter explode distance so the raised plates stay below the header.
  const maxSpread = useRef(92);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 899px)');
    const update = () => { maxSpread.current = query.matches ? 52 : 92; };
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const spread = useTransform(progress, value => 10 + Math.min(1, value / 0.35) * (maxSpread.current - 10));
  const turn = useTransform(progress, [0, 1], [-48, -28]);
  const tilt = useTransform(progress, [0, 1], [62, 54]);
  return <section id="home-stack" ref={section} className={`exploded ${enabled ? 'is-live' : 'is-static'}`} aria-labelledby="stack-title">
    <div className="exploded-sticky">
      <div className="container exploded-grid">
        <div className="exploded-copy">
          <h2 id="stack-title" className="display-title">Four layers. One engineer.</h2>
          <p className="exploded-lede">{programme.description}</p>
          <ol className="layer-list">
            {layers.map((layer, index) => <li key={layer.title} data-active={index === active || !enabled}>
              <div><h3>{layer.title}</h3><p className="layer-stack">{layer.stack}</p><p className="layer-text">{layer.text}</p></div>
            </li>)}
          </ol>
        </div>
        <div className="exploded-stage" aria-hidden="true">
          <motion.div className="iso-scene" style={enabled ? { rotateX: tilt, rotateZ: turn } : undefined}>
            {layers.map((layer, index) => <IsoPlate key={layer.title} level={layers.length - 1 - index} spread={spread} active={index === active} enabled={enabled} layer={layer}/>)}
            <div className="iso-shadow"/>
          </motion.div>
        </div>
      </div>
    </div>
  </section>;
}
function IsoPlate({ level, spread, active, enabled, layer }: { level: number; spread: MotionValue<number>; active: boolean; enabled: boolean; layer: typeof layers[number] }) {
  const z = useTransform(spread, value => value * level);
  const Icon = layer.icon;
  return <motion.div className="iso-plate" data-active={active} style={enabled ? { z } : { transform: `translateZ(${level * 70}px)` }}>
    <div className="iso-plate-face">
      <Icon size={40} strokeWidth={1.4}/>
      <span className="iso-plate-label">{layer.title.replace('The ', 'the ')}</span>
    </div>
  </motion.div>;
}

/** Every programme as one line of a typeset index: the name large, then its kind, length and fee. */
export function ProgrammeIndex() {
  return <section className="container programme-index" aria-labelledby="index-title">
    <div className="index-head">
      <h2 id="index-title" className="display-title">{detailedProgrammes.length} ways in. One direction.</h2>
      <Link to="/programmes" className="text-link">See the full catalogue<ArrowUpRight size={17} aria-hidden="true"/></Link>
    </div>
    <ul className="index-list">
      {detailedProgrammes.map(item => <li key={item.id} className={item.isFlagship ? 'is-flagship' : undefined}>
        <Link to={item.slug} className="index-row">
          <span className="index-name">{item.name}</span>
          <span className="index-kind">{item.badge}</span>
          <span className="index-meta"><Clock3 size={16} aria-hidden="true"/>{item.duration}</span>
          <span className="index-fee">{item.feeDisplay}</span>
          <ArrowUpRight className="index-arrow" size={22} aria-hidden="true"/>
        </Link>
      </li>)}
    </ul>
  </section>;
}

export function JourneyDeck() {
  return <section className="container journey-deck-section" aria-labelledby="deck-title">
    <div className="deck-head">
      <h2 id="deck-title" className="display-title">How the learning works.</h2>
      <Link to="/learning-experience" className="text-link">Explore the learning experience<ArrowUpRight size={17} aria-hidden="true"/></Link>
    </div>
    <StackDeck>
      {journey.map(stage => <article key={stage.title} className="deck-card">
        <h3>{stage.title}</h3>
        <p>{stage.text}</p>
      </article>)}
    </StackDeck>
  </section>;
}
