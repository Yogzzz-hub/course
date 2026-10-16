import type { Programme } from './types';
import { ErrorNotice, Skeleton } from './ui';
import { CourseFeesComparison } from '../course-fees';
import { checkoutHref } from '../../utils/checkoutIntent';

interface Props {
  programmes: Programme[];
  status: 'loading' | 'ready' | 'error';
  error: string;
  onRetry: () => void;
  onBook: (programmeId: string, packageId: string, addonIds: string[]) => void;
  bookingStarted: boolean;
}

export function ProgrammeShowcase({ status, error, onRetry }: Props) {
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
      ) : (
        <CourseFeesComparison
          onProceed={selection => {
            window.location.href = checkoutHref(selection.packageId);
          }}
          counsellingHref={packageId => `/book-session?package=${encodeURIComponent(packageId)}`}
        />
      )}
    </section>
  );
}
