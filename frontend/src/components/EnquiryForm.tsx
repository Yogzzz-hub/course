import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2, LoaderCircle } from 'lucide-react';
import { emptyEnquiry, validateEnquiry, type EnquiryErrors } from '../utils/enquiry';
import { allBookingProgrammes } from '../data/bookingProgrammes';

type Turnstile = { render: (element: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void; reset: (id: string) => void };
declare global { interface Window { turnstile?: Turnstile } }
export function EnquiryForm() {
  const [data, setData] = useState(emptyEnquiry);
  const [errors, setErrors] = useState<EnquiryErrors>({});
  const [service, setService] = useState<{ available: boolean; siteKey?: string } | null>(null);
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle'|'sending'|'success'|'error'>('idle');
  const [message, setMessage] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const pending = useRef(false);
  const requestId = useRef('');
  useEffect(() => { const controller = new AbortController(); fetch('/api/enquiry', { signal: controller.signal }).then(r => r.ok ? r.json() : {available:false}).then(setService).catch(() => { if (!controller.signal.aborted) setService({available:false}); }); return ()=>controller.abort(); }, []);
  const successful = status === 'success';
  useEffect(() => {
    if (!service?.available || !service.siteKey || successful) return;
    let disposed = false;
    function render() { if (disposed || !container.current || !window.turnstile) return; widget.current = window.turnstile.render(container.current, { sitekey: service?.siteKey, action: 'enquiry', theme: 'dark', size: 'flexible', callback: (value:string)=>setToken(value), 'expired-callback': ()=>setToken(''), 'error-callback': ()=>{setToken('');setMessage('Spam verification could not load. Please refresh and try again.');} }); }
    let script = document.querySelector<HTMLScriptElement>('#turnstile-script');
    if (window.turnstile) render();
    else { if (!script) { script = document.createElement('script'); script.id = 'turnstile-script'; script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; script.async = true; document.head.append(script); } script.addEventListener('load', render); }
    return ()=>{ disposed = true; script?.removeEventListener('load', render); if (widget.current) window.turnstile?.remove(widget.current); };
  }, [service, successful]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending.current) return;
    const validation = validateEnquiry(data); setErrors(validation);
    if (Object.keys(validation).length) { document.getElementById(`enquiry-${Object.keys(validation)[0]}`)?.focus(); return; }
    if (!service?.available) { setMessage('Enquiries are not available yet. Your details have not been sent.'); setStatus('error'); return; }
    if (!token) { setMessage('Please complete the spam verification before sending.'); setStatus('error'); return; }
    pending.current = true; setStatus('sending'); setMessage('');
    requestId.current ||= crypto.randomUUID();
    try {
      const response = await fetch('/api/enquiry', { method:'POST', headers:{'Content-Type':'application/json','Idempotency-Key':requestId.current}, body: JSON.stringify({...data, token}), signal:AbortSignal.timeout(20000) });
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error(result.message || 'Your enquiry could not be sent. Please try again.');
      setStatus('success'); setData(emptyEnquiry);
    } catch (error) { setStatus('error'); setMessage(error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'The service took too long to respond. Please retry; duplicate delivery is protected.'); setToken(''); if (widget.current) window.turnstile?.reset(widget.current); }
    finally { pending.current = false; }
  }
  const change = (field: keyof typeof data, value: string | boolean) => { setData(prev=>({...prev,[field]:value})); setErrors(prev=>({...prev,[field]:undefined})); requestId.current = ''; };
  const field = (name: 'name'|'email'|'phone', label: string, type = 'text') => <div className="field"><label htmlFor={`enquiry-${name}`}>{label}</label><input id={`enquiry-${name}`} name={name} type={type} autoComplete={name === 'name' ? 'name' : name === 'phone' ? 'tel' : 'email'} value={data[name]} onChange={e=>change(name,e.target.value)} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined} required={name !== 'phone' || data.contactMethod === 'phone'} maxLength={name === 'name' ? 100 : name === 'email' ? 254 : 25}/>{errors[name] && <span className="field-error" id={`${name}-error`}>{errors[name]}</span>}</div>;
  if (status === 'success') return <div className="form-success" role="status"><CheckCircle2 size={40}/><h2>Enquiry received.</h2><p>Your enquiry has been accepted for delivery to the academy. This is not an appointment confirmation.</p><button className="button button-secondary" onClick={()=>{setStatus('idle');requestId.current='';setToken('');}}>Send another enquiry<ArrowUpRight size={17}/></button></div>;
  return <form className="enquiry-form" onSubmit={submit} noValidate><h2>Start a conversation.</h2><p className="small">Tell us a little about what you are looking for.</p>{service && !service.available && <p className="notice" role="status">Enquiry submission is not available yet. Your details will not be sent until the academy's contact service and privacy notice are ready.</p>}<fieldset disabled={status === 'sending'}><legend className="sr-only">Your enquiry details</legend><div className="form-grid">{field('name','Your name')}{field('email','Email address','email')}<div className="field"><label htmlFor="enquiry-contactMethod">Preferred contact method</label><select id="enquiry-contactMethod" value={data.contactMethod} onChange={e=>change('contactMethod',e.target.value)}><option value="email">Email</option><option value="phone">Phone</option></select></div>{field('phone',`Phone number ${data.contactMethod === 'phone' ? '' : '(optional)'}`,'tel')}</div><div className="field"><label htmlFor="enquiry-programme">Programme of interest</label><select id="enquiry-programme" value={data.programme} onChange={e=>change('programme',e.target.value)}>{allBookingProgrammes.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div><div className="field"><label htmlFor="enquiry-message">Your goals or questions <span>(optional)</span></label><textarea id="enquiry-message" rows={4} value={data.message} maxLength={2000} onChange={e=>change('message',e.target.value)}/></div><div className="honeypot" aria-hidden="true"><label htmlFor="enquiry-website">Leave this field empty</label><input id="enquiry-website" tabIndex={-1} autoComplete="off" value={data.website} onChange={e=>change('website',e.target.value)}/></div><label className="consent"><input id="enquiry-consent" type="checkbox" checked={data.consent} onChange={e=>change('consent',e.target.checked)} aria-invalid={!!errors.consent} aria-describedby={errors.consent ? 'consent-error' : undefined}/><span>I agree that the academy may use these details to respond to my enquiry. Read the <Link to="/privacy-policy">privacy notice</Link>.</span></label>{errors.consent && <span className="field-error" id="consent-error">{errors.consent}</span>}<div ref={container} className="turnstile-container"/>{message && <p className="form-message" role="alert">{message}</p>}<button className="button button-primary" type="submit" disabled={status === 'sending'}>{status === 'sending' ? <><LoaderCircle className="spin" size={17}/>Sending enquiry…</> : <>Send enquiry<ArrowUpRight size={17}/></>}</button><p className="small form-note">Only share information needed to answer your programme questions.</p></fieldset></form>;
}
