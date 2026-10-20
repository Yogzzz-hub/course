import { validateEnquiry, type Enquiry } from '../../src/utils/enquiry.ts';

interface KV { get(key:string):Promise<string|null>; put(key:string,value:string,options:{expirationTtl:number}):Promise<void> }
export interface Env {
  RESEND_API_KEY?: string;
  SMTP_PASS?: string;
  ENQUIRY_FROM: string;
  ENQUIRY_TO: string;
  TURNSTILE_SECRET_KEY: string;
  TURNSTILE_SITE_KEY: string;
  ALLOWED_ORIGIN: string;
  RATE_LIMIT_SALT: string;
  LEGAL_APPROVED: string;
  ENQUIRY_LIMITS: KV;
  onPersist?: (enquiry: Enquiry) => Promise<void>;
  sendMail?: (options: { from: string; to: string; replyTo?: string; subject: string; text: string }) => Promise<{ success: boolean; id?: string }>;
}
type Context={request:Request;env:Env};
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});}
function configured(env:Env){
  const hasMail = Boolean(env.RESEND_API_KEY || env.sendMail || env.SMTP_PASS);
  return Boolean(hasMail && env.ENQUIRY_FROM && env.ENQUIRY_TO && env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY && env.ALLOWED_ORIGIN && env.RATE_LIMIT_SALT && env.ENQUIRY_LIMITS && env.LEGAL_APPROVED==='true');
}
async function hash(value:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function limitedBody(request:Request){
  const reader=request.body?.getReader();if(!reader)return '';
  let text='';let size=0;const decoder=new TextDecoder();
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();throw new Error('body-too-large');}text+=decoder.decode(value,{stream:true});}
  return text+decoder.decode();
}
export async function onRequest({request,env}:Context):Promise<Response>{
  if(request.method==='GET')return json({available:configured(env),...(configured(env)?{siteKey:env.TURNSTILE_SITE_KEY}:{})});
  if(request.method!=='POST')return new Response(null,{status:405,headers:{Allow:'GET, POST'}});
  if(!configured(env))return json({message:'Enquiries are not available yet. Your details have not been sent.'},503);
  if(request.headers.get('Origin')!==env.ALLOWED_ORIGIN)return json({message:'This submission origin is not allowed.'},403);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({message:'Expected a JSON enquiry.'},415);
  const id=request.headers.get('Idempotency-Key')||'';
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return json({message:'Please refresh and try your enquiry again.'},400);
  let raw:unknown;
  try { raw=JSON.parse(await limitedBody(request)); } catch(error){return json({message:'Invalid enquiry payload.'},error instanceof Error && error.message==='body-too-large'?413:400);}
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return json({message:'Invalid enquiry.'},400);
  const body=raw as Record<string,unknown>;
  const fields=['name','email','phone','programme','contactMethod','message','website'];
  if(fields.some(key=>typeof body[key]!=='string')||typeof body.consent!=='boolean'||typeof body.token!=='string'||body.token.length>2048)return json({message:'Check your enquiry fields and try again.'},400);
  const data:Enquiry={name:(body.name as string).trim(),email:(body.email as string).trim(),phone:(body.phone as string).trim(),programme:body.programme as string,contactMethod:body.contactMethod as string,message:(body.message as string).trim(),website:body.website as string,consent:body.consent};
  if(data.website)return json({message:'Unable to accept this enquiry.'},400);
  const errors=validateEnquiry(data);
  if(Object.keys(errors).length)return json({message:'Please check your enquiry details.',errors},400);
  try {
    const fingerprint=await hash(JSON.stringify(data));
    const key=`request:${await hash(env.RATE_LIMIT_SALT+id)}`;
    const previous=await env.ENQUIRY_LIMITS.get(key);
    if(previous){if(previous!==fingerprint)return json({message:'This submission changed. Please refresh and try again.'},409);return json({success:true});}
    const ip=request.headers.get('CF-Connecting-IP')||'unknown';
    const rateKey=`rate:${await hash(env.RATE_LIMIT_SALT+ip)}:${Math.floor(Date.now()/3600000)}`;
    const attempts=Number(await env.ENQUIRY_LIMITS.get(rateKey)||0);
    if(attempts>=5)return json({message:'Too many attempts. Please wait an hour before trying again.'},429);
    // KV counters are best-effort across edge locations. Add a Cloudflare WAF rate rule for strict burst protection.
    await env.ENQUIRY_LIMITS.put(rateKey,String(attempts+1),{expirationTtl:86400});
    const verification=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:body.token,remoteip:ip}),signal:AbortSignal.timeout(8000)});
    if(!verification.ok)return json({message:'Spam verification is temporarily unavailable. Please retry.'},502);
    const challenge=await verification.json() as {success:boolean;hostname?:string;action?:string};
    if(!challenge.success||challenge.hostname!==new URL(env.ALLOWED_ORIGIN).hostname||challenge.action!=='enquiry')return json({message:'Spam verification expired or failed. Please verify again.'},400);
    if (env.sendMail) {
      const emailResult = await env.sendMail({
        from: env.ENQUIRY_FROM,
        to: env.ENQUIRY_TO,
        replyTo: data.email,
        subject: 'Academy programme enquiry',
        text: `Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone||'Not supplied'}\nProgramme: Python Full-Stack Software Engineering\nPreferred contact: ${data.contactMethod}\nConsent to enquiry response: yes\n\n${data.message||'No additional message.'}`,
      });
      if (!emailResult.success) return json({message:'The enquiry service could not accept your message. Please try again.'},502);
    } else {
      const delivery=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`enquiry-${id}`},body:JSON.stringify({from:env.ENQUIRY_FROM,to:[env.ENQUIRY_TO],reply_to:data.email,subject:'Academy programme enquiry',text:`Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone||'Not supplied'}\nProgramme: Python Full-Stack Software Engineering\nPreferred contact: ${data.contactMethod}\nConsent to enquiry response: yes\n\n${data.message||'No additional message.'}`}),signal:AbortSignal.timeout(8000)});
      if(!delivery.ok)return json({message:'The enquiry service could not accept your message. Please try again.'},502);
      const receipt=await delivery.json() as {id?:string};
      if(!receipt.id)return json({message:'Delivery could not be verified. Please retry.'},502);
    }
    await env.ENQUIRY_LIMITS.put(key,fingerprint,{expirationTtl:86400});
    try { await env.onPersist?.(data); } catch { /* non-blocking */ }
    return json({success:true});
  } catch {return json({message:'The enquiry service is temporarily unavailable. Please try again.'},502);}
}
