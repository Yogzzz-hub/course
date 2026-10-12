import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { bookingAbout, bookingProgramme } from '../booking-fixtures';
import type { BookingSubmission } from '../../src/components/public-booking/types';

async function mockBookingApi(page: Page, options: { holdSeconds?: number; failConfirmation?: boolean; slotConflict?: boolean; empty?: boolean; slotsDelay?: number } = {}) {
  const startsAt = new Date(Date.now() + 48 * 3600000).toISOString();
  const slot = { id: 'slot-live-test', startsAt, endsAt: new Date(Date.parse(startsAt) + 1800000).toISOString() };
  let sends = 0, confirms = 0, holds = 0, releases = 0;
  let submission: BookingSubmission | undefined;
  const receipt = () => ({ bookingId: 'SS-TEST-001', programmeId: bookingProgramme.id, email: bookingAbout.email, slot });
  await page.route('**/api/booking/**', async route => {
    const endpoint = new URL(route.request().url()).pathname.replace('/api/booking', '');
    const serverNow = new Date().toISOString();
    const future = (seconds: number) => new Date(Date.parse(serverNow) + seconds * 1000).toISOString();
    if (endpoint === '/programmes') return route.fulfill({ json: { programmes: options.empty ? [] : [bookingProgramme] } });
    if (endpoint === '/otp/send') { sends++; return route.fulfill({ json: { challengeId: `challenge-${sends}`, serverNow, expiresAt: future(300), resendAt: future(1) } }); }
    if (endpoint === '/otp/verify') {
      if (route.request().postDataJSON().code !== '123456') return route.fulfill({ status: 400, json: {} });
      return route.fulfill({ json: { verificationToken: 'token-test-only', serverNow, expiresAt: future(3600) } });
    }
    if (endpoint === '/slots/search') { if (options.slotsDelay) await new Promise(resolve => setTimeout(resolve, options.slotsDelay)); return route.fulfill({ json: { slots: [slot] } }); }
    if (endpoint === '/holds') {
      holds++;
      if (options.slotConflict && holds === 1) return route.fulfill({ status: 409, json: {} });
      return route.fulfill({ json: { holdId: `hold-${holds}`, serverNow, expiresAt: future(options.holdSeconds ?? 600), slot } });
    }
    if (endpoint === '/holds/release') { releases++; return route.fulfill({ status: 204 }); }
    if (endpoint === '/confirm') {
      confirms++; submission = route.request().postDataJSON();
      expect(route.request().headers()['idempotency-key']).toBe(submission!.requestId);
      return route.fulfill(options.failConfirmation ? { status: 502, json: {} } : { json: receipt() });
    }
    if (endpoint === '/status') return route.fulfill({ json: { status: 'confirmed', booking: receipt() } });
    return route.fulfill({ status: 404, json: {} });
  });
  return { get sends() { return sends; }, get confirms() { return confirms; }, get releases() { return releases; }, get submission() { return submission; } };
}
async function fillAbout(page: Page) {
  await page.getByLabel('Full name', { exact: true }).fill(bookingAbout.name);
  await page.getByLabel('Email address', { exact: true }).fill(bookingAbout.email);
  await page.getByLabel('Phone number', { exact: true }).fill(bookingAbout.phone);
  await page.getByLabel('Current status', { exact: true }).selectOption('student');
  await page.getByLabel('Programme of interest', { exact: true }).selectOption(bookingProgramme.id);
}
async function verifyEmail(page: Page) {
  await fillAbout(page);
  await page.getByRole('button', { name: 'Continue to verification' }).click();
  await page.getByLabel('Email verification code').fill('123456');
  await page.getByRole('button', { name: 'Verify email', exact: true }).click();
  await expect(page.getByLabel('Time zone', { exact: true })).toBeVisible();
}
async function chooseSlot(page: Page) { await page.locator('.ss-slot-button').first().click(); await expect(page.getByLabel('Your technical background')).toBeVisible(); }
async function fillBrief(page: Page) {
  await page.getByLabel('Your technical background').selectOption('beginner');
  await page.getByLabel('What would you like to achieve?').fill('I want to build useful full-stack applications.');
  await page.getByLabel('Weekly learning time (hours)').fill('12');
  const futureDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  await page.getByLabel('Preferred programme start date').fill(futureDate);
}

