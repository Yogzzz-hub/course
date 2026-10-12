import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { AlertCircle, BookOpen, GraduationCap, Table2 } from 'lucide-react';
import { IndividualCourseTable, SavingsMatrix } from './FeeTables';
import { MasterPackageCards } from './MasterPackageCards';
import { academyFeeCatalogue, packageSelection, validateCatalogue } from './pricing';
import type { CourseFeesComparisonProps, FeeView, MasterPackage } from './types';
import './course-fees.css';

const views = [
  { id: 'individual', label: 'Individual Courses', icon: BookOpen },
  { id: 'packages', label: 'Master Packages', icon: GraduationCap },
  { id: 'savings', label: 'Comparative Savings Matrix', icon: Table2 },
] as const;

/** Portable pricing module: routing and authenticated checkout belong to its host. */
export function CourseFeesComparison({ catalogue = academyFeeCatalogue, initialView = 'packages', initialPackageId, onProceed, counsellingHref }: CourseFeesComparisonProps) {
  const id = useId();
  const [view, setView] = useState<FeeView>(initialView);
  const [selectedId, setSelectedId] = useState(initialPackageId ?? catalogue.packages[0]?.id ?? '');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = catalogue.packages.find(tier => tier.id === selectedId) ?? catalogue.packages[0];
  const invalid = validateCatalogue(catalogue);

  function activateTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const destination = event.key === 'ArrowRight' ? (index + 1) % views.length : event.key === 'ArrowLeft' ? (index + views.length - 1) % views.length : event.key === 'Home' ? 0 : event.key === 'End' ? views.length - 1 : null;
    if (destination === null) return;
    event.preventDefault();
    setView(views[destination].id);
    tabs.current[destination]?.focus();
  }
  async function proceed(tier: MasterPackage) {
    if (inFlight.current || invalid) return;
    inFlight.current = true;
    setSelectedId(tier.id);
    setBusyId(tier.id);
    setError('');
    try { await onProceed(packageSelection(catalogue, tier)); }
    catch { setError('We could not open checkout for this package. Please try again.'); }
    finally { inFlight.current = false; setBusyId(null); }
  }
  return <section className="course-fees text-slate-900" aria-labelledby={`${id}-title`}>
    <div className="mb-6"><h3 id={`${id}-title`} className="text-2xl font-semibold tracking-tight">Course fees &amp; master packages</h3><p className="mt-3 text-sm leading-6 text-slate-600">{catalogue.programmeName}. Compare individual fees, package inclusions and listed savings.</p></div>
    {invalid ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{invalid} Please contact the academy for current fees.</div> : <>
      <div role="tablist" aria-label="Course fee views" className="mb-6 grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 sm:grid-cols-3">
        {views.map(({ id: value, label, icon: Icon }, index) => <button key={value} ref={element => { tabs.current[index] = element; }} type="button" role="tab" id={`${id}-tab-${value}`} aria-controls={`${id}-panel-${value}`} aria-selected={view === value} tabIndex={view === value ? 0 : -1} onClick={() => setView(value)} onKeyDown={event => activateTab(event, index)} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 py-3 text-center text-xs font-semibold leading-5 ${view === value ? 'bg-indigo-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}><Icon size={17} className="shrink-0" aria-hidden="true"/>{label}</button>)}
      </div>
      <div id={`${id}-panel-individual`} role="tabpanel" aria-labelledby={`${id}-tab-individual`} tabIndex={0} hidden={view !== 'individual'}>{catalogue.courses.length ? <IndividualCourseTable catalogue={catalogue}/> : <Empty>Individual course fees have not been published yet.</Empty>}</div>
      <div id={`${id}-panel-packages`} role="tabpanel" aria-labelledby={`${id}-tab-packages`} tabIndex={0} hidden={view !== 'packages'}>
        {error && <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle size={18} className="shrink-0" aria-hidden="true"/>{error}</div>}
        {catalogue.packages.length ? <MasterPackageCards catalogue={catalogue} selectedId={selected?.id ?? ''} radioName={`${id}-package`} busyId={busyId} onSelect={setSelectedId} onProceed={tier => void proceed(tier)} counsellingHref={counsellingHref}/> : <Empty>Master packages have not been published yet.</Empty>}
      </div>
      <div id={`${id}-panel-savings`} role="tabpanel" aria-labelledby={`${id}-tab-savings`} tabIndex={0} hidden={view !== 'savings'}>{catalogue.courses.length && catalogue.packages.length ? <SavingsMatrix catalogue={catalogue}/> : <Empty>Both individual fees and package prices are needed to compare savings.</Empty>}</div>
      <p className="mt-6 text-xs leading-6 text-slate-600">Prices are listed in Indian rupees. Master package scope may differ from purchasing every course separately. Confirm taxes, payment schedules and refund terms before payment. Internship descriptions depend on eligibility, availability and confirmed arrangements; placement support does not guarantee employment.</p>
    </>}
  </section>;
}
function Empty({ children }: { children: string }) { return <p role="status" className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">{children}</p>; }
