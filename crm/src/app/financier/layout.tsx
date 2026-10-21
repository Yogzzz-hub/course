import { AppShell } from "@/components/layout/AppShell";

export const metadata = {
  title: "Financier Portal | Apex Global Academy",
};

export default function FinancierLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      user={{
        name: "Financier",
        email: "financier@apexacademy.edu",
        role: "FINANCIER",
      }}
    >
      {children}
    </AppShell>
  );
}
