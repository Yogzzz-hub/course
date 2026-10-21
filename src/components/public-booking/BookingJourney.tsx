import { CalendarCheck2, Check, ChevronRight, LockKeyhole } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Programme } from './types';
import type { BookingJourneyController } from './useBookingJourney';
import { AboutYouStep } from './AboutYouStep';
import { VerificationStep } from './VerificationStep';
import { SlotPickerStep } from './SlotPickerStep';
import { PreSessionBriefStep } from './PreSessionBriefStep';
import { ActionButton, ErrorNotice } from './ui';
import { feeTotal, formatMoney, formatSlot } from './validation';
import { track } from '../../analytics/events';

const steps = [
  { id: 'about', label: 'About you', title: 'Let’s start with you.', description: 'A few details to help us understand your starting point.' },
  { id: 'verify', label: 'Verify email', title: 'Check your inbox.', description: 'Verify your email before choosing a counselling session.' },
  { id: 'slots', label: 'Choose a time', title: 'Make space for your next step.', description: 'Find a session that works for your schedule.' },
  { id: 'brief', label: 'Session brief', title: 'A little context goes a long way.', description: 'Help your counsellor prepare for a useful conversation.' },
] as const;

export function BookingJourney({ journey, programmes, timeZone, onTimeZone, interactive }: { journey: BookingJourneyController; programmes: Programme[]; timeZone: string; onTimeZone: (zone: string) => void; interactive: boolean }) {
  const { state } = journey;
  const index = state.step === 'complete' ? 4 : steps.findIndex(step => step.id === state.step);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(state.step);
  useEffect(() => {
    if (previousStep.current !== state.step) heading.current?.focus({ preventScroll: true });
    previousStep.current = state.step;
  }, [state.step]);
  const selected = programmes.find(programme => programme.id === state.about.programmeId);
  const total = selected ? feeTotal(selected, state.about.packageId, state.about.addonIds) : null;
  const displayPrice = total !== null ? total : (selected?.packages[0]?.priceMinor ?? null);
  const busy = state.busy !== null;
  return <section id="ss-booking" aria-labelledby="ss-booking-title" className="ss-section border-y border-slate-200 bg-slate-50">
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-12"><h2 id="ss-booking-title" className="display-title">Book your counselling session.</h2>
      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="booking-shell min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <ol aria-label="Booking progress" className="booking-steps mb-8 grid grid-cols-2 gap-3 border-b border-slate-200 pb-7 sm:grid-cols-4">{steps.map((step, stepIndex) => <li key={step.id} aria-current={stepIndex === index ? 'step' : undefined} className="flex min-w-0 items-center gap-2.5"><span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${stepIndex <= index ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'}`}>{stepIndex < index ? <Check size={14} aria-label="Completed"/> : stepIndex + 1}</span><span className={`text-xs font-medium leading-snug ${stepIndex === index ? 'text-indigo-800' : 'text-slate-600'}`}>{step.label}</span></li>)}</ol>
          {state.step === 'complete' && state.receipt ? <div role="status" className="space-y-5"><span className="inline-flex rounded-full bg-emerald-100 p-4 text-emerald-800"><CalendarCheck2 size={30} aria-hidden="true"/></span><h3 ref={heading} tabIndex={-1} className="text-2xl font-semibold text-slate-950">Your counselling session is confirmed.</h3><p className="ss-copy text-sm leading-relaxed text-slate-700">{formatSlot(state.receipt.slot, timeZone)} · {timeZone.replaceAll('_', ' ')}</p><dl className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm"><div><dt className="text-slate-600">Booking reference</dt><dd className="mt-1 break-all font-semibold text-slate-950">{state.receipt.bookingId}</dd></div><div><dt className="text-slate-600">Email</dt><dd className="mt-1 break-all text-slate-950">{state.receipt.email}</dd></div></dl><p className="ss-copy text-xs text-slate-600">Keep this reference for any questions about your session.</p><ActionButton secondary onClick={journey.reset}>Book another session</ActionButton></div> : <>
            <div className="mb-7"><h3 ref={heading} tabIndex={-1} className="text-2xl font-semibold tracking-tight text-slate-950">{steps[index].title}</h3><p className="ss-copy mt-2 text-sm leading-relaxed text-slate-600">{steps[index].description}</p></div>
            {state.error && <div className="mb-5"><ErrorNotice>{state.error}</ErrorNotice></div>}
            {state.step === 'about' && <AboutYouStep value={state.about} programmes={programmes} errors={state.errors} busy={busy} interactive={interactive} onChange={journey.updateAbout} onSubmit={() => { track('counselling_requested', { programme: state.about.programmeId || 'none' }); void journey.sendCode(); }}/>}
            {state.step === 'verify' && state.challenge && <VerificationStep key={state.challenge.challengeId} email={state.about.email} secondsRemaining={journey.challengeSeconds} resendSeconds={journey.resendSeconds} busy={busy} onVerify={code => void journey.verifyCode(code)} onResend={() => void journey.sendCode()} onBack={journey.back}/>}
            {state.step === 'slots' && <SlotPickerStep {...journey.availability} busy={busy} timeZone={timeZone} onTimeZone={onTimeZone} onSelect={id => void journey.holdSlot(id)} onRetry={journey.refreshSlots} onBack={journey.back}/>}
            {state.step === 'brief' && state.hold && <PreSessionBriefStep value={state.brief} hold={state.hold} holdSeconds={journey.holdSeconds} timeZone={timeZone} errors={state.errors} busy={busy} unresolved={!!state.pendingSubmission} onChange={journey.updateBrief} onConfirm={() => void journey.confirmBooking()} onCheckStatus={() => void journey.checkBookingStatus()} onBack={journey.back}/>}
          </>}
        </div>
        <aside aria-label="Counselling details" className="space-y-5 lg:sticky lg:top-28"><div className="booking-aside-stage rounded-2xl bg-slate-950 p-7 text-white"><span className="text-sm font-medium text-indigo-200">Your next chapter</span><h3 className="mt-4 text-xl font-semibold tracking-tight">Clarity before you enrol.</h3><ul className="mt-6 space-y-4 text-sm text-slate-200">{['Discuss your background and goals', 'Understand the curriculum and fees', 'Explore the right learning path'].map(text => <li key={text} className="flex items-start gap-2"><ChevronRight size={16} className="mt-0.5 shrink-0 text-indigo-300" aria-hidden="true"/>{text}</li>)}</ul></div>
          {selected ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <span className="text-sm font-semibold text-slate-600">Programme of interest</span>
              <h3 className="mt-3 text-lg font-semibold text-slate-950">{selected.title}</h3>
              <p className="ss-copy mt-2 text-sm text-slate-600">{selected.duration}</p>
              {displayPrice !== null && (
                <>
                  <p className="ss-copy mt-5 text-xs text-slate-600">{total !== null ? 'Listed package + selected extras' : 'Listed package fee'}</p>
                  <span className="mt-1 block text-2xl font-semibold text-slate-950">{formatMoney(displayPrice, selected.currency)}</span>
                </>
              )}
              <p className="ss-copy mt-4 text-xs leading-relaxed text-slate-600">Programme fees are separate from booking a counselling session. No payment is collected in this journey.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <span className="text-sm font-semibold text-slate-600">Programme of interest</span>
              <h3 className="mt-3 text-base font-medium text-slate-800">Select a programme</h3>
              <p className="ss-copy mt-2 text-sm text-slate-500">Choose a programme in the form to see its duration, package options and curriculum fee details here.</p>
            </div>
          )}
          <p className="ss-copy flex items-start gap-2 px-1 text-xs leading-relaxed text-slate-600"><LockKeyhole size={15} className="mt-0.5 shrink-0" aria-hidden="true"/>Verification and slot availability are checked with the booking service.</p>
        </aside>
      </div>
    </div>
  </section>;
}
