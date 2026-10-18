import { createServer } from 'node:http';
import { pool } from './db.ts';
import { createApp } from './app.ts';
if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required. Run the database and migrations first.');
const origin=process.env.APP_ORIGIN || 'http://127.0.0.1:5173';
if(process.env.NODE_ENV==='production' && !origin.startsWith('https://')) throw new Error('Production APP_ORIGIN must use HTTPS.');
const handle=createApp(pool,origin,process.env.NODE_ENV==='production');
const server=createServer(async(req,res)=>{
  try {
    const url=new URL(req.url || '/',origin);
    const headers=new Headers();for(const [key,value] of Object.entries(req.headers)) if(value) headers.set(key,Array.isArray(value)?value.join(','):value);
    const request=new Request(url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method||'GET')?{body:req as unknown as ReadableStream,duplex:'half'}:{})} as RequestInit);
    const response=await handle(request,req.socket.remoteAddress || 'unknown');
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
  } catch {res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({message:'Request could not be processed.'}));}
});
server.requestTimeout=30000;server.headersTimeout=10000;
server.listen(Number(process.env.PORT || 8787),process.env.API_HOST || '127.0.0.1',()=>console.log('Learning API listening'));
for(const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>server.close(()=>{void pool.end().then(()=>process.exit(0));}));
