import { lazy, Suspense, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { checkoutHref, requestedCheckoutPackage } from '../utils/checkoutIntent';
import {
  StudentPanel,
  createHttpStudentApi,
  createHostedPaymentGateway,
  StudentPanelLoading,
} from "../components/student-panel";

// Vite removes this branch and the synthetic data module from production builds.
const LocalPreview = import.meta.env.DEV ? lazy(() => import('../dev/StudentPreview')) : null;

const api = createHttpStudentApi({
  baseUrl: import.meta.env.VITE_STUDENT_API_URL || "/api/student",
});
const gateway = createHostedPaymentGateway(
  (import.meta.env.VITE_PAYMENT_GATEWAY_ORIGINS || "")
    .split(",")
    .map((value: string) => value.trim())
    .filter(Boolean),
);
export default function StudentPanelPage() {
  const [search] = useSearchParams();
  const checkoutPackageId = requestedCheckoutPackage(search);
  const signInUrl = import.meta.env.VITE_STUDENT_SIGN_IN_URL || (checkoutPackageId ? `/auth/sign-in?returnTo=${encodeURIComponent(checkoutHref(checkoutPackageId))}` : undefined);
  const [preview, setPreview] = useState(false);
  if (preview && LocalPreview) return <Suspense fallback={<StudentPanelLoading/>}><LocalPreview onExit={() => setPreview(false)}/></Suspense>;
  return (
    <StudentPanel
      key={checkoutPackageId ?? 'workspace'}
      api={api}
      gateway={gateway}
      signInUrl={signInUrl}
      checkoutPackageId={checkoutPackageId}
      unavailableAction={LocalPreview ? <div className="mt-6 border-t border-slate-200 pt-5"><p className="mb-3 text-sm text-slate-600">Explore the interface with sample data while local services are being connected.</p><button type="button" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800" onClick={() => setPreview(true)}>Open local demo</button></div> : undefined}
    />
  );
}
