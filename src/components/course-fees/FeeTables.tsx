import { ArrowDownRight } from 'lucide-react';
import { formatFee, individualTotal, savingsLabel } from './pricing';
import type { CourseFeeCatalogue } from './types';

export function IndividualCourseTable({ catalogue }: { catalogue: CourseFeeCatalogue }) {
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <table className="fees-table w-full text-left text-sm">
      <caption className="sr-only">Individual course fees in Indian rupees</caption>
      <thead><tr className="bg-slate-50"><th scope="col">Individual course</th><th scope="col" className="fees-money">Fee</th></tr></thead>
      <tbody>{catalogue.courses.map((course, index) => <tr key={course.id}><th scope="row" className="font-medium"><span className="mr-2 text-xs text-slate-500">{String(index + 1).padStart(2, '0')}.</span>{course.name}</th><td className="fees-money font-semibold">{formatFee(course.feeMinor)}</td></tr>)}</tbody>
      <tfoot><tr className="bg-indigo-50 text-indigo-900"><th scope="row">Total for all {catalogue.courses.length} individual courses</th><td className="fees-money font-bold">{formatFee(individualTotal(catalogue))}</td></tr></tfoot>
    </table>
  </div>;
}

export function SavingsMatrix({ catalogue }: { catalogue: CourseFeeCatalogue }) {
  const baseline = individualTotal(catalogue);
  return <div>
    <p className="mb-4 text-sm leading-6 text-slate-600">Compare listed package prices against buying all {catalogue.courses.length} individual courses separately.</p>
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white" role="region" aria-label="Course and master package savings comparison" tabIndex={0}>
      <table className="fees-table w-full min-w-[560px] text-left text-sm">
        <caption className="sr-only">Comparative savings matrix in Indian rupees</caption>
        <thead><tr className="bg-slate-50"><th scope="col">Learning option</th><th scope="col" className="fees-money">Listed price</th><th scope="col" className="fees-money">Difference from individual total</th></tr></thead>
        <tbody>
          <tr><th scope="row" className="font-medium">All {catalogue.courses.length} individual courses purchased separately</th><td className="fees-money font-semibold">{formatFee(baseline)}</td><td className="fees-money text-slate-600">Baseline price</td></tr>
          {catalogue.packages.map(tier => <tr key={tier.id}><th scope="row" className="font-medium">{tier.name} Master Course</th><td className="fees-money font-semibold">{formatFee(tier.priceMinor)}</td><td className="fees-money font-semibold text-indigo-800"><span className="inline-flex items-center gap-1">{baseline > tier.priceMinor && <ArrowDownRight size={15} aria-hidden="true"/>}{savingsLabel(baseline - tier.priceMinor)}</span></td></tr>)}
        </tbody>
      </table>
    </div>
    <p className="mt-3 text-xs text-slate-600 sm:hidden">Swipe horizontally to see every comparison column.</p>
  </div>;
}
