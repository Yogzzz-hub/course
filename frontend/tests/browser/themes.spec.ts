import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { themes } from '../../src/components/ThemeSwitcher';

async function choose(page: Page, name: string) {
  await page.getByRole('button', { name: 'Choose colour palette' }).click();
  await page.getByRole('region', { name: 'Colour palettes' }).getByRole('button', { name, exact: true }).click();
  await page.keyboard.press('Escape');
}
for (const theme of themes) {
  test(`${theme.name}: persists across public pages`, async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/');
    await choose(page, theme.name);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme.id);
    const rgb = theme.primary.match(/[a-f\d]{2}/gi)!.map(value => parseInt(value, 16));
    await expect(page.locator('.ss-header-cta')).toHaveCSS('background-color', `rgb(${rgb.join(', ')})`);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
    for (const path of ['/contact', '/about', '/programmes']) {
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
test('all routes expose palettes and fit narrow screens, including 404', async ({ page }) => {
  test.setTimeout(120000);
  for (const path of ['/', '/book-session', '/direct-booking', '/programmes', '/programmes/python-full-stack', '/learning-experience', '/career-support', '/about', '/contact', '/privacy-policy', '/terms-and-conditions', '/unknown-path']) {
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
  await page.getByRole('link', { name: 'Aintrix Academy home', exact: true }).first().click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'theme-3');
});
