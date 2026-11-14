import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Login Responsive & Morphing Verification', () => {
  test('Mobile viewport (375px) shows centered logo + brand name and immediate login card', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');

    // Logo & Website name are visible and centered
    const logo = page.locator('.login-brand-logo');
    await expect(logo).toBeVisible();

    const brandTitle = page.locator('.login-brand-title');
    await expect(brandTitle).toBeVisible();
    await expect(brandTitle).toHaveText('Aintrix Academy');

    // Heavy cosmic elements are hidden
    const heroContent = page.locator('.login-hero-content');
    await expect(heroContent).toBeHidden();

    // Login Form is immediately present
    const formPane = page.locator('.login-form-pane');
    await expect(formPane).toBeVisible();

    // Check tabs
    await expect(page.getByRole('tab', { name: /Student/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Staff/i })).toBeVisible();

    const artifactPath = path.resolve('C:/Users/hp/.gemini/antigravity/brain/f8db1d23-f7ff-4ba3-986e-3a68623fb0e8/screenshots/login-mobile-375.png');
    await page.screenshot({ path: artifactPath, fullPage: true });
  });

  test('Desktop viewport (1280px) morphs between student and staff login', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');

    const root = page.locator('.login-page-root');
    await expect(root).toHaveClass(/mode-student/);

    // Screenshot Student mode
    const studentShot = path.resolve('C:/Users/hp/.gemini/antigravity/brain/f8db1d23-f7ff-4ba3-986e-3a68623fb0e8/screenshots/login-desktop-student.png');
    await page.screenshot({ path: studentShot });

    // Switch to Staff mode
    await page.getByRole('tab', { name: /Staff/i }).click();
    await expect(root).toHaveClass(/mode-staff/);
    await page.waitForTimeout(800); // allow transition

    // Screenshot Staff mode
    const staffShot = path.resolve('C:/Users/hp/.gemini/antigravity/brain/f8db1d23-f7ff-4ba3-986e-3a68623fb0e8/screenshots/login-desktop-staff.png');
    await page.screenshot({ path: staffShot });
  });

  test('Palette switcher updates theme instantly on click', async ({ page }) => {
    await page.goto('/login');
    const paletteBtn = page.getByRole('button', { name: 'Choose colour palette' });
    await expect(paletteBtn).toBeVisible();
    await paletteBtn.click();

    // Select Theme 2 (Burgundy + Soft Copper)
    const copperThemeBtn = page.getByRole('button', { name: /Soft Copper/i });
    await expect(copperThemeBtn).toBeVisible();
    await copperThemeBtn.click();

    // Check that html theme updates instantly
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'theme-2');
  });
});
