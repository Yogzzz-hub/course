import { AppShell } from "@/components/layout/AppShell";
import { getSession } from "@/lib/auth";

export const metadata = {
  title: "Admin Portal | Apex Global Academy",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <AppShell
      user={{
        name: session?.name || "System Admin",
        email: session?.email || "admin@apexacademy.edu",
        role: "ADMIN",
      }}
    >
      {children}
    </AppShell>
  );
}
