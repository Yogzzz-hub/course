import { AppShell } from "@/components/layout/AppShell";
import { getSession } from "@/lib/auth";

export const metadata = {
  title: "Manager Portal | Apex Global Academy",
};

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <AppShell
      user={{
        name: session?.name || "Operations Manager",
        email: session?.email || "manager@apexacademy.edu",
        role: "MANAGER",
      }}
    >
      {children}
    </AppShell>
  );
}
