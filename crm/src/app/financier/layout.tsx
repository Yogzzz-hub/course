import { AppShell } from "@/components/layout/AppShell";
import { getSession } from "@/lib/auth";

export const metadata = {
  title: "Financier Portal | Apex Global Academy",
};

export default async function FinancierLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <AppShell
      user={{
        name: session?.name || "Financial Officer",
        email: session?.email || "financier@apexacademy.edu",
        role: "FINANCIER",
      }}
    >
      {children}
    </AppShell>
  );
}
