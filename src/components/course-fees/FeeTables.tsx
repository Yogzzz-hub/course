import {
  ArrowDownRight,
  Binary,
  Box,
  CheckCircle2,
  Code2,
  Cpu,
  Database,
  Globe,
  Layers3,
  Server,
  Sparkles,
  Terminal,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { formatFee, individualTotal, savingsLabel } from './pricing';
import type { CourseFeeCatalogue } from './types';

const courseIcons = [
  Terminal,      // 01. Programming & Python Foundation
  Code2,         // 02. Advanced Python & Software Development
  Database,      // 03. SQL & PostgreSQL
  Server,        // 04. Django & Backend Development
  Globe,         // 05. HTML, CSS & JavaScript
  Layers3,       // 06. React Development
  Cpu,           // 07. Full-Stack Application Development
  CheckCircle2,  // 08. Software Engineering, Testing & APIs
  Box,           // 09. DevOps, Docker & Deployment
  Binary,        // 10. DSA & Technical Interview Preparation
  Sparkles,      // 11. AI-Assisted Development
];

export function IndividualCourseTable({ catalogue }: { catalogue: CourseFeeCatalogue }) {
  const total = individualTotal(catalogue);
  return (
    <div className="space-y-6">
      {/* Individual Courses Animated Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {catalogue.courses.map((course, index) => {
          const Icon = courseIcons[index % courseIcons.length];
          return (
            <article
              key={course.id}
              className="individual-course-card group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-950/5"
              style={{
                animation: 'cardFadeSlideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
                animationDelay: `${index * 45}ms`,
              }}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 font-mono text-xs font-bold text-indigo-700">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="flex size-9 items-center justify-center rounded-xl bg-slate-50 text-slate-700 transition-colors duration-200 group-hover:bg-indigo-600 group-hover:text-white">
                    <Icon size={18} aria-hidden="true" />
                  </div>
                </div>
                <h4 className="mt-3.5 text-base font-semibold leading-snug text-slate-900 group-hover:text-indigo-950">
                  {course.name}
                </h4>
                {course.topics && course.topics.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {course.topics.map(topic => (
                      <span
                        key={topic}
                        className="rounded-md bg-slate-100/90 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-5 flex items-baseline justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">Standalone fee</span>
                <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-indigo-700">
                  {formatFee(course.feeMinor)}
                </span>
              </div>
            </article>
          );
        })}
      </div>

      {/* Summary table card that provides clear total and matches test accessibility expectations */}
      <div className="total-summary-card overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/50 p-5 shadow-sm sm:p-6">
        <table className="fees-table w-full text-left" role="table">
          <caption className="sr-only">Total for all individual courses</caption>
          <tbody>
            <tr className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <th scope="row" className="font-semibold text-slate-900 text-sm sm:text-base border-none p-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100/80 px-2.5 py-0.5 text-xs font-bold text-indigo-800 mb-1.5">
                  <Zap size={13} aria-hidden="true" /> All {catalogue.courses.length} courses combined
                </span>
                <span className="block font-bold text-slate-900">Total for all {catalogue.courses.length} individual courses</span>
                <span className="block text-xs font-normal text-slate-500 mt-0.5">Purchased individually without package bundles</span>
              </th>
              <td className="fees-money text-2xl sm:text-3xl font-extrabold text-indigo-900 border-none p-0 whitespace-nowrap">
                {formatFee(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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
          className="relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          style={{ animation: 'cardFadeSlideUp 0.4s ease-out both' }}
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
        {catalogue.packages.map((tier, index) => {
          const savings = baseline - tier.priceMinor;
          const percent = baseline > 0 ? Math.round((savings / baseline) * 100) : 0;
          return (
            <article
              key={tier.id}
              className="relative flex flex-col justify-between rounded-2xl border-2 border-indigo-100 bg-white p-5 transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-600 hover:shadow-xl"
              style={{
                animation: 'cardFadeSlideUp 0.4s ease-out both',
                animationDelay: `${(index + 1) * 60}ms`,
              }}
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
                <p className="text-2xl font-bold text-indigo-950">{formatFee(tier.priceMinor)}</p>
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

      {/* Accessible Detailed Comparison Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white" role="region" aria-label="Course and master package savings comparison" tabIndex={0}>
        <table className="fees-table w-full min-w-[560px] text-left text-sm">
          <caption className="sr-only">Comparative savings matrix in Indian rupees</caption>
          <thead>
            <tr className="bg-slate-50">
              <th scope="col">Learning option</th>
              <th scope="col" className="fees-money">Listed price</th>
              <th scope="col" className="fees-money">Difference from individual total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className="font-medium">All {catalogue.courses.length} individual courses purchased separately</th>
              <td className="fees-money font-semibold">{formatFee(baseline)}</td>
              <td className="fees-money text-slate-600">Baseline price</td>
            </tr>
            {catalogue.packages.map(tier => (
              <tr key={tier.id}>
                <th scope="row" className="font-medium">{tier.name} Master Course</th>
                <td className="fees-money font-semibold">{formatFee(tier.priceMinor)}</td>
                <td className="fees-money font-semibold text-indigo-800">
                  <span className="inline-flex items-center gap-1">
                    {baseline > tier.priceMinor && <ArrowDownRight size={15} aria-hidden="true"/>}
                    {savingsLabel(baseline - tier.priceMinor)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500 sm:hidden">Swipe horizontally to see every comparison column.</p>
    </div>
  );
}

