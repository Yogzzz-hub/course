import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FinancierWorkspace } from "../components/financier";
import { ToastProvider } from "../components/shared";
import {
  getRedirectPathForSession,
  isFinancierAuthorized,
  readCrmSession,
} from "../utils/authSession";
import "../components/shared/shared.css";

export default function FinancierPanel() {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const session = readCrmSession();
    if (!isFinancierAuthorized(session)) {
      const target = getRedirectPathForSession(session);
      setChecked(true);
      navigate(target, { replace: true });
      return;
    }
    setAuthorized(true);
    setChecked(true);
  }, [navigate]);

  if (!checked || !authorized) {
    return (
      <div className="fin-portal">
        <main
          style={{
            padding: "48px 24px",
            maxWidth: "620px",
            margin: "0 auto",
          }}
        >
          <h1>Apex Academy — Financier Portal</h1>
          <p style={{ marginTop: 10 }}>
            Verifying finance controller session and access permissions...
          </p>
        </main>
      </div>
    );
  }

  return (
    <ToastProvider>
      <FinancierWorkspace />
    </ToastProvider>
  );
}
