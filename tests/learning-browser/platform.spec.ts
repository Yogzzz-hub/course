import { test,expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { bank } from '../../server/bank';
test('home → assessment → honest result → roadmap → course and counselling',async({page})=>{
  test.setTimeout(90000);
  await page.goto('/');await page.getByRole('link',{name:'Take the Free Skill Test',exact:true}).click();
  await expect(page).toHaveURL(/developer-readiness-test/);await page.getByRole('link',{name:'Take the Free Skill Test',exact:true}).click();
  await page.getByRole('button',{name:'Start assessment',exact:true}).click();
  for(let n=0;n<10;n++){
    await expect(page.getByText(`Question ${n+1} of 10`,{exact:false})).toBeVisible();
    const prompt=await page.locator('.learning-card pre').innerText();const q=bank.find(q=>q.prompt===prompt)!;
    await page.getByRole('radio',{name:q.options[q.answer],exact:true}).check();
    await page.getByRole('button',{name:n===9?'See my results':'Save and continue',exact:true}).click();
  }
  await expect(page.getByText('10 / 10',{exact:true})).toBeVisible();
  await page.getByLabel('Your target role').selectOption('Backend Developer');
  await page.getByRole('button',{name:'Build My Career Roadmap',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your Personalized Learning Roadmap'})).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex, nofollow');
  const scan=await new AxeBuilder({page}).include('.learning-shell').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(scan.violations).toEqual([]);
  await page.getByText('Share or revoke a roadmap link',{exact:true}).click();
  await page.getByLabel('I choose to share this roadmap with people who have the link.').check();
  await page.getByRole('button',{name:'Create revocable link'}).click();
  const shared=page.getByLabel('Copy this share link');await expect(shared).toBeVisible();
  const url=await shared.inputValue(),viewer=await page.context().newPage();
  await viewer.goto(url);await expect(viewer.getByRole('heading',{name:'Backend Developer',exact:true})).toBeVisible();
  expect(new URL(viewer.url()).hash).toBe('');
  await page.bringToFront();
  await page.getByRole('button',{name:'Revoke link',exact:true}).click();
  await expect(page.getByText(/Revoked/, {exact:false}).last()).toBeVisible();
  await viewer.bringToFront();await viewer.goto('about:blank');await viewer.goto(url);await expect(viewer.getByRole('alert')).toBeVisible();await viewer.close();await page.bringToFront();
  await page.getByRole('link',{name:'Discuss this roadmap with a counselor'}).click();await expect(page).toHaveURL(/book-session/);await expect(page.locator('#ss-booking')).toBeVisible();
});
test('mobile progress survives reload and deletion revokes saved attempts',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/assessment');await page.getByRole('button',{name:'Start assessment',exact:true}).click();
  await page.getByRole('radio').first().check();await page.getByRole('button',{name:'Save and continue'}).click();await expect(page.getByText('Question 2 of 10',{exact:false})).toBeVisible();
  await page.reload();await page.getByRole('button',{name:/Resume at question 2/}).click();await expect(page.getByText('Question 2 of 10',{exact:false})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByText('Privacy and data controls',{exact:true}).click();await page.getByRole('button',{name:'Delete my assessment data and session'}).click();await page.reload();await expect(page.getByRole('button',{name:/Resume at/})).toHaveCount(0);
});
test('coding editor is usable, unavailable execution never invents a score',async({page})=>{
  await page.goto('/python-coding-challenge');await expect(page.getByRole('heading',{name:'Sum a sequence'})).toBeVisible();
  await page.getByLabel('Choose a challenge').selectOption('word-counts');await expect(page.getByRole('heading',{name:'Count normalized words'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Submit to isolated judge'})).toBeDisabled();
  await expect(page.getByText('No score is assigned when execution is unavailable.')).toBeVisible();
  await page.locator('.cm-content').fill('print(42)');await expect(page.getByText('9 characters',{exact:true})).toBeVisible();
});
test('administration requires authentication and private content is not prerendered',async({page,request})=>{
  await page.goto('/admin');await expect(page.getByRole('heading',{name:'Administrator sign-in'})).toBeVisible();
  expect((await request.get('/api/learning/admin/metrics')).status()).toBe(401);
  await expect(page.getByRole('button',{name:'Load current metrics'})).toHaveCount(0);
});
