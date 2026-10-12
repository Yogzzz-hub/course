import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { themes } from '../../src/components/ThemeSwitcher';
import { enrolledSession, studentDashboard, studentPayments } from '../student-fixtures';
import { adminSession, adminLeads } from '../admin-fixtures';

async function panels(page: Page) {
  await page.route('**/api/student/**', route => {
    const path = new URL(route.request().url()).pathname;
    const json = path.endsWith('/session') ? { session: enrolledSession } : path.endsWith('/dashboard') ? studentDashboard : studentPayments;
    return route.fulfill({ json });
  });
  await page.route('**/api/admin/**', route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith('/session') ? adminSession : adminLeads }));
}
async function choose(page: Page, name: string) {
  await page.getByRole('button', { name: 'Choose colour palette' }).click();
  await page.getByRole('region', { name: 'Colour palettes' }).getByRole('button', { name, exact: true }).click();
  await page.keyboard.press('Escape');
}
for (const theme of themes) {
  test(`${theme.name}: persists across public, student and admin pages`, async ({ page }) => {
    test.setTimeout(60000);
    await panels(page);
    await page.goto('/');
    await choose(page, theme.name);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme.id);
    const rgb = theme.primary.match(/[a-f\d]{2}/gi)!.map(value => parseInt(value, 16));
    await expect(page.locator('.ss-header-cta')).toHaveCSS('background-color', `rgb(${rgb.join(', ')})`);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
    for (const path of ['/contact', '/student-panel', '/admin-panel']) {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme.id);
      await page.getByRole('button', { name: 'Choose colour palette' }).click();
      await expect(page.getByRole('region', { name: 'Colour palettes' }).getByRole('button', { name: theme.name, exact: true })).toHaveAttribute('aria-pressed', 'true');
      await page.keyboard.press('Escape');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(scan.violations).toEqual([]);
    }
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme.id);
  });
}
test('all routes expose palettes and fit narrow screens, including sign-in and 404', async ({ page }) => {
  test.setTimeout(60000);
  await panels(page);
  for (const path of ['/', '/book-session', '/direct-booking', '/programmes', '/programmes/python-full-stack', '/learning-experience', '/career-support', '/about', '/contact', '/privacy-policy', '/terms-and-conditions', '/student-panel', '/admin-panel', '/auth/sign-in', '/auth/admin/sign-in', '/unknown-path']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(path === '/unknown-path' ? 404 : 200);
    await expect(page.getByRole('button', { name: 'Choose colour palette' })).toBeVisible();
    for (const width of [320, 360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});
test('theme selection survives component remounts when storage is blocked', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('Storage blocked'); }; Storage.prototype.getItem = () => { throw new Error('Storage blocked'); }; });
  await page.goto('/contact');
  await choose(page, 'Burgundy + Dusty Lavender');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Programmes', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'theme-3');
  await page.getByRole('link', { name: 'Shadow Sphere Technical Academy home', exact: true }).first().click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'theme-3');
});
test('local demo is explicit, read-only, themed and absent from production', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/student-panel');
  await expect(page.getByRole('button', { name: 'Retry session' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open local demo' })).toHaveCount(0);
  await page.goto('http://127.0.0.1:5173/student-panel');
  await page.getByRole('button', { name: 'Open local demo' }).click();
  await expect(page.getByRole('region', { name: 'Local demo controls' })).toContainText('No real enrolment');
  await expect(page.locator('h1')).toContainText('Demo');
  const networkWrites: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') networkWrites.push(request.url()); });
  await page.getByRole('button', { name: 'Mark complete' }).click();
  await expect(page.getByRole('alert')).toContainText('read-only local demo');
  await choose(page, 'Burgundy + Soft Copper');
  await page.getByRole('button', { name: 'Prospect demo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Prospect demo', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'theme-2');
  await expect(page.getByText('Your next chapter starts here.', { exact: true })).toBeVisible();
  expect(networkWrites).toEqual([]);
  await page.getByRole('button', { name: 'Exit demo' }).click();
  await expect(page.getByRole('button', { name: 'Retry session' })).toBeVisible();
});
