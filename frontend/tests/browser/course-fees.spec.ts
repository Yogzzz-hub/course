import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { academyFeeCatalogue, formatFee } from '../../src/components/course-fees/pricing';
import { themes } from '../../src/components/ThemeSwitcher';

const pricingPath = '/programmes/python-full-stack#pricing';

test('renders all eleven individual fees, package inclusions and exact comparative savings', async ({ page }) => {
  await page.goto(pricingPath);
  const module = page.locator('.course-fees');
  await module.getByRole('tab', { name: 'Individual Courses', exact: true }).click();
  const panel = module.getByRole('tabpanel');
  const cards = panel.getByRole('article');
  await expect(cards).toHaveCount(11);
  for (const course of academyFeeCatalogue.courses) await expect(cards.filter({ has: page.getByRole('heading', { name: course.name, exact: true }) })).toContainText(formatFee(course.feeMinor));
  await expect(panel.getByRole('table').getByRole('row').filter({ hasText: 'Total for all 11' })).toContainText('₹1,57,000');
  await module.getByRole('tab', { name: 'Comparative Savings Matrix', exact: true }).click();
  for (const [name, price, savings] of [['Standard', '₹59,999', 'Save ₹97,001'], ['Premium', '₹79,999', 'Save ₹77,001'], ['Elite', '₹99,999', 'Save ₹57,001']]) {
    const card = module.getByRole('article').filter({ has: page.getByRole('heading', { name: `${name} Master Course`, exact: true }) });
    await expect(card).toContainText(price); await expect(card).toContainText(savings);
  }
  await module.getByRole('tab', { name: 'Master Packages', exact: true }).click();
  await expect(module.getByRole('article', { name: 'Standard master package' })).toContainText('Free internship');
  await expect(module.getByRole('article', { name: 'Premium master package' })).toContainText('Paid internship');
  await expect(module.getByRole('article', { name: 'Elite master package' })).toContainText('Stronger placement support');
});
test('keyboard tabs wrap correctly and preserve the selected package', async ({ page }) => {
  await page.goto(pricingPath);
  const module = page.locator('.course-fees');
  await module.getByRole('radio', { name: 'Elite package', exact: true }).check();
  await module.getByRole('tab', { name: 'Master Packages', exact: true }).focus();
  await page.keyboard.press('End');
  await expect(module.getByRole('tab', { name: 'Comparative Savings Matrix' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(module.getByRole('tab', { name: 'Individual Courses' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(module.getByRole('radio', { name: 'Elite package', exact: true })).toBeChecked();
  await page.keyboard.press('Home');
  await expect(module.getByRole('tab', { name: 'Individual Courses' })).toBeFocused();
  await expect(module.getByRole('tabpanel')).toHaveCount(1);
});
test('selection reaches direct booking with package selection', async ({ page }) => {
  await page.goto(pricingPath);
  await page.getByRole('button', { name: 'Select Premium package and proceed to checkout', exact: true }).click();
  await expect(page).toHaveURL(/\/direct-booking\?package=premium/);
});
test('every palette and fee view is accessible and responsive', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto(pricingPath);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const theme of themes) {
    await page.getByRole('button', { name: 'Choose colour palette' }).click();
    await page.getByRole('region', { name: 'Colour palettes' }).getByRole('button', { name: theme.name, exact: true }).click();
    await page.keyboard.press('Escape');
    for (const view of ['Individual Courses', 'Master Packages', 'Comparative Savings Matrix']) {
      await page.locator('.course-fees').getByRole('tab', { name: view, exact: true }).click();
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      expect((await new AxeBuilder({ page }).include('.course-fees').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
    }
  }
});
test('async checkout errors are recoverable and double clicks dispatch once', async ({ page }) => {
  // Load Vite's real document so the React refresh preamble is installed.
  await page.goto('http://127.0.0.1:5173/');
  await expect(page.locator('.ss-public')).toBeVisible();
  await page.evaluate(async () => {
    document.getElementById('root')?.remove();
    const target = document.createElement('div');
    target.id = 'fee-test-root';
    document.body.append(target);
    const path = '/tests/browser/fixtures/fees-harness.tsx';
    const fixture = await import(/* @vite-ignore */ path);
    fixture.mount(target);
  });
  const button = page.getByRole('button', { name: 'Select Elite package and proceed to checkout', exact: true });
  await button.evaluate(element => { (element as HTMLButtonElement).click(); (element as HTMLButtonElement).click(); });
  await expect(button).toBeDisabled();
  await page.locator('#fee-test-root').dispatchEvent('finish-attempt');
  await expect(page.getByRole('alert')).toContainText('Please try again');
  await expect(page.locator('#fee-test-root')).toHaveAttribute('data-calls', '1');
  expect(JSON.parse((await page.locator('#fee-test-root').getAttribute('data-selection'))!)).toMatchObject({ packageId: 'elite', priceMinor: 9999900, savingsMinor: 5700100 });
  await button.click();
  await expect(page.locator('#fee-test-root')).toHaveAttribute('data-calls', '2');
  await page.locator('#fee-test-root').dispatchEvent('finish-attempt');
  await expect(button).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
