import { Clock3, ShieldCheck } from 'lucide-react';
import type { PreSessionBrief, SlotHold } from './types';
import { dateKey, formatSlot, type FieldErrors } from './validation';
import { ActionButton, Field, fieldAccessibility, inputClass } from './ui';

export function PreSessionBriefStep({ value, hold, holdSeconds, timeZone, errors, busy, unresolved, onChange, onConfirm, onCheckStatus, onBack }: {
  value: PreSessionBrief; hold: SlotHold; holdSeconds: number; timeZone: string; errors: FieldErrors<PreSessionBrief>; busy: boolean; unresolved: boolean;
  onChange: (patch: Partial<PreSessionBrief>) => void; onConfirm: () => void; onCheckStatus: () => void; onBack: () => void;
}) {
  const locked = busy || unresolved;
  return <div className="space-y-6"><div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-950">{formatSlot(hold.slot, timeZone)}</span><span role="timer" aria-label="Time remaining on your slot hold" className={`inline-flex items-center gap-2 rounded-lg px-2 py-1 font-mono text-sm font-semibold ${holdSeconds <= 60 ? 'bg-amber-100 text-amber-900' : 'bg-white text-indigo-800'}`}><Clock3 size={15} aria-hidden="true"/>{Math.floor(holdSeconds / 60)}:{String(holdSeconds % 60).padStart(2, '0')}</span></div><p className="ss-copy mt-2 text-xs text-slate-600">{timeZone.replaceAll('_', ' ')} · Temporary hold; your session is confirmed after booking succeeds.</p></div>
    <form noValidate method="post" onSubmit={event => { event.preventDefault(); if (unresolved) onCheckStatus(); else onConfirm(); }}>
      <fieldset disabled={locked} className="space-y-5"><legend className="sr-only">Your pre-session brief</legend>
        <Field name="background" label="Your technical background" error={errors.background}><select {...fieldAccessibility('background', errors.background)} className={inputClass} value={value.background} required onChange={event => onChange({ background: event.target.value as PreSessionBrief['background'] })}><option value="">Select your background</option><option value="beginner">Starting from the basics</option><option value="some-experience">Some programming experience</option><option value="experienced">Experienced developer</option></select></Field>
        <Field name="goals" label="What would you like to achieve?" error={errors.goals} hint="Tell us about the skills, projects, or career direction you want to explore."><textarea {...fieldAccessibility('goals', errors.goals, true)} className={inputClass} rows={4} minLength={10} maxLength={2000} required value={value.goals} onChange={event => onChange({ goals: event.target.value })}/></Field>
        <div className="grid gap-5 sm:grid-cols-2"><Field name="weeklyHours" label="Weekly learning time (hours)" error={errors.weeklyHours}><input {...fieldAccessibility('weeklyHours', errors.weeklyHours)} className={inputClass} type="number" inputMode="numeric" min={1} max={80} step={1} required value={value.weeklyHours} onChange={event => onChange({ weeklyHours: event.target.value })}/></Field><Field name="preferredStartDate" label="Preferred programme start date" error={errors.preferredStartDate}><input {...fieldAccessibility('preferredStartDate', errors.preferredStartDate)} className={inputClass} type="date" min={dateKey(new Date(), timeZone)} required value={value.preferredStartDate} onChange={event => onChange({ preferredStartDate: event.target.value })}/></Field></div>
      </fieldset>
      {unresolved && !busy && <div role="status" className="my-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">Your booking result needs verification. Check its status before changing details or selecting another slot.</div>}
      <div className="mt-6 flex flex-wrap gap-3"><ActionButton type="submit" busy={busy} disabled={!unresolved && holdSeconds === 0}>{busy ? 'Please wait…' : unresolved ? 'Check booking status' : 'Confirm counselling session'}</ActionButton><ActionButton type="button" secondary disabled={locked} onClick={onBack}>Choose another time</ActionButton></div>
      <p className="ss-copy mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-600"><ShieldCheck size={15} className="mt-0.5 shrink-0" aria-hidden="true"/>Your start date is a preference to discuss, not an enrolment commitment.</p>
    </form>
  </div>;
}
