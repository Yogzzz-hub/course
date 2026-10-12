import { readFile, access } from 'node:fs/promises';
const paths=['','programmes','programmes/python-full-stack','learning-experience','career-support','about','book-session','contact','privacy-policy','terms-and-conditions'];
let links=0,fragments=0;
for(const path of paths){
 const html=await readFile(`dist/${path?`${path}/`:''}index.html`,'utf8');
 for(const match of html.matchAll(/<a\b[^>]*href="([/#][^"]*)"/g)){
  const url=new URL(match[1].replaceAll('&amp;','&'),`https://academy.test/${path}`);
  const file=`dist${url.pathname==='/'?'':url.pathname}/index.html`;
  await access(file);links++;
  if(url.hash){const target=await readFile(file,'utf8');if(!target.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`))throw new Error(`Broken fragment: ${path} → ${url.pathname}${url.hash}`);fragments++;}
 }
}
console.log(`Verified ${links} internal links, including ${fragments} fragment destinations.`);
