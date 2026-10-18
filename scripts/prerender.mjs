import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { render, routes, academy, isPrivatePath } from '../.build/server/entry-server.js';
let template=await readFile('dist/index.html','utf8');
// This compact presentation site inlines its compressed stylesheet to remove a rendering round trip.
for (const match of template.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)) {
 template=template.replace(match[0],`<style>${await readFile(`dist${match[1]}`,'utf8')}</style>`);
}
const manifest=JSON.parse(await readFile('dist/.vite/manifest.json','utf8'));
const pageFiles={'/auth/sign-in':'SignIn','/auth/admin/sign-in':'SignIn','/':'Home','/programmes':'Programmes','/programmes/python-full-stack':'ProgrammeDetails','/learning-experience':'LearningExperience','/career-support':'CareerSupport','/about':'About','/book-session':'BookSession','/direct-booking':'DirectBooking','/student-panel':'StudentPanel','/admin-panel':'AdminPanel','/contact':'Contact','/privacy-policy':'Legal','/terms-and-conditions':'Legal','/404':'NotFound'};
const fontPreloads=(await readdir('dist/assets')).filter(name=>name.includes('-latin-wght-')&&name.endsWith('.woff2')).map(name=>`<link rel="preload" href="/assets/${name}" as="font" type="font/woff2" crossorigin/>`).join('');
for(const route of [...routes,{path:'/404'}]){
 const {head,html}=await render(route.path);
 const learningPages={'/leaderboard':'Leaderboard','/shared-roadmap':'SharedRoadmap','/assessment':'Assessment','/admin':'LearningAdmin','/python-coding-challenge':'CodingArena'};
 const landingPaths=['/developer-readiness-test','/python-aptitude-test','/backend-developer-roadmap','/full-stack-developer-roadmap','/python-interview-practice'];
 const file=learningPages[route.path] || (landingPaths.includes(route.path)?'LearningLanding':undefined) || pageFiles[route.path] || (route.path.startsWith('/programmes/')?'ProgrammeDetails':undefined);
 const chunk=manifest[`src/pages/${file}.tsx`];
 const preloadFiles=new Set();
 const routeCss=new Set();
 function visit(entry){if(!entry||preloadFiles.has(entry.file))return;preloadFiles.add(entry.file);for(const css of entry.css||[])routeCss.add(css);for(const key of entry.imports||[])visit(manifest[key]);}
 visit(chunk);
 const modulePreloads=[...preloadFiles].map(file=>`<link rel="modulepreload" href="/${file}"/>`).join('');
 const routeStyles=(await Promise.all([...routeCss].map(async file=>`<style>${await readFile(`dist/${file}`,'utf8')}</style>`))).join('');
 const directory=route.path==='/'?'dist':`dist${route.path}`;
 await mkdir(directory,{recursive:true});
 const page=template.replace('<!--app-head-->',head+fontPreloads+modulePreloads+routeStyles).replace('<!--app-html-->',html);
 await writeFile(`${directory}/index.html`,page);
 if(route.path==='/404')await writeFile('dist/404.html',page);
}
const ready=academy.siteUrl && academy.brandApproved && academy.legalApproved;
await writeFile('dist/robots.txt',ready?`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /student-panel\nDisallow: /admin-panel\nDisallow: /auth/\nSitemap: ${academy.siteUrl}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n');
const urls=ready?routes.filter(r=>!isPrivatePath(r.path)&&!r.path.includes('policy')&&!r.path.includes('terms')).map(r=>`<url><loc>${(academy.siteUrl+r.path).replace(/&/g,'&amp;')}</loc></url>`).join(''):'';
await writeFile('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
console.log(`Prerendered ${routes.length} routes and 404. Search indexing ${ready?'enabled':'disabled pending domain, brand and legal approval'}.`);
