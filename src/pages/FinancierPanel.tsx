import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getRedirectPathForSession,
  isFinancierAuthorized,
  readCrmSession,
} from "../utils/authSession";
import { ToastProvider } from "../components/shared";
import { FinancierWorkspace } from "../components/financier";

/**
 * Route host for /financier and its sub-paths.
 *
 * The workspace reads every figure from PostgreSQL through /api/financier.
 * It replaced the previous in-file demo dataset; the workspace owns its own
 * navigation for /financier/fees, /payments, /ledger, /payroll, /collections,
 * /reports, /invoices/:id and /students/:id.
 */
export default function FinancierPanel() {
  const navigate = useNavigate();

  useEffect(() => {
    const session = readCrmSession();
    if (session && !isFinancierAuthorized(session)) {
      const target = getRedirectPathForSession(session);
      navigate(target, { replace: true });
    }
  }, [navigate]);

  return (
    <ToastProvider>
      <FinancierWorkspace />
    </ToastProvider>
  );
}
