export type FeeView = 'individual' | 'packages' | 'savings';

/** All amounts are integer paise. Floating-point rupee arithmetic is avoided. */
export interface IndividualCourseFee {
  readonly id: string;
  readonly name: string;
  readonly feeMinor: number;
}
export interface MasterPackage {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly priceMinor: number;
  readonly inclusions: readonly string[];
}
export interface CourseFeeCatalogue {
  readonly programmeId: string;
  readonly programmeName: string;
  readonly currency: 'INR';
  readonly courses: readonly IndividualCourseFee[];
  readonly packages: readonly MasterPackage[];
}
export interface PackageSelection {
  readonly programmeId: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly currency: 'INR';
  /** Display snapshot only. The checkout server must recalculate all prices. */
  readonly priceMinor: number;
  readonly individualTotalMinor: number;
  readonly savingsMinor: number;
}
export interface CourseFeesComparisonProps {
  readonly catalogue?: CourseFeeCatalogue;
  readonly initialView?: FeeView;
  readonly initialPackageId?: string;
  readonly onProceed: (selection: PackageSelection) => void | Promise<void>;
  readonly counsellingHref?: (packageId: string) => string;
}
