import { useMemo } from "react";
import { AdminPanel, createHttpAdminApi } from "../components/admin-panel";
import type { AdminApi } from "../components/admin-panel/contracts";

const httpApi = createHttpAdminApi({
  baseUrl: import.meta.env.VITE_ADMIN_API_URL || "/api/admin",
});

export default function AdminPanelPage() {
  // Always backed by the real API (local PostgreSQL). No synthetic data.
  const api: AdminApi = useMemo<AdminApi>(() => httpApi, []);

  return (
    <AdminPanel
      api={api}
      signInUrl={import.meta.env.VITE_ADMIN_SIGN_IN_URL || undefined}
    />
  );
}
