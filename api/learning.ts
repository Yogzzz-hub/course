import { pool } from '../server/db.ts';
import { createApp } from '../server/app.ts';
let app:ReturnType<typeof createApp>|undefined;
export default { async fetch(request:Request) {
  if(!process.env.DATABASE_URL || !process.env.APP_ORIGIN) return Response.json({message:'The learning service is not configured.'},{status:503,headers:{'Cache-Control':'no-store'}});
  if(!process.env.APP_ORIGIN.startsWith('https://')) return Response.json({message:'Secure service configuration required.'},{status:503});
  app ??= createApp(pool,process.env.APP_ORIGIN,true);
  // Vercel sets this trusted header. Self-hosted Node uses its socket peer instead.
  return app(request,request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown');
}};
