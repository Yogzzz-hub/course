import type { AboutYou, Programme } from './types';
import type { FieldErrors } from './validation';
import { ActionButton, Field, fieldAccessibility, inputClass } from './ui';

export function AboutYouStep({ value, programmes, errors, busy, interactive, onChange, onSubmit }: {
  value: AboutYou; programmes: Programme[]; errors: FieldErrors<AboutYou>; busy: boolean; interactive: boolean;
  onChange: (patch: Partial<AboutYou>) => void; onSubmit: () => void;
}) {
  const programme = programmes.find(item => item.id === value.programmeId);
  return <form noValidate method="post" onSubmit={event => { event.preventDefault(); if (interactive) onSubmit(); }}>
    <fieldset disabled={busy || !interactive} className="space-y-5"><legend className="sr-only">About you</legend>
      <div className="grid gap-5 sm:grid-cols-2"><Field name="name" label="Full name" error={errors.name}><input {...fieldAccessibility('name', errors.name)} className={inputClass} name="name" autoComplete="name" required maxLength={100} value={value.name} onChange={event => onChange({ name: event.target.value })}/></Field><Field name="email" label="Email address" error={errors.email}><input {...fieldAccessibility('email', errors.email)} className={inputClass} name="email" type="email" autoComplete="email" required maxLength={254} value={value.email} onChange={event => onChange({ email: event.target.value })}/></Field></div>
      <div className="grid gap-5 sm:grid-cols-2"><Field name="phone" label="Phone number" error={errors.phone} hint="Include your country code."><input {...fieldAccessibility('phone', errors.phone, true)} className={inputClass} name="phone" type="tel" autoComplete="tel" required maxLength={25} value={value.phone} onChange={event => onChange({ phone: event.target.value })}/></Field><Field name="currentStatus" label="Current status" error={errors.currentStatus}><select {...fieldAccessibility('currentStatus', errors.currentStatus)} className={inputClass} required value={value.currentStatus} onChange={event => onChange({ currentStatus: event.target.value as AboutYou['currentStatus'] })}><option value="">Select your current status</option><option value="student">Student</option><option value="graduate">Recent graduate</option><option value="employed">Working professional</option><option value="career-change">Exploring a career change</option></select></Field></div>
      <Field name="programmeId" label="Programme of interest" error={errors.programmeId}><select {...fieldAccessibility('programmeId', errors.programmeId)} className={inputClass} value={value.programmeId} required onChange={event => onChange({ programmeId: event.target.value, packageId: '', addonIds: [] })}><option value="">Select a programme</option>{programmes.map(programme => <option key={programme.id} value={programme.id}>{programme.title}</option>)}</select></Field>
      {programme && programme.packages.length > 0 && <Field name="packageId" label="Package to discuss (optional)" error={errors.packageId}><select {...fieldAccessibility('packageId', errors.packageId)} className={inputClass} value={value.packageId} onChange={event => onChange({ packageId: event.target.value })}><option value="">Help me choose a package</option>{programme.packages.map(tier => <option key={tier.id} value={tier.id}>{tier.name}</option>)}</select></Field>}
      {value.addonIds.length > 0 && <p className="ss-copy text-xs text-slate-600">Selected extras: {programme?.addons.filter(addon => value.addonIds.includes(addon.id)).map(addon => addon.title).join(', ')}.</p>}
      <p className="ss-copy text-xs leading-relaxed text-slate-600">We use these details to verify your email and arrange your counselling session. <a href="/privacy-policy" className="font-medium text-indigo-700 underline underline-offset-4">Read the privacy notice</a>.</p>
      <ActionButton type="submit" busy={busy} disabled={programmes.length === 0} className="w-full sm:w-auto">{busy ? 'Sending verification code…' : 'Continue to verification'}</ActionButton>
    </fieldset>
  </form>;
}
