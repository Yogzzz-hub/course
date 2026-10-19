import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function mockSession(page:import('@playwright/test').Page){
  await page.route('**/api/learning/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/attempts'))return route.fulfill({json:{attempts:[]}});
    if(path.endsWith('/session/current'))return route.fulfill({json:{csrf:'',analytics:false}});
    return route.fulfill({json:{csrf:'responsive-fixture',analytics:false}});
  });
}
for(const width of [320,390,768,1024,1440]){
  test(`assessment cards and sticky controls align at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});await mockSession(page);
    await page.goto('/assessment');await expect(page.locator('.skill-topic')).toHaveCount(12);
    const grid=page.locator('.skill-discovery-grid'),card=page.locator('.skill-topic').first();
    await expect(grid).toHaveCSS('display','grid');await expect(card).toHaveCSS('display','flex');await expect(card).toHaveCSS('text-align','left');await expect(card).toHaveCSS('border-top-width','1px');
    const expected=width<=600?1:width<=900?2:3;
    expect(await grid.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(expected);
    const edges=await card.evaluate(el=>[...el.querySelectorAll(':scope>strong,:scope>.skill-curiosity,:scope>.skill-topic-footer')].map(child=>child.getBoundingClientRect().left));
    expect(Math.max(...edges)-Math.min(...edges)).toBeLessThan(1);
    if(expected>1){const cards=await page.locator('.skill-topic').evaluateAll(elements=>elements.slice(0,3).map(el=>({top:el.getBoundingClientRect().top,height:el.getBoundingClientRect().height})));expect(Math.abs(cards[0].top-cards[1].top)).toBeLessThan(1);expect(Math.abs(cards[0].height-cards[1].height)).toBeLessThan(1);}
    await page.evaluate(()=>window.scrollTo(0,600));
    await expect.poll(async()=>{const header=await page.locator('.header-inner').boundingBox(),bar=await page.locator('.assessment-quick-start').boundingBox();return bar!.y-(header!.y+header!.height);}).toBeGreaterThanOrEqual(8);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(width===390||width===1440){await grid.scrollIntoViewIfNeeded();await page.screenshot({path:`.local/assessment-alignment-${width}.png`});}
    if(width===390){const scan=await new AxeBuilder({page}).include('.assessment-experience').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(scan.violations).toEqual([]);}
  });
}
test('assessment layout remains styled after internal navigation and reload',async({page})=>{
  await mockSession(page);await page.goto('/');
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Free skill test',exact:true}).click();
  await page.getByRole('link',{name:'Take the Free Skill Test',exact:true}).click();
  await expect(page.locator('.skill-topic')).toHaveCount(12);await expect(page.locator('.skill-discovery-grid')).toHaveCSS('display','grid');
  await page.reload();await expect(page.locator('.skill-discovery-grid')).toHaveCSS('display','grid');
});
