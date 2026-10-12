import { AdminPanel, createHttpAdminApi } from "../components/admin-panel";
const api = createHttpAdminApi({
  baseUrl: import.meta.env.VITE_ADMIN_API_URL || "/api/admin",
});
export default function AdminPanelPage() {
  return (
    <AdminPanel
      api={api}
      signInUrl={import.meta.env.VITE_ADMIN_SIGN_IN_URL || undefined}
    />
  );
}
