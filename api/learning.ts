import { randomUUID } from 'node:crypto';
import type { createApp } from '../server/app.ts';
let app:ReturnType<typeof createApp>|undefined;
const unavailable=(message:string,requestId?:string)=>Response.json({message,...(requestId?{requestId}:{})},{status:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
export default { async fetch(request:Request) {
  if(!process.env.DATABASE_URL || !process.env.APP_ORIGIN) return unavailable('The learning service is not configured.');
  try{
    const origin=new URL(process.env.APP_ORIGIN);
    if(origin.protocol!=='https:' || origin.origin!==process.env.APP_ORIGIN)return unavailable('Secure service configuration required.');
  }catch{return unavailable('Secure service configuration required.');}
  try{
    // Load backend modules inside the error boundary so initialization failures are
    // observable without returning a platform-generated HTML/plain-text 500.
    if(!app){const [{pool},{createApp}]=await Promise.all([import('../server/db.ts'),import('../server/app.ts')]);app=createApp(pool,process.env.APP_ORIGIN,true);}
    // Vercel sets this trusted header. Self-hosted Node uses its socket peer instead.
    return await app(request,request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown');
  }catch{
    const requestId=randomUUID();
    console.error(JSON.stringify({level:'error',type:'learning-initialization-failed',requestId}));
    return unavailable('The learning service is temporarily unavailable. Please retry shortly.',requestId);
  }
}};