test('homepage and counselling routes render the replacement experience with package deep links', async ({ page }) => {
  await mockBookingApi(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Build the skills.Shape your next chapter.');
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  await page.goto('/book-session?package=premium');
  await expect(page.getByLabel('Package to discuss (optional)')).toHaveValue('premium');
  await expect(page.getByRole('heading', { name: 'Let’s start with you.' })).toBeInViewport();
});
test('CMS package comparison calculates fees and transfers extras to the booking', async ({ page }) => {
  await mockBookingApi(page); await page.goto('/');
  await page.getByRole('radio', { name: /Premium/ }).check();
  await page.getByRole('checkbox', { name: /Portfolio review/ }).check();
  await expect(page.locator('output')).toHaveText('₹82,499.00');
  await page.getByRole('button', { name: 'Discuss this package' }).click();
  await expect(page.getByLabel('Programme of interest', { exact: true })).toHaveValue('python-full-stack');
  await expect(page.getByLabel('Package to discuss (optional)')).toHaveValue('premium');
  await expect(page.getByText('Selected extras: Portfolio review.')).toBeVisible();
});
test('validation focuses the first error and invalid OTP stays on verification', async ({ page }) => {
  const api = await mockBookingApi(page); await page.goto('/book-session');
  await page.getByRole('button', { name: 'Continue to verification' }).click();
  await expect(page.getByLabel('Full name', { exact: true })).toBeFocused();
  expect(api.sends).toBe(0);
  await fillAbout(page); await page.getByRole('button', { name: 'Continue to verification' }).click();
  await page.getByLabel('Email verification code').fill('000000');
  await page.getByRole('button', { name: 'Verify email', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('invalid or expired');
  await expect(page.getByLabel('Email verification code')).toBeVisible();
  await page.getByRole('button', { name: 'Resend code', exact: true }).click();
  await expect(page.getByLabel('Email verification code')).toHaveValue('');
  expect(api.sends).toBe(2);
});
test('complete flow books exactly once and keeps all selected details', async ({ page }) => {
  const api = await mockBookingApi(page); await page.goto('/book-session');
  await verifyEmail(page); await page.getByLabel('Time zone', { exact: true }).selectOption('America/Los_Angeles'); await chooseSlot(page);
  await expect(page.getByRole('timer')).toContainText('9:');
  await fillBrief(page); await page.getByRole('button', { name: 'Confirm counselling session' }).click();
  await expect(page.getByRole('heading', { name: 'Your counselling session is confirmed.' })).toBeVisible();
  await expect(page.getByText('SS-TEST-001')).toBeVisible();
  expect(api.confirms).toBe(1); expect(api.submission?.about.email).toBe(bookingAbout.email); expect(api.submission?.brief.weeklyHours).toBe('12'); expect(api.submission?.timeZone).toBe('America/Los_Angeles');
  await page.getByRole('button', { name: 'Book another session' }).click();
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('');
});
test('expired holds return to slots and preserve the brief', async ({ page }) => {
  await mockBookingApi(page, { holdSeconds: 3 }); await page.goto('/book-session');
  await verifyEmail(page); await chooseSlot(page);
  await page.getByLabel('What would you like to achieve?').fill('Preserve this useful context.');
  await expect(page.getByRole('alert')).toContainText('hold expired');
  await expect(page.getByLabel('Time zone', { exact: true })).toBeVisible();
  await chooseSlot(page); await expect(page.getByLabel('What would you like to achieve?')).toHaveValue('Preserve this useful context.');
});
test('a confirmation failure checks status without sending another booking', async ({ page }) => {
  const api = await mockBookingApi(page, { failConfirmation: true, holdSeconds: 3 }); await page.goto('/book-session');
  await verifyEmail(page); await chooseSlot(page); await fillBrief(page);
  await page.getByRole('button', { name: 'Confirm counselling session' }).click();
  await expect(page.getByRole('button', { name: 'Choose another time' })).toBeDisabled();
  await expect(page.getByLabel('What would you like to achieve?')).toBeDisabled();
  await expect(page.getByRole('timer')).toHaveText('0:00');
  await page.getByRole('button', { name: 'Check booking status' }).click();
  await expect(page.getByRole('heading', { name: 'Your counselling session is confirmed.' })).toBeVisible();
  expect(api.confirms).toBe(1);
});
test('a contested slot refreshes availability and choosing another time releases the hold', async ({ page }) => {
  const api = await mockBookingApi(page, { slotConflict: true }); await page.goto('/book-session');
  await verifyEmail(page); await page.locator('.ss-slot-button').first().click();
  await expect(page.getByRole('alert')).toContainText('no longer available');
  await chooseSlot(page); await page.getByRole('button', { name: 'Choose another time' }).click();
  await expect.poll(() => api.releases).toBe(1);
  await expect(page.getByLabel('Time zone', { exact: true })).toBeVisible();
});
test('loading, empty, and unavailable services have honest states', async ({ page }) => {
  await mockBookingApi(page, { empty: true }); await page.goto('/');
  await expect(page.getByText('Programmes are being updated.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue to verification' })).toBeDisabled();
  await page.unroute('**/api/booking/**');
  await page.route('**/api/booking/**', route => route.fulfill({ status: 503, json: {} }));
  await page.goto('/book-session'); await fillAbout(page);
  await page.getByRole('button', { name: 'Continue to verification' }).click();
  await expect(page.getByRole('alert')).toContainText('not available yet');
  await expect(page.getByLabel('Email verification code')).toHaveCount(0);
});
test('new journey is accessible and reflows at phone and desktop widths through all steps', async ({ page }) => {
  await mockBookingApi(page, { slotsDelay: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/book-session');
  for (const width of [320, 375, 768, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  for (const transition of [async () => {}, () => fillAbout(page).then(async () => { await page.getByRole('button', { name: 'Continue to verification' }).click(); }), async () => { await page.getByLabel('Email verification code').fill('123456'); await page.getByRole('button', { name: 'Verify email', exact: true }).click(); await expect(page.getByText('Loading available counselling sessions')).toBeAttached(); }, () => chooseSlot(page)]) {
    await transition();
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(scan.violations).toEqual([]);
  }
});
test('prerendered homepage keeps its design and programme details without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage(); await page.goto('http://127.0.0.1:4173/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Build the skills.Shape your next chapter.');
  await expect(page.getByText('Python Full-Stack Software Engineering', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue to verification' })).toBeDisabled();
  // The shared default Ice Blue palette is present even before JavaScript runs.
  expect(await page.locator('.ss-public').evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(247, 249, 251)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await context.close();
});
