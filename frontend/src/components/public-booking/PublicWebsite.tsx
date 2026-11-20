import { useEffect, useState, useSyncExternalStore } from 'react';
import type { BookingApi, Programme } from './types';
import { ProgrammeShowcase } from './ProgrammeShowcase';
import { BookingJourney } from './BookingJourney';
import { useBookingJourney } from './useBookingJourney';
import './public-booking.css';
import { Footer, Header } from '../layout';
import { ExplodedStack, HomeHero, JourneyDeck, ProgrammeIndex, StatsBand, TechMarquee } from '../home/HomeSections';

export interface PublicWebsiteProps {
  api: BookingApi;
  /** Optional CMS snapshot for SSR; refreshed through getProgrammes on mount. */
  initialProgrammes?: Programme[];
  academyName?: string;
  initialTimeZone?: string;
  startAtBooking?: boolean;
  initialPackageId?: string;
  initialProgrammeId?: string;
}
const emptyProgrammes: Programme[] = [];
const subscribeHydration = () => () => {};
const clientIsInteractive = () => true;
const serverIsInteractive = () => false;
function validTimeZone(value: string): string { try { new Intl.DateTimeFormat('en', { timeZone: value }); return value; } catch { return 'Asia/Kolkata'; } }

export function PublicWebsite({
  api,
  initialProgrammes = emptyProgrammes,
  initialTimeZone = 'Asia/Kolkata',
  startAtBooking = false,
  initialPackageId,
  initialProgrammeId,
}: PublicWebsiteProps) {
  const [catalogue, setCatalogue] = useState<{ programmes: Programme[]; status: 'loading' | 'ready' | 'error'; error: string }>({ programmes: initialProgrammes, status: initialProgrammes.length ? 'ready' : 'loading', error: '' });
  const [revision, setRevision] = useState(0);
  const [timeZone, setTimeZone] = useState(() => validTimeZone(initialTimeZone));
  const interactive = useSyncExternalStore(subscribeHydration, clientIsInteractive, serverIsInteractive);
  const journey = useBookingJourney(api, catalogue.programmes, timeZone);
  const updateAbout = journey.updateAbout;

  useEffect(() => {
    const list = catalogue.programmes.length ? catalogue.programmes : initialProgrammes;
    if (initialProgrammeId) {
      const programme = list.find(item => item.id === initialProgrammeId);
      if (programme) {
        const pkg = initialPackageId && programme.packages.some(tier => tier.id === initialPackageId)
          ? initialPackageId
          : (programme.packages[0]?.id || '');
        updateAbout({ programmeId: programme.id, packageId: pkg });
      }
    } else if (initialPackageId) {
      const programme = list.find(item => item.packages.some(tier => tier.id === initialPackageId));
      if (programme) updateAbout({ programmeId: programme.id, packageId: initialPackageId });
    }
  }, [initialProgrammeId, initialPackageId, catalogue.programmes, initialProgrammes, updateAbout]);

  useEffect(() => {
    if (startAtBooking) {
      const frame = requestAnimationFrame(() => document.getElementById('ss-booking')?.scrollIntoView({ behavior: 'instant' }));
      return () => cancelAnimationFrame(frame);
    }
  }, [startAtBooking]);

  useEffect(() => {
    const controller = new AbortController();
    setCatalogue(previous => ({ ...previous, status: previous.programmes.length ? 'ready' : 'loading', error: '' }));
    api.getProgrammes(controller.signal).then(programmes => {
      if (!controller.signal.aborted) setCatalogue({ programmes, status: 'ready', error: '' });
    }).catch(() => {
      if (!controller.signal.aborted) setCatalogue(previous => ({ ...previous, status: previous.programmes.length ? 'ready' : 'error', error: previous.programmes.length ? '' : 'We could not load programmes. Please try again.' }));
    });
    return () => controller.abort();
  }, [api, revision]);

  function goToBooking(programmeId?: string, packageId = '', addonIds: string[] = []) {
    if (programmeId && journey.state.step === 'about') {
      const list = catalogue.programmes.length ? catalogue.programmes : initialProgrammes;
      const prog = list.find(p => p.id === programmeId);
      const pkg = packageId || prog?.packages[0]?.id || '';
      journey.updateAbout({ programmeId, packageId: pkg, addonIds: [...addonIds] });
    }
    document.getElementById('ss-booking')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }

  return <>
    <Header onBook={() => goToBooking()}/>
    <main id="main" tabIndex={-1} className="home-main">
      <HomeHero onBook={() => goToBooking()}/>
      <TechMarquee/>
      <StatsBand/>
      <ExplodedStack/>
      <ProgrammeIndex/>
      <JourneyDeck/>
      <section className="home-commerce" aria-labelledby="commerce-title">
        <div className="commerce-head container">
          <h2 id="commerce-title" className="display-title">Fees, packages and savings.</h2>
        </div>
        <div className="ss-public">
          {catalogue.error && catalogue.status === 'ready' && catalogue.programmes.length === 0 && <div role="status" className="mx-auto mt-8 max-w-7xl px-5 text-sm text-amber-900 sm:px-8"><div className="rounded-xl border border-amber-200 bg-amber-50 p-4">{catalogue.error} <button type="button" className="ml-2 min-h-8 font-semibold underline" onClick={() => setRevision(value => value + 1)}>Retry refresh</button></div></div>}
          <ProgrammeShowcase {...catalogue} onRetry={() => setRevision(value => value + 1)} onBook={goToBooking} bookingStarted={journey.state.step !== 'about'}/>
          <BookingJourney journey={journey} programmes={catalogue.programmes} timeZone={timeZone} onTimeZone={setTimeZone} interactive={interactive}/>
        </div>
      </section>
    </main>
    <Footer/>
  </>;
}
