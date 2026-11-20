import type { AboutYou, PreSessionBrief, Programme, Slot } from './types';

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function validateAbout(about: AboutYou, programmes: Programme[]): FieldErrors<AboutYou> {
  const errors: FieldErrors<AboutYou> = {};
  if (about.name.trim().length < 2 || about.name.trim().length > 100) errors.name = 'Enter your name (2–100 characters).';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(about.email.trim()) || about.email.trim().length > 254) errors.email = 'Enter a valid email address.';
  if (!/^[+\d\s()-]{7,25}$/.test(about.phone.trim()) || about.phone.replace(/\D/g, '').length < 7) errors.phone = 'Enter a valid phone number, including country code.';
  if (!['student', 'graduate', 'employed', 'career-change'].includes(about.currentStatus)) errors.currentStatus = 'Choose your current status.';
  const programme = programmes.find(item => item.id === about.programmeId);
  if (!programme) errors.programmeId = 'Choose an available programme.';
  if (about.packageId && !programme?.packages.some(item => item.id === about.packageId)) errors.packageId = 'Choose an available package.';
  if (new Set(about.addonIds).size !== about.addonIds.length || about.addonIds.some(id => !programme?.addons.some(item => item.id === id))) errors.addonIds = 'Review your selected extras.';
  return errors;
}

export function dateKey(date: string | Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(date));
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function validateBrief(brief: PreSessionBrief, today: string): FieldErrors<PreSessionBrief> {
  const errors: FieldErrors<PreSessionBrief> = {};
  if (!['beginner', 'some-experience', 'experienced'].includes(brief.background)) errors.background = 'Choose your background level.';
  if (brief.goals.trim().length < 10 || brief.goals.trim().length > 2000) errors.goals = 'Describe your goals in 10–2,000 characters.';
  const hours = Number(brief.weeklyHours);
  if (!brief.weeklyHours.trim() || !Number.isFinite(hours) || hours < 1 || hours > 80 || !Number.isInteger(hours)) errors.weeklyHours = 'Enter whole hours between 1 and 80.';
  const date = brief.preferredStartDate;
  const parsed = new Date(`${date}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < today) errors.preferredStartDate = 'Choose today or a future start date.';
  return errors;
}

export function feeTotal(programme: Programme, packageId: string, addonIds: string[]): number | null {
  const tier = programme.packages.find(item => item.id === packageId);
  if (!tier) return null;
  return tier.priceMinor + programme.addons.filter(item => addonIds.includes(item.id)).reduce((sum, item) => sum + item.priceMinor, 0);
}

export function formatMoney(minor: number, currency: string): string {
  const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency });
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  return formatter.format(minor / 10 ** digits);
}

export function groupSlots(slots: Slot[], timeZone: string): Map<string, Slot[]> {
  const groups = new Map<string, Slot[]>();
  [...slots].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)).forEach(slot => {
    const key = dateKey(slot.startsAt, timeZone);
    groups.set(key, [...(groups.get(key) ?? []), slot]);
  });
  return groups;
}

export function formatSlot(slot: Slot, timeZone: string): string {
  return new Intl.DateTimeFormat('en-IN', { timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(slot.startsAt));
}
