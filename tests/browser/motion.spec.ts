import { test, expect } from '@playwright/test';

test('programme graphics animate in view while duration stays accurate and reduced motion stops them', async ({ page }) => {
  await page.goto('/programmes');
  const map = page.locator('.programme-map');
  await map.scrollIntoViewIfNeeded();
  await expect(map).toHaveAttribute('data-in-view', 'true');
  await expect.poll(() => map.locator('.stack-packet').evaluate(element => element.getAnimations().some(animation => animation.playState === 'running'))).toBe(true);
  const delays = await map.locator('.stack-row').evaluateAll(rows => rows.map(row => getComputedStyle(row, '::before').animationDelay));
  expect(new Set(delays).size).toBe(4);
  await page.getByRole('link', { name: 'Explore programme', exact: true }).click();
  const duration = page.locator('.duration-art');
  await duration.scrollIntoViewIfNeeded();
  await expect(duration.locator('strong')).toHaveText('07months');
  await expect(duration.locator('.dial-segment')).toHaveCount(7);
  await expect.poll(() => duration.locator('.dial-orbit').evaluate(element => element.getAnimations().some(animation => animation.playState === 'running'))).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  expect(await duration.locator('.dial-orbit').evaluate(element => element.getAnimations().length)).toBe(0);
  await expect(duration.locator('strong')).toHaveText('07months');
});

test('animated headings preserve real readable text and stagger their words', async ({ page }) => {
  await page.goto('/about');
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toHaveText('Learning should leadto something you can build.');
  const words = heading.locator('.motion-word');
  expect(await words.count()).toBeGreaterThan(5);
  await expect(heading.locator('.text-motion')).toHaveAttribute('data-entered', 'true');
  const timing = await words.evaluateAll(elements => elements.map(element => ({ delay: getComputedStyle(element).animationDelay, opacity: getComputedStyle(element).opacity })));
  expect(new Set(timing.map(word => word.delay)).size).toBeGreaterThan(3);
  expect(timing.every(word => word.opacity === '1')).toBe(true);
  await page.getByRole('button', { name: 'Pause animations', exact: true }).first().click();
  expect(await words.first().evaluate(element => element.getAnimations().length)).toBe(0);
  await expect(heading).toContainText('something you can build.');
});

test('SVG orbit signals animate in view and respect pause and reduced motion', async ({ page }) => {
  await page.goto('/about');
  const orbit = page.locator('.orbit-signal');
  await orbit.scrollIntoViewIfNeeded();
  await expect.poll(() => orbit.evaluate(element => element.getAnimations().some(animation => animation.playState === 'running'))).toBe(true);
  const first = await orbit.evaluate(element => getComputedStyle(element).strokeDashoffset);
  await expect.poll(() => orbit.evaluate(element => getComputedStyle(element).strokeDashoffset)).not.toBe(first);
  await page.locator('footer').scrollIntoViewIfNeeded();
  await expect.poll(() => orbit.evaluate(element => element.getAnimations().every(animation => animation.playState === 'paused'))).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  expect(await orbit.evaluate(element => element.getAnimations().length)).toBe(0);
  await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
});

test('hero moves, can be paused, and the preference survives navigation', async ({ page }) => {
  await page.goto('/about');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'active');
  const plate = page.locator('.plate-float').first();
  await page.locator('.engineering-stage').scrollIntoViewIfNeeded();
  await expect.poll(() => plate.evaluate(element => element.getAnimations().some(animation => animation.playState === 'running'))).toBe(true);
  const initial = await plate.evaluate(element => getComputedStyle(element).transform);
  await expect.poll(() => plate.evaluate(element => getComputedStyle(element).transform)).not.toBe(initial);
  await page.getByRole('button', { name: 'Pause animations', exact: true }).first().click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  expect(await plate.evaluate(element => element.getAnimations().length)).toBe(0);
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Programmes', exact: true }).click();
  await expect(page.locator('h1')).toContainText('One focused programme.');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  // The motion toggle lives with the About engineering visual since the footer toggle was removed.
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'About', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  await page.getByRole('button', { name: 'Resume animations', exact: true }).first().click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'active');
});

test('scroll reveals the journey and updates reading progress', async ({ page }) => {
  await page.goto('/learning-experience');
  await expect(page.locator('.ring-face')).toHaveCount(5);
  const stage = page.locator('.foundation-list > div').first();
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute('data-revealed', 'true');
  await expect.poll(() => page.locator('.scroll-meter').evaluate(element => getComputedStyle(element).transform)).not.toBe('matrix(0, 0, 0, 1, 0, 0)');
  await page.goto('/programmes/python-full-stack');
  await page.getByRole('article', { name: 'Elite master package' }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('article', { name: 'Elite master package' })).toHaveAttribute('data-revealed', 'true');
});

test('accordion animates height and remains correct on rapid toggles', async ({ page }) => {
  await page.goto('/contact');
  const details = page.locator('.accordion details').first();
  await details.scrollIntoViewIfNeeded();
  const summary = details.locator('summary');
  const closedHeight = await details.evaluate(element => element.getBoundingClientRect().height);
  await summary.click();
  await expect(details).toHaveAttribute('open', '');
  await expect.poll(() => details.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThan(closedHeight + 25);
  await summary.click();
  await expect(details).not.toHaveAttribute('open');
  await summary.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(details).toHaveAttribute('open', '');
  await expect.poll(() => details.evaluate(element => getComputedStyle(element).overflow)).toBe('visible');
});

test('device reduced motion prevents decorative animations and preserves content', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/about');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
  await expect(page.getByRole('button', { name: 'Animations disabled by your device settings' }).first()).toBeDisabled();
  expect(await page.locator('.plate-float').first().evaluate(element => element.getAnimations().length)).toBe(0);
  await page.goto('/programmes/python-full-stack');
  const standard = page.getByRole('article', { name: 'Standard master package' });
  await standard.scrollIntoViewIfNeeded();
  expect(await standard.evaluate(element => getComputedStyle(element).opacity)).toBe('1');
  await expect(standard).toBeVisible();
  expect(errors).toEqual([]);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'active');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
});

test('mobile drawer animates without losing focus containment', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/about');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close navigation' })).toBeFocused();
  await expect.poll(() => drawer.evaluate(element => getComputedStyle(element).opacity)).toBe('1');
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
});

test('page navigation settles to fully visible content and shows the correct title', async ({ page }) => {
  await page.goto('/programmes');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'About', exact: true }).click();
  await expect(page).toHaveTitle('About the Academy | Shadow Sphere Technical Academy');
  await expect(page.locator('h1')).toBeVisible();
  await expect.poll(() => page.locator('main').evaluate(element => getComputedStyle(element).opacity)).toBe('1');
  await page.goBack();
  await expect(page.locator('h1')).toContainText('One focused programme.');
  await expect.poll(() => page.locator('main').evaluate(element => getComputedStyle(element).opacity)).toBe('1');
});
