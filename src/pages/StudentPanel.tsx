import { useSearchParams } from 'react-router-dom';
import { checkoutHref, requestedCheckoutPackage } from '../utils/checkoutIntent';
import {
  StudentPanel,
  createHttpStudentApi,
  createHostedPaymentGateway,
} from "../components/student-panel";

// Always backed by the real API (local PostgreSQL). No synthetic data.
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
  const signInUrl =
    import.meta.env.VITE_STUDENT_SIGN_IN_URL ||
    (checkoutPackageId
      ? `/login?returnTo=${encodeURIComponent(checkoutHref(checkoutPackageId))}`
      : "/login?returnTo=/student-panel");
  return (
    <StudentPanel
      key={checkoutPackageId ?? 'workspace'}
      api={api}
      gateway={gateway}
      signInUrl={signInUrl}
      checkoutPackageId={checkoutPackageId}
    />
  );
}
