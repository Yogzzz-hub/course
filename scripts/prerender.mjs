import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { render, routes, robotsTxt, sitemapXml, sitemapPaths, landingPaths } from '../.build/server/entry-server.js';
let template=await readFile('dist/index.html','utf8');
// This compact presentation site inlines its compressed stylesheet to remove a rendering round trip.
for (const match of template.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)) {
 template=template.replace(match[0],`<style>${await readFile(`dist${match[1]}`,'utf8')}</style>`);
}
const manifest=JSON.parse(await readFile('dist/.vite/manifest.json','utf8'));
const pageFiles={'/auth/sign-in':'SignIn','/auth/admin/sign-in':'SignIn','/':'Home','/programmes':'Programmes','/programmes/python-full-stack':'ProgrammeDetails','/learning-experience':'LearningExperience','/career-support':'CareerSupport','/about':'About','/book-session':'BookSession','/direct-booking':'DirectBooking','/student-panel':'StudentPanel','/admin-panel':'AdminPanel','/trainer-panel':'TrainerPanel','/contact':'Contact','/privacy-policy':'Legal','/terms-and-conditions':'Legal','/404':'NotFound','/skill-test':'SkillTest','/coding-arena':'CodingArena','/roadmap':'Roadmap','/leaderboard':'Leaderboard','/admin':'AdminConsole','/privacy-choices':'PrivacyChoices',...Object.fromEntries(landingPaths.map(path=>[path,'Landing']))};
const fontPreloads=(await readdir('dist/assets')).filter(name=>name.includes('-latin-wght-')&&name.endsWith('.woff2')).map(name=>`<link rel="preload" href="/assets/${name}" as="font" type="font/woff2" crossorigin/>`).join('');
for(const route of [...routes,{path:'/404'}]){
 const {head,html}=await render(route.path);
 const chunk=manifest[`src/pages/${pageFiles[route.path]}.tsx`];
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
await writeFile('dist/robots.txt',robotsTxt());
await writeFile('dist/sitemap.xml',sitemapXml());
const indexed=sitemapPaths().length;
console.log(`Prerendered ${routes.length} routes and 404. ${indexed?`${indexed} pages in the sitemap.`:'Search indexing disabled pending domain, brand and legal approval.'}`);
