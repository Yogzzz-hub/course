import { courses, packages, programme } from '../../data/programmes';
import type { CourseFeeCatalogue, MasterPackage, PackageSelection } from './types';

/** Adapt the existing curriculum source; never maintain a second price list. */
export const academyFeeCatalogue: CourseFeeCatalogue = {
  programmeId: 'python-full-stack',
  programmeName: programme.name,
  currency: 'INR',
  courses: courses.map((course, index) => ({ id: `course-${index + 1}`, name: course.name, feeMinor: course.fee * 100, topics: course.topics })),
  packages: packages.map(tier => ({ id: tier.name.toLowerCase(), name: tier.name, description: tier.caption, priceMinor: tier.price * 100, inclusions: tier.inclusions })),
};
const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export function formatFee(amountMinor: number): string {
  if (!Number.isSafeInteger(amountMinor)) throw new RangeError('Fees must use safe integer minor units.');
  const absolute = BigInt(amountMinor < 0 ? -amountMinor : amountMinor);
  const paise = absolute % 100n;
  return `${amountMinor < 0 ? '-' : ''}${formatter.format(absolute / 100n)}${paise ? `.${String(paise).padStart(2, '0')}` : ''}`;
}

/** Reject malformed CMS prices, duplicate identifiers and unsafe integer totals. */
export function validateCatalogue(catalogue: CourseFeeCatalogue): string | null {
  if (catalogue.currency !== 'INR' || !catalogue.programmeId.trim() || !catalogue.programmeName.trim()) return 'Programme information is incomplete.';
  for (const items of [catalogue.courses, catalogue.packages]) {
    if (new Set(items.map(item => item.id)).size !== items.length || items.some(item => !item.id.trim() || !item.name.trim())) return 'Course or package identifiers are incomplete.';
  }
  const amounts = [...catalogue.courses.map(course => course.feeMinor), ...catalogue.packages.map(tier => tier.priceMinor)];
  if (amounts.some(amount => !Number.isSafeInteger(amount) || amount < 0) || !Number.isSafeInteger(individualTotal(catalogue))) return 'Course fees are unavailable because the pricing data is invalid.';
  return null;
}
export function individualTotal(catalogue: CourseFeeCatalogue): number {
  return catalogue.courses.reduce((total, course) => total + course.feeMinor, 0);
}
export function packageSelection(catalogue: CourseFeeCatalogue, tier: MasterPackage): PackageSelection {
  const total = individualTotal(catalogue);
  return { programmeId: catalogue.programmeId, packageId: tier.id, packageName: tier.name, currency: catalogue.currency, priceMinor: tier.priceMinor, individualTotalMinor: total, savingsMinor: total - tier.priceMinor };
}
export function savingsLabel(savingsMinor: number): string {
  return savingsMinor > 0 ? `${formatFee(savingsMinor)} less` : savingsMinor < 0 ? `${formatFee(-savingsMinor)} more` : 'Same listed price';
}
