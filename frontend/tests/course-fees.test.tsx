import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CourseFeesComparison, academyFeeCatalogue, formatFee, individualTotal, packageSelection, savingsLabel, validateCatalogue } from '../src/components/course-fees';
import { checkoutHref, requestedCheckoutPackage } from '../src/utils/checkoutIntent';

describe('official supplied course pricing', () => {
  it('contains all eleven published fees and calculates the exact total', () => {
    expect(academyFeeCatalogue.courses.map(course => course.feeMinor)).toEqual([1200000, 1500000, 1100000, 2000000, 1200000, 1500000, 2200000, 900000, 1500000, 2100000, 500000]);
    expect(individualTotal(academyFeeCatalogue)).toBe(15700000);
    expect(validateCatalogue(academyFeeCatalogue)).toBeNull();
  });
  it('calculates the supplied package prices, savings and callback payloads', () => {
    const selections = academyFeeCatalogue.packages.map(tier => packageSelection(academyFeeCatalogue, tier));
    expect(selections.map(item => [item.packageId, item.priceMinor, item.savingsMinor])).toEqual([['standard', 5999900, 9700100], ['premium', 7999900, 7700100], ['elite', 9999900, 5700100]]);
    expect(selections.every(item => item.programmeId === 'python-full-stack' && item.currency === 'INR' && item.individualTotalMinor === 15700000)).toBe(true);
  });
  it('uses Indian grouping and preserves paise through the safe integer limit', () => {
    expect(formatFee(15700000)).toBe('₹1,57,000');
    expect(formatFee(5999900)).toBe('₹59,999');
    expect(formatFee(101)).toBe('₹1.01');
    expect(formatFee(-1)).toBe('-₹0.01');
    expect(formatFee(Number.MAX_SAFE_INTEGER)).toBe(`₹${new Intl.NumberFormat('en-IN').format(90071992547409n)}.91`);
    expect(() => formatFee(1.1)).toThrow(RangeError);
  });
  it('does not claim savings for packages equal to or more expensive than the baseline', () => {
    expect(savingsLabel(0)).toBe('Same listed price');
    expect(savingsLabel(-10000)).toBe('₹100 more');
  });
  it('fails closed on unsafe, negative, fractional, duplicate or incomplete pricing', () => {
    const cases = [
      { ...academyFeeCatalogue, courses: [{ id: 'x', name: 'Course', feeMinor: -1 }] },
      { ...academyFeeCatalogue, courses: [{ id: 'x', name: 'Course', feeMinor: 1.5 }] },
      { ...academyFeeCatalogue, courses: [{ id: 'x', name: 'Course', feeMinor: Number.MAX_SAFE_INTEGER }, { id: 'y', name: 'Course two', feeMinor: 1 }] },
      { ...academyFeeCatalogue, packages: [academyFeeCatalogue.packages[0], academyFeeCatalogue.packages[0]] },
      { ...academyFeeCatalogue, programmeName: ' ' },
    ];
    for (const catalogue of cases) {
      expect(validateCatalogue(catalogue)).not.toBeNull();
      const html = renderToStaticMarkup(<CourseFeesComparison catalogue={catalogue} onProceed={() => {}}/>);
      expect(html).toContain('role="alert"');
      expect(html).not.toContain('Proceed to Checkout');
    }
  });
  it('renders honest empty states and readable initial content during server rendering', () => {
    const html = renderToStaticMarkup(<CourseFeesComparison catalogue={{ ...academyFeeCatalogue, courses: [], packages: [] }} onProceed={() => {}}/>);
    expect(html).toContain('Individual course fees have not been published');
    expect(html).toContain('Master packages have not been published');
    const published = renderToStaticMarkup(<CourseFeesComparison initialView="individual" onProceed={() => {}}/>);
    expect(published).toContain('₹1,57,000');
    expect(published).toContain('Programming &amp; Python Foundation');
  });
});
describe('checkout intent', () => {
  it('passes only the package identifier and requires an explicit checkout intent', () => {
    expect(checkoutHref('premium')).toBe('/student-panel?package=premium&checkout=1');
    expect(requestedCheckoutPackage(new URLSearchParams('package=premium&checkout=1&priceMinor=1'))).toBe('premium');
    for (const value of ['package=premium', 'checkout=1', 'package=https://evil.test&checkout=1', `package=${'x'.repeat(101)}&checkout=1`]) expect(requestedCheckoutPackage(new URLSearchParams(value))).toBeUndefined();
  });
});
