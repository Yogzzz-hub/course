import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { challenges, publicChallenge } from '../../server/challenges';

// UI contract fixtures only: these tests do not claim to execute candidate code.
test('unavailable judge explains disabled actions and recovery preserves the draft',async({page})=>{
  let available=false;
  await page.route('**/api/learning/challenges',route=>route.fulfill({json:{challenges:challenges.map(publicChallenge),available,message:available?'Isolated judging is available.':'Judging service is unavailable.'}}));
  await page.goto('/python-coding-challenge');
  const run=page.getByRole('button',{name:'Run sample tests',exact:true});
  const submit=page.getByRole('button',{name:'Submit to isolated judge',exact:true});
  await expect(run).toBeDisabled();await expect(submit).toBeDisabled();
  await expect(page.getByText('Running code is currently unavailable.',{exact:true})).toBeVisible();
  await page.locator('.cm-content').fill('print(42)');
  await page.getByRole('button',{name:'Check execution availability',exact:true}).click();
  await expect(run).toBeDisabled();await expect(page.locator('.cm-content')).toHaveText('print(42)');
  available=true;
  await page.getByRole('button',{name:'Check execution availability',exact:true}).click();
  await expect(run).toBeEnabled();await expect(submit).toBeEnabled();
  await expect(page.locator('.cm-content')).toHaveText('print(42)');
});
const graded = {
  id: 'fixture-submission', state: 'graded', purpose: 'submit', correction: null,
  result: { correctness: 60, edgeCases: 20, understanding: null, total: null, quality: 'Not scored.', outcomes: [] },
  followup: { prompt: 'Explain the fixture result', options: ['Correct', 'Incorrect', 'Another', 'Neither'], answered: false },
};
test('measured resources and complexity checkpoints are explained without authorship claims',async({page})=>{
  await setup(page);
  const fixture={...graded,result:{...graded.result,performance:{maxTimeSeconds:0.012,maxMemoryKB:2048,timeCases:5,memoryCases:5,totalCases:5,notice:'These measurements do not establish Big-O complexity or AI authorship.'}},followup:{...graded.followup,id:'sum-values-complexity',version:1,kind:'complexity'}};
  await page.route('**/api/learning/submissions',route=>route.fulfill({status:202,json:fixture}));
  await page.getByRole('button',{name:'Submit to isolated judge',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Execution evidence',exact:true})).toBeVisible();
  await expect(page.getByText('0.012 seconds',{exact:true})).toBeVisible();
  await expect(page.getByText('2,048 KB',{exact:true})).toBeVisible();
  await expect(page.getByText('Complexity checkpoint',{exact:true})).toBeVisible();
  await expect(page.getByText('These measurements do not establish Big-O complexity or AI authorship.')).toBeVisible();
});
async function setup(page: import('@playwright/test').Page, state: 'graded' | 'queued' = 'graded') {
  await page.route('**/api/learning/challenges', route => route.fulfill({ json: { challenges: challenges.map(publicChallenge), available: true, message: 'Test fixture service' } }));
  await page.route('**/api/learning/session', route => route.fulfill({ json: { csrf: 'fixture-csrf', analytics: false } }));
  await page.route('**/api/learning/submissions', route => route.fulfill({ status: 202, json: state === 'graded' ? graded : { ...graded, state, result: null, followup: null } }));
  await page.goto('/python-coding-challenge');
  await expect(page.getByRole('heading', { name: 'Sum a sequence', exact: true })).toBeVisible();
}

test('switching challenges keeps drafts and their self-reported context in memory', async ({ page }) => {
  await setup(page);
  await page.locator('.cm-content').fill('print(42)');
  await page.getByLabel('I used AI assistance for this draft').check();
  await page.getByLabel('Learning mode', { exact: true }).selectOption('independent');
  await page.getByLabel('Choose a challenge').selectOption('safe-integer-division');
  await expect(page.getByRole('heading', { name: 'Handle invalid division requests', exact: true })).toBeVisible();
  await expect(page.getByLabel('I used AI assistance for this draft')).not.toBeChecked();
  await page.locator('.cm-content').fill('print([])');
  await page.getByLabel('Choose a challenge').selectOption('sum-values');
  await expect(page.locator('.cm-content')).toHaveText('print(42)');
  await expect(page.getByText('9 characters', { exact: true })).toBeVisible();
  await expect(page.getByLabel('I used AI assistance for this draft')).toBeChecked();
  await expect(page.getByLabel('Learning mode', { exact: true })).toHaveValue('independent');
  await page.getByLabel('Choose a challenge').selectOption('safe-integer-division');
  await expect(page.locator('.cm-content')).toHaveText('print([])');
  await page.reload();
  await expect(page.locator('.cm-content')).not.toHaveText('print(42)');
});

test('switching exercises clears the old grade and understanding check', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'Submit to isolated judge', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Submission: graded' })).toBeVisible();
  await page.getByRole('radio', { name: 'Correct', exact: true }).check();
  await page.getByLabel('Request a rejudge using the exact original code').fill('Please check the duplicate handling.');
  await page.getByLabel('Choose a challenge').selectOption('deduplicate-events');
  await expect(page.getByRole('heading', { name: 'Process retried ledger events', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Submission:/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Check your understanding' })).toHaveCount(0);
});

test('pending work locks exercise selection and cancellation uses the server result', async ({ page }) => {
  await setup(page, 'queued');
  await page.route('**/api/learning/submissions/fixture-submission', route => route.fulfill({ json: graded }));
  await page.route('**/api/learning/submissions/fixture-submission/cancel', route => route.fulfill({ json: { cancelled: true } }));
  await page.getByRole('button', { name: 'Submit to isolated judge', exact: true }).click();
  await expect(page.getByLabel('Choose a challenge')).toBeDisabled();
  // Completion wins this race: never replace an authoritative grade with a fabricated cancelled state.
  await page.getByRole('button', { name: 'Cancel submission', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Submission: graded' })).toBeVisible();
  await expect(page.getByLabel('Choose a challenge')).toBeEnabled();
});

test('all seven exercises are selectable on mobile and the editor has accessible controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  for (const challenge of challenges) {
    await page.getByLabel('Choose a challenge').selectOption(challenge.id);
    await expect(page.getByRole('heading', { name: challenge.title, exact: true })).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page }).include('.learning-shell').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations).toEqual([]);
});

test('uncertain retries reuse the request ID but a new completed run gets a fresh ID', async ({ page }) => {
  await setup(page);
  const ids: string[] = [];
  await page.route('**/api/learning/submissions', route => {
    ids.push(route.request().postDataJSON().requestId);
    return route.fulfill(ids.length === 1
      ? { status: 503, json: { message: 'Temporary fixture outage' } }
      : { status: 202, json: graded });
  });
  const submit = page.getByRole('button', { name: 'Submit to isolated judge', exact: true });
  await submit.click();
  await expect(page.getByRole('alert')).toHaveText('Temporary fixture outage');
  await submit.click();
  await expect(page.getByRole('heading', { name: 'Submission: graded' })).toBeVisible();
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect.poll(() => ids.length).toBe(3);
  expect(ids[1]).toBe(ids[0]);
  expect(ids[2]).not.toBe(ids[1]);
});
