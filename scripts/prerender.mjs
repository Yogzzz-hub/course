import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { render, routes, academy } from '../.build/server/entry-server.js';
let template=await readFile('dist/index.html','utf8');
// This compact presentation site inlines its compressed stylesheet to remove a rendering round trip.
for (const match of template.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)) {
 template=template.replace(match[0],`<style>${await readFile(`dist${match[1]}`,'utf8')}</style>`);
}
const manifest=JSON.parse(await readFile('dist/.vite/manifest.json','utf8'));
const pageFiles={'/':'Home','/programmes':'Programmes','/programmes/python-full-stack':'ProgrammeDetails','/learning-experience':'LearningExperience','/career-support':'CareerSupport','/about':'About','/book-session':'BookSession','/contact':'Contact','/privacy-policy':'Legal','/terms-and-conditions':'Legal','/404':'NotFound'};
const fontPreloads=(await readdir('dist/assets')).filter(name=>name.includes('-latin-wght-')&&name.endsWith('.woff2')).map(name=>`<link rel="preload" href="/assets/${name}" as="font" type="font/woff2" crossorigin/>`).join('');
for(const route of [...routes,{path:'/404'}]){
 const {head,html}=await render(route.path);
 const chunk=manifest[`src/pages/${pageFiles[route.path]}.tsx`];
 const preloadFiles=new Set();
 function visit(entry){if(!entry||preloadFiles.has(entry.file))return;preloadFiles.add(entry.file);for(const key of entry.imports||[])visit(manifest[key]);}
 visit(chunk);
 const modulePreloads=[...preloadFiles].map(file=>`<link rel="modulepreload" href="/${file}"/>`).join('');
 const directory=route.path==='/'?'dist':`dist${route.path}`;
 await mkdir(directory,{recursive:true});
 const page=template.replace('<!--app-head-->',head+fontPreloads+modulePreloads).replace('<!--app-html-->',html);
 await writeFile(`${directory}/index.html`,page);
 if(route.path==='/404')await writeFile('dist/404.html',page);
}
const ready=academy.siteUrl && academy.brandApproved && academy.legalApproved;
await writeFile('dist/robots.txt',ready?`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${academy.siteUrl}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n');
const urls=ready?routes.filter(r=>!r.path.includes('policy')&&!r.path.includes('terms')).map(r=>`<url><loc>${(academy.siteUrl+r.path).replace(/&/g,'&amp;')}</loc></url>`).join(''):'';
await writeFile('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
console.log(`Prerendered ${routes.length} routes and 404. Search indexing ${ready?'enabled':'disabled pending domain, brand and legal approval'}.`);
