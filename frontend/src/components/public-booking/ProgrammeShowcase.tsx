import type { Programme } from './types';
import { ErrorNotice, Skeleton } from './ui';
import { CourseFeesComparison } from '../course-fees';
import { checkoutHref } from '../../utils/checkoutIntent';
import { useState } from 'react';
import { feeTotal, formatMoney } from './validation';

interface Props {
  programmes: Programme[];
  status: 'loading' | 'ready' | 'error';
  error: string;
  onRetry: () => void;
  onBook: (programmeId: string, packageId: string, addonIds: string[]) => void;
  bookingStarted: boolean;
}

export function ProgrammeShowcase({ programmes, status, error, onRetry, onBook, bookingStarted }: Props) {
  const [packageId,setPackageId]=useState('standard');
  const [addonIds,setAddonIds]=useState<string[]>([]);
  const programme=programmes.find(p=>p.id==='python-full-stack');
  const total=programme?feeTotal(programme,packageId,addonIds):null;
  return (
    <section id="ss-programmes" aria-label="Course fees & master packages" className="ss-section mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
      {status === 'loading' ? (
        <Skeleton label="Loading programmes" />
      ) : status === 'error' ? (
        <div className="space-y-4">
          <ErrorNotice>{error}</ErrorNotice>
          <button
            type="button"
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700"
            onClick={onRetry}
          >
            Retry programmes
          </button>
        </div>
      ) : !programmes.length ? <p role="status">Programmes are being updated.</p> : (<>
        <CourseFeesComparison onSelectionChange={value=>{setPackageId(value);setAddonIds([]);}}
          onProceed={selection => {
            window.location.href = checkoutHref(selection.packageId);
          }}
          counsellingHref={packageId => `/book-session?package=${encodeURIComponent(packageId)}`}
        />
        {programme && programme.addons.length>0 && <fieldset disabled={bookingStarted} className="mt-6 rounded-xl border border-slate-300 p-5"><legend>Optional programme extras</legend>{programme.addons.map(addon=><label className="flex min-h-12 items-center gap-3" key={addon.id}><input type="checkbox" checked={addonIds.includes(addon.id)} onChange={e=>setAddonIds(previous=>e.target.checked?[...previous,addon.id]:previous.filter(id=>id!==addon.id))}/>{addon.title} · {formatMoney(addon.priceMinor,programme.currency)}</label>)}{total!==null&&<p>Selected package and extras: <output>{formatMoney(total,programme.currency)}</output></p>}<button className="mt-4 min-h-12 rounded-xl border border-slate-400 px-5" type="button" onClick={()=>onBook(programme.id,packageId,addonIds)}>Discuss this package</button></fieldset>}
      </>)}
    </section>
  );
}
