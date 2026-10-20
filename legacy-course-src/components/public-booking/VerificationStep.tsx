import { MailCheck } from 'lucide-react';
import { useRef, useState } from 'react';
import { ActionButton, inputClass } from './ui';

export function VerificationStep({ email, busy, secondsRemaining, resendSeconds, onVerify, onResend, onBack }: {
  email: string; busy: boolean; secondsRemaining: number; resendSeconds: number;
  onVerify: (code: string) => void; onResend: () => void; onBack: () => void;
}) {
  const [code, setCode] = useState('');
  const input = useRef<HTMLInputElement>(null);
  return <div className="space-y-6"><div className="flex items-start gap-3 rounded-xl bg-indigo-50 p-4"><MailCheck size={23} className="mt-0.5 shrink-0 text-indigo-700" aria-hidden="true"/><p className="ss-copy break-words text-sm leading-relaxed text-slate-700">Enter the six-digit code sent to <strong className="text-slate-950">{email}</strong>.</p></div>
    <form noValidate method="post" onSubmit={event => { event.preventDefault(); onVerify(code); }} className="space-y-5"><label htmlFor="booking-otp" className="block text-sm font-semibold text-slate-800">Email verification code</label>
      <div className="relative max-w-sm rounded-xl focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-indigo-600" onClick={() => input.current?.focus()}>
        <div aria-hidden="true" className="grid grid-cols-6 gap-2">{Array.from({ length: 6 }, (_, index) => <span key={index} className={`flex h-14 items-center justify-center rounded-xl border font-mono text-2xl font-semibold ${code[index] ? 'border-indigo-500 bg-indigo-50 text-slate-950' : 'border-slate-300 bg-white text-slate-400'}`}>{code[index] || '–'}</span>)}</div>
        <input ref={input} id="booking-otp" name="one-time-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className={`${inputClass} absolute inset-0 h-full opacity-0`} required disabled={busy || secondsRemaining === 0} aria-describedby="booking-code-expiry" autoFocus/>
      </div><p id="booking-code-expiry" className="ss-copy text-xs text-slate-600">{secondsRemaining > 0 ? `Code expires in ${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, '0')}.` : 'This code expired. Request a new code to continue.'}</p>
      <ActionButton type="submit" busy={busy} disabled={code.length !== 6 || secondsRemaining === 0}>{busy ? 'Please wait…' : 'Verify email'}</ActionButton>
    </form><div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5"><ActionButton type="button" secondary disabled={busy || resendSeconds > 0} onClick={() => { setCode(''); onResend(); }}>{resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend code'}</ActionButton><button type="button" disabled={busy} onClick={onBack} className="ss-text-button min-h-12 rounded-lg px-3 text-sm font-medium text-indigo-700 disabled:opacity-50">Change your details</button></div>
  </div>;
}
