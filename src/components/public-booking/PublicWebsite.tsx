import { ArrowUpRight, CalendarDays, Code2, Layers3, Orbit, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { BookingApi, Programme } from './types';
import { ProgrammeShowcase } from './ProgrammeShowcase';
import { BookingJourney } from './BookingJourney';
import { useBookingJourney } from './useBookingJourney';
import './public-booking.css';
import { PaletteMenu } from '../PaletteMenu';

export interface PublicWebsiteProps {
  api: BookingApi;
  /** Optional CMS snapshot for SSR; refreshed through getProgrammes on mount. */
  initialProgrammes?: Programme[];
  academyName?: string;
  initialTimeZone?: string;
  startAtBooking?: boolean;
  initialPackageId?: string;
}
const emptyProgrammes: Programme[] = [];
const subscribeHydration = () => () => {};
const clientIsInteractive = () => true;
const serverIsInteractive = () => false;
function validTimeZone(value: string): string { try { new Intl.DateTimeFormat('en', { timeZone: value }); return value; } catch { return 'Asia/Kolkata'; } }

export function PublicWebsite({ api, initialProgrammes = emptyProgrammes, academyName = 'Shadow Sphere', initialTimeZone = 'Asia/Kolkata', startAtBooking = false, initialPackageId }: PublicWebsiteProps) {
  const [catalogue, setCatalogue] = useState<{ programmes: Programme[]; status: 'loading' | 'ready' | 'error'; error: string }>({ programmes: initialProgrammes, status: initialProgrammes.length ? 'ready' : 'loading', error: '' });
  const [revision, setRevision] = useState(0);
  const [timeZone, setTimeZone] = useState(() => validTimeZone(initialTimeZone));
  const interactive = useSyncExternalStore(subscribeHydration, clientIsInteractive, serverIsInteractive);
  const journey = useBookingJourney(api, catalogue.programmes, timeZone);
  const updateAbout = journey.updateAbout;
  const initialConfiguration = useRef({ initialPackageId, initialProgrammes, startAtBooking });
  useEffect(() => {
    const configuration = initialConfiguration.current;
    if (configuration.initialPackageId) {
      const programme = configuration.initialProgrammes.find(item => item.packages.some(tier => tier.id === configuration.initialPackageId));
      if (programme) updateAbout({ programmeId: programme.id, packageId: configuration.initialPackageId });
    }
    const frame = configuration.startAtBooking ? requestAnimationFrame(() => document.getElementById('ss-booking')?.scrollIntoView({ behavior: 'instant' })) : 0;
    return () => cancelAnimationFrame(frame);
  }, [updateAbout]);
  useEffect(() => {
    const controller = new AbortController();
    setCatalogue(previous => ({ ...previous, status: previous.programmes.length ? 'ready' : 'loading', error: '' }));
    api.getProgrammes(controller.signal).then(programmes => {
      if (!controller.signal.aborted) setCatalogue({ programmes, status: 'ready', error: '' });
    }).catch(() => {
      if (!controller.signal.aborted) setCatalogue(previous => ({ ...previous, status: previous.programmes.length ? 'ready' : 'error', error: previous.programmes.length ? 'We could not refresh programme information. The last published details are shown below.' : 'We could not load programmes. Please try again.' }));
    });
    return () => controller.abort();
  }, [api, revision]);

  function goToBooking(programmeId?: string, packageId = '', addonIds: string[] = []) {
    if (programmeId && journey.state.step === 'about') journey.updateAbout({ programmeId, packageId, addonIds: [...addonIds] });
    document.getElementById('ss-booking')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }

  return <div className="ss-public min-h-screen bg-white font-sans text-slate-900">
    <a href="#ss-main" className="ss-skip-link">Skip to content</a>
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl"><nav aria-label="Primary navigation" className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-x-1 gap-y-2 px-4 py-3 sm:px-8"><a href="#ss-main" aria-label={`${academyName} home`} className="flex min-w-0 items-center gap-2.5"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white"><Orbit size={23} aria-hidden="true"/></span><span className="min-w-0"><span className="block text-xs font-bold tracking-tight text-slate-950 sm:text-lg">{academyName}</span><span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600 sm:text-[10px]">Technical Academy</span></span></a><div className="flex items-center gap-1 sm:gap-4"><PaletteMenu/><a href="#ss-programmes" aria-label="Explore programmes" title="Programmes" className="ss-header-link inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-slate-700"><Layers3 size={19} aria-hidden="true" className="sm:hidden"/><span className="hidden sm:inline">Programmes</span></a><button type="button" aria-label="Book a counselling call" title="Book a call" onClick={() => goToBooking()} className="ss-header-cta inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-800 sm:px-5 sm:text-sm"><CalendarDays size={19} aria-hidden="true" className="sm:hidden"/><span className="hidden sm:inline">Book a call</span><ArrowUpRight size={16} aria-hidden="true" className="hidden sm:block"/></button></div></nav></header>
    <main id="ss-main" tabIndex={-1} className="pt-20">
      <section aria-labelledby="ss-hero-title" className="ss-section relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white"><div className="pointer-events-none absolute -right-32 -top-32 size-[500px] rounded-full bg-indigo-600/20 blur-3xl" aria-hidden="true"/><div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:py-28"><div><span className="inline-flex items-center gap-2 rounded-full border border-indigo-300/30 bg-indigo-300/10 px-3 py-1.5 text-xs font-medium text-indigo-100"><Sparkles size={13} aria-hidden="true"/>LEARN. BUILD. EVOLVE.</span><h1 id="ss-hero-title" tabIndex={-1} className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">Build the skills.<br/><span className="text-indigo-200">Shape your next chapter.</span></h1><p className="ss-copy mt-6 max-w-xl text-base leading-relaxed text-slate-300">Explore technical programmes with transparent fees and a clear learning path. Start with a conversation about where you are and where you want to go.</p><div className="mt-8 flex flex-wrap gap-3"><a href="#ss-programmes" className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950">Explore programmes<ArrowUpRight size={17} aria-hidden="true"/></a><button type="button" onClick={() => goToBooking()} className="ss-hero-cta min-h-12 rounded-xl border border-slate-600 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">Book counselling</button></div></div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6 sm:p-8"><div className="mb-6 flex items-center justify-between gap-3 border-b border-slate-700 pb-5"><span className="text-xs font-medium uppercase tracking-widest text-slate-300">A connected learning path</span><Code2 size={22} className="text-indigo-300" aria-hidden="true"/></div>{[{ title: 'Find your direction', text: 'Explore programmes and compare package inclusions.' }, { title: 'Plan a conversation', text: 'Verify your email and choose an available time.' }, { title: 'Bring your goals', text: 'Share your background and prepare for counselling.' }].map((item, index) => <div key={item.title} className="flex items-start gap-4 py-4"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-600 font-mono text-xs text-indigo-200">0{index + 1}</span><div><h2 className="text-base font-semibold text-white">{item.title}</h2><p className="ss-copy mt-1.5 text-sm leading-relaxed text-slate-300">{item.text}</p></div></div>)}<div className="mt-4 flex items-center gap-2 border-t border-slate-700 pt-5 text-xs text-slate-300"><Layers3 size={15} aria-hidden="true"/>From understanding to implementation.</div></div>
      </div></section>
      {catalogue.error && catalogue.status === 'ready' && <div role="status" className="mx-auto mt-8 max-w-7xl px-5 text-sm text-amber-900 sm:px-8"><div className="rounded-xl border border-amber-200 bg-amber-50 p-4">{catalogue.error} <button type="button" className="ml-2 min-h-8 font-semibold underline" onClick={() => setRevision(value => value + 1)}>Retry refresh</button></div></div>}
      <ProgrammeShowcase {...catalogue} onRetry={() => setRevision(value => value + 1)} onBook={goToBooking} bookingStarted={journey.state.step !== 'about'}/>
      <BookingJourney journey={journey} programmes={catalogue.programmes} timeZone={timeZone} onTimeZone={setTimeZone} interactive={interactive}/>
    </main>
    <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-xs text-slate-600 sm:px-8"><span>{academyName} · Technical Academy</span><div className="flex gap-5"><a href="/privacy-policy" className="min-h-8 content-center hover:text-indigo-700">Privacy notice</a><a href="/terms-and-conditions" className="min-h-8 content-center hover:text-indigo-700">Terms</a></div></footer>
  </div>;
}
