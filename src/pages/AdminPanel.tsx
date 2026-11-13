import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AdminPanel, createHttpAdminApi } from "../components/admin-panel";
import type { AdminApi } from "../components/admin-panel/contracts";

const httpApi = createHttpAdminApi({
  baseUrl: import.meta.env.VITE_ADMIN_API_URL || "/api/admin",
});

export default function AdminPanelPage() {
  const navigate = useNavigate();
  const api: AdminApi = useMemo(() => {
    return createDevFallbackAdminApi(httpApi);
  }, []);

  return (
    <AdminPanel
      api={api}
      signInUrl={import.meta.env.VITE_ADMIN_SIGN_IN_URL || "/login"}
      onLogout={() => {
        try {
          localStorage.removeItem("crm_session");
        } catch {}
        navigate("/login", { replace: true });
      }}
    />
  );
}
