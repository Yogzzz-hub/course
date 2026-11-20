import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {bank} from '../../server/bank';

test('mobile discovery filters 12 skills and a focused check shows honest untested areas',async({page})=>{
  test.setTimeout(90000);
  await page.setViewportSize({width:390,height:844});await page.goto('/assessment');
  await expect(page.locator('.skill-topic')).toHaveCount(12);
  await page.getByRole('button',{name:'Interfaces',exact:true}).click();await expect(page.locator('.skill-topic')).toHaveCount(3);
  await page.locator('.skill-topic').filter({has:page.getByText('React',{exact:true})}).click();
  await expect(page.getByText(/React focus · 3 questions/)).toBeVisible();
  await page.getByRole('button',{name:'Start assessment',exact:true}).click();
  for(let n=0;n<3;n++){
    await expect(page.getByText(`Question ${n+1} of 3`,{exact:false})).toBeVisible();
    const prompt=await page.locator('.learning-card pre').innerText();const q=bank.find(q=>q.prompt===prompt)!;
    // Keep one deliberate miss to exercise a meaningful practice recommendation.
    await page.getByRole('radio',{name:q.options[n===0?(q.answer+1)%4:q.answer],exact:true}).check();
    await page.getByRole('button',{name:n===2?'See my results':'Save and continue',exact:true}).click();
  }
  await expect(page.getByText('2 / 3',{exact:true})).toBeVisible();
  await expect(page.locator('.skill-result-card')).toHaveCount(12);
  await page.getByRole('button',{name:'Not explored',exact:true}).click();await expect(page.locator('.skill-result-card')).toHaveCount(11);
  await page.getByRole('button',{name:'Practice next',exact:true}).click();await expect(page.locator('.skill-result-card')).toHaveCount(1);
  await page.locator('.skill-result-card summary').click();await expect(page.getByText('Build a searchable React catalogue with stable item keys.')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const scan=await new AxeBuilder({page}).include('.learning-shell').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(scan.violations).toEqual([]);
  await page.getByRole('button',{name:'Explore other skill areas',exact:true}).click();
  await expect(page.getByRole('button',{name:/Review completed assessment/})).toBeVisible();
});
