import { Check, Clock3, Layers3, Minus, X } from 'lucide-react';
import { useState } from 'react';
import type { Programme } from './types';
import { feeTotal, formatMoney } from './validation';
import { ActionButton, ErrorNotice, Skeleton } from './ui';

interface Props {
  programmes: Programme[];
  status: 'loading' | 'ready' | 'error';
  error: string;
  onRetry: () => void;
  onBook: (programmeId: string, packageId: string, addonIds: string[]) => void;
  bookingStarted: boolean;
}
export function ProgrammeShowcase({ programmes, status, error, onRetry, onBook, bookingStarted }: Props) {
  const [selectedId, setSelectedId] = useState('');
  const selected = programmes.find(item => item.id === selectedId) ?? programmes[0];
  return <section id="ss-programmes" aria-labelledby="ss-programmes-title" className="ss-section mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><span className="ss-kicker">01 / FIND YOUR DIRECTION</span><h2 id="ss-programmes-title" className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">A programme. A clear plan.</h2></div><p className="ss-copy max-w-md text-sm leading-relaxed text-slate-600">Explore the learning path, compare inclusions, and calculate the listed fee before your counselling call.</p></div>
    {status === 'loading' ? <Skeleton label="Loading programmes"/> : status === 'error' ? <div className="space-y-4"><ErrorNotice>{error}</ErrorNotice><ActionButton secondary onClick={onRetry}>Retry programmes</ActionButton></div> : programmes.length === 0 ? <div role="status" className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><Layers3 className="mx-auto mb-4 text-slate-500" aria-hidden="true"/><h3 className="text-lg font-semibold text-slate-900">Programmes are being updated.</h3><p className="ss-copy mt-2 text-sm text-slate-600">There are no published programmes available for booking right now.</p><ActionButton secondary className="mt-5" onClick={onRetry}>Check again</ActionButton></div> : <>
      <div className={`grid gap-4 ${programmes.length > 1 ? 'md:grid-cols-2 lg:grid-cols-3' : ''}`} role="group" aria-label="Choose a programme to compare">{programmes.map(programme => <button key={programme.id} type="button" aria-pressed={programme.id === selected.id} onClick={() => setSelectedId(programme.id)} className={`ss-programme-card rounded-2xl border p-6 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600 ${programme.id === selected.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-400'}`}><div className="mb-4 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-xs font-medium text-slate-600"><Clock3 size={14} aria-hidden="true"/>{programme.duration}</span>{programme.id === selected.id && <Check size={18} className="text-indigo-700" aria-hidden="true"/>}</div><span className="block text-xl font-semibold tracking-tight text-slate-950">{programme.title}</span><span className="mt-3 block max-w-3xl text-sm leading-relaxed text-slate-600">{programme.summary}</span><span className="mt-5 flex flex-wrap gap-2">{programme.technologies.map(technology => <span key={technology} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700">{technology}</span>)}</span></button>)}</div>
      {selected && <PackageCalculator key={selected.id} programme={selected} bookingStarted={bookingStarted} onBook={onBook}/>}
      {selected?.id === 'python-full-stack' && <a href="/programmes/python-full-stack#pricing" className="mt-6 inline-flex min-h-11 items-center text-sm font-semibold text-indigo-800 underline underline-offset-4">View all 11 course fees and master package savings</a>}
    </>}
  </section>;
}

function PackageCalculator({ programme, onBook, bookingStarted }: { programme: Programme; onBook: Props['onBook']; bookingStarted: boolean }) {
  const [packageId, setPackageId] = useState(programme.packages[0]?.id ?? '');
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const total = feeTotal(programme, packageId, addonIds);
  const labels = [...new Set(programme.packages.flatMap(tier => tier.inclusions.map(item => item.label)))];
  return <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div className="border-b border-slate-200 p-6 sm:p-8"><h3 className="text-xl font-semibold text-slate-950">Compare packages</h3><p className="ss-copy mt-2 text-sm text-slate-600">{programme.title}</p></div>
    {programme.packages.length ? <>
      <div className="overflow-x-auto p-6 sm:p-8" tabIndex={0} role="region" aria-label={`${programme.title} package comparison`}><table className="ss-comparison min-w-full text-left text-sm"><caption className="sr-only">Package fees and inclusions for {programme.title}</caption><thead><tr><th scope="col" className="min-w-44">Inclusions</th>{programme.packages.map(tier => <th scope="col" key={tier.id} className="min-w-44"><label className="flex cursor-pointer items-start gap-3"><input type="radio" name={`package-${programme.id}`} value={tier.id} checked={tier.id === packageId} onChange={() => setPackageId(tier.id)} className="mt-1 size-4 accent-indigo-700"/><span><span className="block font-semibold text-slate-950">{tier.name}</span><span className="mt-1 block whitespace-nowrap font-normal text-slate-700">{formatMoney(tier.priceMinor, programme.currency)}</span></span></label></th>)}</tr></thead><tbody>{labels.map(label => <tr key={label}><th scope="row" className="font-normal text-slate-700">{label}</th>{programme.packages.map(tier => { const inclusion = tier.inclusions.find(item => item.label === label); const included = inclusion?.included; return <td key={tier.id}><span className={`inline-flex items-center gap-2 text-xs ${included ? 'text-emerald-800' : 'text-slate-600'}`}>{included ? <Check size={15} aria-hidden="true"/> : inclusion ? <X size={15} aria-hidden="true"/> : <Minus size={15} aria-hidden="true"/>}{included ? 'Included' : inclusion ? 'Not included' : 'Not specified'}</span></td>; })}</tr>)}</tbody></table></div>
      <div className="grid gap-8 border-t border-slate-200 bg-slate-50 p-6 sm:p-8 lg:grid-cols-[1fr_auto]">
        <div>{programme.addons.length > 0 && <fieldset className="mb-5 space-y-3"><legend className="mb-3 text-sm font-semibold text-slate-900">Optional extras</legend>{programme.addons.map(addon => <label key={addon.id} className="flex cursor-pointer items-center gap-3 text-sm text-slate-700"><input type="checkbox" checked={addonIds.includes(addon.id)} onChange={event => setAddonIds(ids => event.target.checked ? [...ids, addon.id] : ids.filter(id => id !== addon.id))} className="size-4 accent-indigo-700"/>{addon.title}<span className="font-medium">+ {formatMoney(addon.priceMinor, programme.currency)}</span></label>)}</fieldset>}<p className="ss-copy max-w-2xl text-xs leading-relaxed text-slate-600">{programme.feeDisclosure}</p></div>
        <div className="min-w-0 lg:text-right"><span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Listed package + selected extras</span><output aria-live="polite" className="mt-2 block text-3xl font-semibold tracking-tight text-slate-950">{total === null ? 'Select a package' : formatMoney(total, programme.currency)}</output><ActionButton className="mt-5 w-full sm:w-auto" onClick={() => onBook(programme.id, packageId, addonIds)}>{bookingStarted ? 'Continue your booking' : 'Discuss this package'}</ActionButton></div>
      </div>
    </> : <div className="p-8"><p className="ss-copy text-sm text-slate-600">Package fees have not been published. Discuss the programme during counselling.</p><ActionButton className="mt-5" onClick={() => onBook(programme.id, '', [])}>Discuss programme</ActionButton></div>}
  </div>;
}
