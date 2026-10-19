import type { AboutYou, Programme } from './types';
import type { FieldErrors } from './validation';
import { ActionButton, AnimatedSelect, Field, fieldAccessibility, inputClass } from './ui';

export function AboutYouStep({ value, programmes, errors, busy, interactive, onChange, onSubmit }: {
  value: AboutYou; programmes: Programme[]; errors: FieldErrors<AboutYou>; busy: boolean; interactive: boolean;
  onChange: (patch: Partial<AboutYou>) => void; onSubmit: () => void;
}) {
  const programme = programmes.find(item => item.id === value.programmeId);
  return <form noValidate method="post" onSubmit={event => { event.preventDefault(); if (interactive) onSubmit(); }}>
    <fieldset disabled={busy || !interactive} className="space-y-5"><legend className="sr-only">About you</legend>
      <div className="grid gap-5 sm:grid-cols-2"><Field name="name" label="Full name" error={errors.name}><input {...fieldAccessibility('name', errors.name)} className={inputClass} name="name" autoComplete="name" required maxLength={100} value={value.name} onChange={event => onChange({ name: event.target.value })}/></Field><Field name="email" label="Email address" error={errors.email}><input {...fieldAccessibility('email', errors.email)} className={inputClass} name="email" type="email" autoComplete="email" required maxLength={254} value={value.email} onChange={event => onChange({ email: event.target.value })}/></Field></div>
      <div className="grid gap-5 sm:grid-cols-2"><Field name="phone" label="Phone number" error={errors.phone} hint="Include your country code."><input {...fieldAccessibility('phone', errors.phone, true)} className={inputClass} name="phone" type="tel" autoComplete="tel" required maxLength={25} value={value.phone} onChange={event => onChange({ phone: event.target.value })}/></Field><Field name="currentStatus" label="Current status" error={errors.currentStatus}><AnimatedSelect {...fieldAccessibility('currentStatus', errors.currentStatus)} name="currentStatus" required value={value.currentStatus} placeholder="Select your current status" options={[{ value: 'student', label: 'Student' }, { value: 'graduate', label: 'Recent graduate' }, { value: 'employed', label: 'Working professional' }, { value: 'career-change', label: 'Exploring a career change' }]} onChange={event => onChange({ currentStatus: event.target.value as AboutYou['currentStatus'] })}/></Field></div>
      <Field name="programmeId" label="Programme of interest" error={errors.programmeId}><AnimatedSelect {...fieldAccessibility('programmeId', errors.programmeId)} name="programmeId" value={value.programmeId} required placeholder="Select a programme" options={programmes.map(p => ({ value: p.id, label: p.title }))} onChange={event => {
        const nextProgId = event.target.value;
        const targetProg = programmes.find(p => p.id === nextProgId);
        const nextPkgId = targetProg?.packages.length === 1
          ? targetProg.packages[0].id
          : (targetProg?.packages.some(tier => tier.id === value.packageId) ? value.packageId : (targetProg?.packages[0]?.id || ''));
        onChange({ programmeId: nextProgId, packageId: nextPkgId, addonIds: [] });
      }}/></Field>
      {programme && programme.packages.length > 0 && <Field name="packageId" label="Package to discuss (optional)" error={errors.packageId}><AnimatedSelect {...fieldAccessibility('packageId', errors.packageId)} name="packageId" value={value.packageId} placeholder="Help me choose a package" options={programme.packages.map(tier => ({ value: tier.id, label: tier.name }))} onChange={event => onChange({ packageId: event.target.value })}/></Field>}
      {value.addonIds.length > 0 && <p className="ss-copy text-xs text-slate-600">Selected extras: {programme?.addons.filter(addon => value.addonIds.includes(addon.id)).map(addon => addon.title).join(', ')}.</p>}
      <p className="ss-copy text-xs leading-relaxed text-slate-600">We use these details to verify your email and arrange your counselling session. <a href="/privacy-policy" className="font-medium text-indigo-700 underline underline-offset-4">Read the privacy notice</a>.</p>
      <ActionButton type="submit" busy={busy} disabled={programmes.length === 0} className="w-full sm:w-auto">{busy ? 'Sending verification code…' : 'Continue to verification'}</ActionButton>
    </fieldset>
  </form>;
}
