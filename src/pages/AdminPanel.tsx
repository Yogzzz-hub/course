import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AdminPanel, createHttpAdminApi } from "../components/admin-panel";
import type { AdminApi } from "../components/admin-panel/contracts";
import { createDevFallbackAdminApi } from "../dev/admin-preview-api";

const httpApi = createHttpAdminApi({
  baseUrl: import.meta.env.VITE_ADMIN_API_URL || "/api/admin",
});

export default function AdminPanelPage() {
  const navigate = useNavigate();
  const api: AdminApi = useMemo(() => {
    // Dev-only fallback enabled strictly when import.meta.env.DEV is true.
    // In production builds (import.meta.env.DEV is false), this branch is dead-code eliminated and only httpApi is used.
    if (import.meta.env.DEV) {
      return createDevFallbackAdminApi(httpApi);
    }
    return httpApi;
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
