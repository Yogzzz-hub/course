import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
// Entrance fades are transient, so contrast is scanned once the page has hydrated (the reading bar gets its inline
// transform) and no finite animation has run for a few consecutive samples, which also covers in-view reveals.
const settled=async(page:Page)=>{await page.locator('.reading-progress[style]').waitFor({state:'attached'});let quiet=0;await expect.poll(async()=>{quiet=await page.evaluate(()=>document.getAnimations().some(animation=>animation.playState==='running'&&Number.isFinite(animation.effect?.getComputedTiming().endTime)))?0:quiet+1;return quiet;},{intervals:[200]}).toBeGreaterThan(2);};
const paths=[
  '/',
  '/programmes',
  '/programmes/python-full-stack',
  '/programmes/full-stack-app-dev',
  '/programmes/django-backend-dev',
  '/programmes/react-development',
  '/programmes/advanced-python',
  '/programmes/devops-docker-deployment',
  '/programmes/dsa-technical-interview',
  '/programmes/programming-python-foundation',
  '/programmes/html-css-javascript',
  '/programmes/sql-postgresql',
  '/programmes/software-engineering-testing',
  '/programmes/ai-assisted-development',
  '/learning-experience',
  '/career-support',
  '/about',
  '/book-session',
  '/direct-booking',
  '/contact',
  '/privacy-policy',
  '/terms-and-conditions',
  '/skill-test',
  '/coding-arena',
  '/roadmap',
  '/leaderboard',
  '/privacy-choices',
  '/python-aptitude-test',
  '/developer-readiness-test',
  '/python-coding-challenge',
  '/backend-developer-roadmap',
  '/full-stack-developer-roadmap',
  '/python-interview-practice'
];
const widths=[320,360,375,390,430,768,1024,1280,1440,1920];

