import { ArrowUpRight, Check, CircleCheck, LoaderCircle } from 'lucide-react';
import { formatFee, individualTotal, savingsLabel } from './pricing';
import type { CourseFeeCatalogue, MasterPackage } from './types';

interface Props {
  catalogue: CourseFeeCatalogue;
  selectedId: string;
  radioName: string;
  busyId: string | null;
  onSelect: (id: string) => void;
  onProceed: (tier: MasterPackage) => void;
  counsellingHref?: (id: string) => string;
}
export function MasterPackageCards({ catalogue, selectedId, radioName, busyId, onSelect, onProceed, counsellingHref }: Props) {
  const baseline = individualTotal(catalogue);
  return <fieldset disabled={busyId !== null}>
    <legend className="sr-only">Choose a master package</legend>
    <div className="grid gap-4 lg:grid-cols-3">
      {catalogue.packages.map(tier => {
        const selected = tier.id === selectedId;
        return <article key={tier.id} className={`flex min-w-0 flex-col rounded-2xl border-2 bg-white p-5 sm:p-6 ${selected ? 'border-indigo-700' : 'border-slate-200'}`} aria-label={`${tier.name} master package`}>
          <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
            <span className="text-xl font-semibold">{tier.name}<span className="sr-only"> package</span></span>
            <input type="radio" name={radioName} value={tier.id} checked={selected} onChange={() => onSelect(tier.id)} className="size-5 shrink-0 accent-indigo-700"/>
          </label>
          <p className="mt-2 min-h-10 text-sm leading-6 text-slate-600">{tier.description}</p>
          <p className="mt-5 text-3xl font-bold tracking-tight">{formatFee(tier.priceMinor)}</p>
          <p className="mt-1 text-xs text-slate-600">Listed master package fee</p>
          {catalogue.courses.length > 0 && <p className="mt-4 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-800">{savingsLabel(baseline - tier.priceMinor)}<span className="mt-1 block text-xs font-normal">than all individual courses separately</span></p>}
          <ul className="my-6 flex-1 space-y-3">{tier.inclusions.map((inclusion, index) => <li key={`${inclusion}-${index}`} className="flex items-start gap-2 text-sm leading-6 text-slate-700"><Check size={16} className="mt-1 shrink-0 text-indigo-700" aria-hidden="true"/><span>{inclusion}</span></li>)}</ul>
          <p className={`mb-3 flex min-h-5 items-center gap-1.5 text-xs font-semibold ${selected ? 'text-indigo-800' : 'text-slate-600'}`}>{selected ? <><CircleCheck size={14} aria-hidden="true"/>Selected package</> : 'Select to compare your options'}</p>
          <button type="button" onClick={() => onProceed(tier)} aria-label={`Select ${tier.name} package and proceed to checkout`} aria-busy={busyId === tier.id} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-3 text-center text-xs font-semibold leading-5 text-white hover:bg-indigo-800 disabled:cursor-wait disabled:opacity-60">{busyId === tier.id ? <><LoaderCircle size={16} className="shrink-0 animate-spin" aria-hidden="true"/>Opening checkout…</> : <>Select Package &amp; Proceed to Checkout<ArrowUpRight size={16} className="shrink-0" aria-hidden="true"/></>}</button>
          {counsellingHref && <a href={counsellingHref(tier.id)} className="mt-2 inline-flex min-h-11 items-center justify-center text-sm font-semibold text-indigo-800 underline decoration-slate-300 underline-offset-4">Discuss {tier.name}</a>}
        </article>;
      })}
    </div>
  </fieldset>;
}
