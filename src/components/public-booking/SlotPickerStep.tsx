import { CalendarDays, Globe2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Slot } from './types';
import { dateKey, groupSlots } from './validation';
import { ActionButton, ErrorNotice, inputClass, Skeleton } from './ui';

export const bookingTimeZones = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney', 'UTC'];

export function SlotPickerStep({ slots, status, error, busy, timeZone, onTimeZone, onSelect, onRetry, onBack }: {
  slots: Slot[]; status: 'idle' | 'loading' | 'ready' | 'error'; error: string; busy: boolean; timeZone: string;
  onTimeZone: (zone: string) => void; onSelect: (slotId: string) => void; onRetry: () => void; onBack: () => void;
}) {
  const [selectedDay, setSelectedDay] = useState('');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(timer); }, []);
  // Dates are derived from UTC instants in the chosen zone, including DST changes.
  const groups = groupSlots(slots.filter(slot => Date.parse(slot.startsAt) > now), timeZone);
  const days = [...groups.keys()];
  const activeDay = days.includes(selectedDay) ? selectedDay : days[0];
  const zones = [...new Set([timeZone, ...bookingTimeZones])];
  return <div className="space-y-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"><Globe2 size={17} aria-hidden="true"/>All times shown in</span><label className="sm:max-w-64"><span className="sr-only">Time zone</span><select aria-label="Time zone" className={inputClass} value={timeZone} disabled={busy} onChange={event => { setSelectedDay(''); onTimeZone(event.target.value); }}>{zones.map(zone => <option key={zone} value={zone}>{zone.replaceAll('_', ' ')}</option>)}</select></label></div>
    {status === 'loading' || status === 'idle' ? <Skeleton label="Loading available counselling sessions"/> : status === 'error' ? <div className="space-y-4"><ErrorNotice>{error}</ErrorNotice><ActionButton secondary onClick={onRetry}>Retry availability</ActionButton></div> : days.length === 0 ? <div role="status" className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><CalendarDays size={28} className="mx-auto mb-3 text-slate-500" aria-hidden="true"/><h3 className="text-lg font-semibold text-slate-900">No available sessions right now.</h3><p className="ss-copy mt-2 text-sm text-slate-600">Please check again for newly released times.</p><ActionButton secondary className="mt-5" onClick={() => { setNow(Date.now()); onRetry(); }}>Refresh availability</ActionButton></div> : <>
      <div className="flex gap-2 overflow-x-auto pb-3" role="group" aria-label="Available dates">{days.map(day => { const slot = groups.get(day)![0]; return <button key={day} type="button" disabled={busy} aria-pressed={day === activeDay} onClick={() => setSelectedDay(day)} className={`ss-date-button min-w-24 shrink-0 rounded-xl border px-4 py-3 text-center disabled:opacity-50 ${day === activeDay ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-500'}`}><span className="block text-xs">{new Intl.DateTimeFormat('en-IN', { timeZone, weekday: 'short' }).format(new Date(slot.startsAt))}</span><span className="mt-1 block text-lg font-semibold">{new Intl.DateTimeFormat('en-IN', { timeZone, day: 'numeric', month: 'short' }).format(new Date(slot.startsAt))}</span></button>; })}</div>
      <fieldset disabled={busy}><legend className="mb-3 text-sm font-semibold text-slate-800">Choose a session time</legend><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{(groups.get(activeDay) ?? []).map(slot => <button key={slot.id} type="button" onClick={() => onSelect(slot.id)} aria-label={`Book ${new Intl.DateTimeFormat('en-IN', { timeZone, dateStyle: 'full', timeStyle: 'short' }).format(new Date(slot.startsAt))}`} className="ss-slot-button rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-4 text-sm font-semibold text-indigo-800 hover:border-indigo-700 hover:bg-indigo-100 disabled:cursor-wait disabled:opacity-50">{new Intl.DateTimeFormat('en-IN', { timeZone, hour: 'numeric', minute: '2-digit' }).format(new Date(slot.startsAt))}<span className="mt-1 block text-xs font-normal">{Math.round((Date.parse(slot.endsAt) - Date.parse(slot.startsAt)) / 60000)} min</span></button>)}</div></fieldset>
      <p role="status" className="ss-copy text-xs leading-relaxed text-slate-600">{busy ? 'Reserving your selected time…' : `Choose a time to create a temporary hold. Today in this time zone is ${dateKey(new Date(), timeZone)}.`}</p>
    </>}
    <button type="button" disabled={busy} onClick={onBack} className="ss-text-button min-h-12 rounded-lg px-3 text-sm font-medium text-indigo-700 disabled:opacity-50">Back to your details</button>
  </div>;
}
