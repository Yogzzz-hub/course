import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
const root=resolve('dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.xml':'application/xml','.txt':'text/plain; charset=utf-8','.json':'application/json'};
createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  if(pathname.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({available:false,message:'The local static preview does not run Cloudflare Functions.'}));return;}
  let file=resolve(root,'.'+pathname);
  if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  let status=200;
  try{if((await stat(file)).isDirectory())file=resolve(file,'index.html');await stat(file);}catch{file=resolve(root,'404.html');status=404;}
  const body=await readFile(file);
  const compress=body.length>1024 && /gzip/.test(req.headers['accept-encoding']||'') && !['.woff2','.png','.jpg'].includes(extname(file));
  res.writeHead(status,{'Content-Type':types[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Vary':'Accept-Encoding',...(compress?{'Content-Encoding':'gzip'}:{})});res.end(compress?gzipSync(body):body);
 }catch{res.writeHead(400);res.end('Bad request');}
}).listen(4173,'127.0.0.1',()=>console.log('Production preview: http://127.0.0.1:4173'));
