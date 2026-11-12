import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { checkoutHref, requestedCheckoutPackage } from '../utils/checkoutIntent';
import {
  StudentPanel,
  StudentApiError,
  createHttpStudentApi,
  createHostedPaymentGateway,
} from "../components/student-panel";
import type { PaymentGateway, StudentApi } from '../components/student-panel/contracts';
import { createStudentPreviewApi } from '../dev/student-preview-api';

const api = createHttpStudentApi({
  baseUrl: import.meta.env.VITE_STUDENT_API_URL || "/api/student",
});
const gateway = createHostedPaymentGateway(
  (import.meta.env.VITE_PAYMENT_GATEWAY_ORIGINS || "")
    .split(",")
    .map((value: string) => value.trim())
    .filter(Boolean),
);
const previewGateway: PaymentGateway = {
  open: async () => {
    throw new StudentApiError(400, "preview");
  },
};

export default function StudentPanelPage() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const checkoutPackageId = requestedCheckoutPackage(search);
  const signInUrl = import.meta.env.VITE_STUDENT_SIGN_IN_URL || (checkoutPackageId ? `/auth/sign-in?returnTo=${encodeURIComponent(checkoutHref(checkoutPackageId))}` : undefined);
  const modeParam = search.get("mode");
  const directMode = modeParam === "prospect" || modeParam === "enrolled" ? modeParam : null;

  const directApi = useMemo<StudentApi | null>(() => {
    if (!directMode) return null;
    const base = createStudentPreviewApi(directMode);
    return {
      ...base,
      logout: async () => {
        try {
          localStorage.removeItem("crm_session");
        } catch {}
        navigate("/login");
      },
    };
  }, [directMode, navigate]);

  return (
    <StudentPanel
      key={directMode ?? checkoutPackageId ?? 'workspace'}
      api={directApi ?? api}
      gateway={directApi ? previewGateway : gateway}
      signInUrl={signInUrl}
      checkoutPackageId={checkoutPackageId}
    />
  );
}
