import { ArrowDownRight, TrendingDown } from 'lucide-react';
import { formatFee, individualTotal } from './pricing';
import type { CourseFeeCatalogue } from './types';

/** Every course as a line in a price list: the name and what it covers, then its standalone fee. */
export function IndividualCourseTable({ catalogue }: { catalogue: CourseFeeCatalogue }) {
  const total = individualTotal(catalogue);
  return (
    <div className="fee-list-wrap">
      <div className="fee-list">
        {catalogue.courses.map(course => (
          <article key={course.id} className="fee-row">
            <div>
              <h4>{course.name}</h4>
              {course.topics && course.topics.length > 0 && <p className="fee-row-topics">{course.topics.join(', ')}</p>}
            </div>
            <p className="fee-row-price"><span className="sr-only">Standalone fee </span>{formatFee(course.feeMinor)}</p>
          </article>
        ))}
      </div>
      <table className="fees-table fee-total">
        <caption className="sr-only">Total for all individual courses</caption>
        <tbody>
          <tr>
            <th scope="row">
              <span className="fee-total-label">Total for all {catalogue.courses.length} individual courses</span>
              <span className="fee-total-note">Purchased individually, without a package</span>
            </th>
            <td className="fees-money">{formatFee(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function SavingsMatrix({ catalogue }: { catalogue: CourseFeeCatalogue }) {
  const baseline = individualTotal(catalogue);
  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 border border-slate-200">
        <p className="font-medium text-slate-900 mb-0.5">
          Bundled savings comparison
        </p>
        <p className="text-xs leading-relaxed text-slate-600">
          Compare listed package prices against buying all {catalogue.courses.length} individual courses separately.
        </p>
      </div>

      {/* Animated Savings Comparison Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Baseline Card */}
        <article
          className="relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5"
        >
          <div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              Baseline Option
            </span>
            <h4 className="mt-3 text-base font-semibold text-slate-900">
              All {catalogue.courses.length} Courses
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Purchased separately one-by-one
            </p>
          </div>
          <div className="mt-6 border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500">Combined total</p>
            <p className="text-2xl font-bold text-slate-900">{formatFee(baseline)}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Baseline price</p>
          </div>
        </article>

        {/* Package Savings Cards */}
        {catalogue.packages.map(tier => {
          const savings = baseline - tier.priceMinor;
          const percent = baseline > 0 ? Math.round((savings / baseline) * 100) : 0;
          return (
            <article
              key={tier.id}
              className="relative flex flex-col justify-between rounded-2xl border-2 border-indigo-100 bg-white p-5"
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                    {tier.name}
                  </span>
                  {savings > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                      <TrendingDown size={13} aria-hidden="true" />
                      {percent}% off
                    </span>
                  )}
                </div>
                <h4 className="mt-3 text-base font-semibold text-slate-900">
                  {tier.name} Master Course
                </h4>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                  {tier.description}
                </p>
              </div>
              <div className="mt-6 border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-500">Package price</p>
                <p className="text-2xl font-bold text-slate-900">{formatFee(tier.priceMinor)}</p>
                {savings > 0 && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <ArrowDownRight size={14} aria-hidden="true" />
                    Save {formatFee(savings)}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