for(const path of paths){test(`route, links and responsive layout: ${path}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(path);await expect(page.locator('h1')).toHaveCount(1);await expect(page).toHaveTitle(/Academy/);
 await expect(page.locator('meta[name="description"]')).toHaveAttribute('content',/.{30}/);
 await page.reload();await expect(page.locator('main')).toBeVisible();
 for(const width of widths){await page.setViewportSize({width,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);}
 const bad=await page.locator('a').evaluateAll(links=>links.filter(a=>!a.getAttribute('href')||a.getAttribute('href')==='#').map(a=>a.textContent));expect(bad).toEqual([]);
 const targets=await page.locator('a[href^="/"]').evaluateAll(links=>[...new Set(links.map(a=>new URL((a as HTMLAnchorElement).href).pathname))]);
 for(const target of targets)expect(paths).toContain(target);
 expect(errors).toEqual([]);
});}

for(const path of ['/','/programmes/python-full-stack','/contact','/book-session','/learning-experience']){test(`accessibility: ${path}`,async({page})=>{await page.goto(path);await settled(page);const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(scan.violations).toEqual([]);});}

test('mobile drawer manages focus, escape, scroll locking and route selection',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/about');
 await page.getByRole('button',{name:'Open navigation'}).click();const dialog=page.getByRole('dialog',{name:'Navigation'});await expect(dialog).toBeVisible();await expect(page.getByRole('button',{name:'Close navigation'})).toBeFocused();expect(await page.evaluate(()=>document.body.style.overflow)).toBe('hidden');
 for(let i=0;i<16;i++)await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('dialog'))).toBe(true);
 await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(page.getByRole('button',{name:'Open navigation'})).toBeFocused();
 await page.getByRole('button',{name:'Open navigation'}).click();await dialog.getByRole('link',{name:'Programmes',exact:true}).click();await expect(page).toHaveURL('/programmes');await expect(dialog).not.toBeVisible();expect(await page.evaluate(()=>document.body.style.overflow)).toBe('');
});
test('curriculum, pricing, package context and browser history',async({page})=>{
 await page.goto('/programmes');await page.getByRole('link',{name:'Explore programme',exact:true}).click();
 await page.getByRole('link',{name:'Curriculum',exact:true}).click();const module=page.locator('details').filter({has:page.locator('summary',{hasText:'Programming & Python Foundation'})});await module.locator('summary').click();await expect(module).toHaveAttribute('open','');await expect(module.getByText('Programming fundamentals',{exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'Individual Courses',exact:true}).click();await expect(page.getByRole('cell',{name:'₹1,57,000'})).toBeVisible();await page.getByRole('tab',{name:'Master Packages',exact:true}).click();await page.getByRole('link',{name:'Discuss Premium'}).click();await expect(page).toHaveURL(/package=premium/);await expect(page.getByLabel('Package to discuss (optional)')).toHaveValue('premium');await page.goBack();await expect(page).toHaveURL(/python-full-stack/);
});
test('form validates inline and unconfigured state cannot report success',async({page})=>{
 await page.goto('/contact');await page.getByRole('button',{name:'Send enquiry',exact:true}).click();await expect(page.getByText('Enter your name (2–100 characters).')).toBeVisible();await expect(page.getByLabel('Your name',{exact:true})).toBeFocused();
 await page.getByLabel('Your name',{exact:true}).fill('Test Learner');await page.getByLabel('Email address',{exact:true}).fill('invalid');await page.getByRole('button',{name:'Send enquiry',exact:true}).click();await expect(page.getByText('Enter a valid email address.')).toBeVisible();
 await page.getByLabel('Email address',{exact:true}).fill('learner@example.test');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Send enquiry',exact:true}).click();await expect(page.getByRole('alert')).toContainText('not available yet');await expect(page.getByText('Enquiry received.',{exact:true})).toHaveCount(0);
});
test('configured form handles failure, retry, loading, duplicate clicks and verified success',async({page})=>{
 let posts=0;let succeed=false;
 await page.route('**/api/enquiry',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{available:true,siteKey:'test-site-key'}});
  posts++;await new Promise(r=>setTimeout(r,300));return route.fulfill({status:succeed?200:502,json:succeed?{success:true}:{message:'Provider unavailable. Please retry.'}});
 });
 await page.route('https://challenges.cloudflare.com/**',route=>route.fulfill({contentType:'application/javascript',body:'window.turnstile={render:function(el,options){window.testCallback=options.callback;options.callback("test-token");return "widget";},remove:function(){},reset:function(){window.testCallback("test-token-2");}};'}));
 await page.goto('/contact');await page.getByLabel('Your name',{exact:true}).fill('Test Learner');await page.getByLabel('Email address',{exact:true}).fill('learner@example.test');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Send enquiry',exact:true}).click();await expect(page.getByRole('button',{name:'Sending enquiry…'})).toBeDisabled();await expect(page.getByRole('alert')).toContainText('Provider unavailable');
 succeed=true;await page.getByRole('button',{name:'Send enquiry',exact:true}).click();await expect(page.getByRole('heading',{name:'Enquiry received.'})).toBeVisible();expect(posts).toBe(2);await page.getByRole('button',{name:'Send another enquiry'}).click();await expect(page.getByLabel('Your name',{exact:true})).toHaveValue('');
});
test('404, active route and keyboard skip link',async({page})=>{const response=await page.goto('/unknown-path');expect(response?.status()).toBe(404);await expect(page.getByText('404 / A DIFFERENT PATH')).toBeVisible();await page.getByRole('link',{name:'Back to home',exact:true}).click();await expect(page).toHaveURL('/');await page.goto('/programmes');await expect(page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Programmes',exact:true})).toHaveAttribute('aria-current','page');await page.goto('/');await page.keyboard.press('Tab');await expect(page.getByText('Skip to content',{exact:true})).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('main')).toBeFocused();});
test('reduced motion, mobile landscape and reflow',async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/about');expect(await page.locator('.art-layer-4').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');for(const size of [{width:844,height:390},{width:640,height:450},{width:320,height:225}]){await page.setViewportSize(size);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);}});
test('capture review screenshots',async({page})=>{test.setTimeout(120000);for(const path of paths){for(const width of [390,1440]){await page.setViewportSize({width,height:width===390?844:1000});await page.goto(path);await page.screenshot({path:`test-results/screenshots/${path.replaceAll('/','_')||'home'}-${width}.png`,fullPage:true,animations:'disabled'});await page.screenshot({path:`test-results/screenshots/${path.replaceAll('/','_')||'home'}-${width}-viewport.png`,animations:'disabled'});}}});
test('prerendered pages remain readable without JavaScript',async({browser})=>{const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();for(const path of paths){const response=await page.goto(`http://127.0.0.1:4173${path}`);expect(response?.status()).toBe(200);await expect(page.locator('h1')).toHaveCount(1);expect(await page.title()).not.toContain('Page not found');}await context.close();});
test('trailing slash preserves privacy route and metadata',async({page})=>{const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/privacy-policy/');await expect(page).toHaveURL('/privacy-policy');await expect(page.locator('h1')).toHaveText('Privacy notice.');await expect(page).toHaveTitle(/Privacy Policy/);expect(errors).toEqual([]);});
test('touch navigation and accordions work on a phone',async({browser})=>{const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();await page.goto('http://127.0.0.1:4173/about');await page.getByRole('button',{name:'Open navigation'}).tap();await page.getByRole('dialog').getByRole('link',{name:'Contact',exact:true}).tap();await page.getByText('How long is the programme?',{exact:true}).tap();await expect(page.locator('details[open]')).toContainText('seven months');await context.close();});
