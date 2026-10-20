import { AppShell } from "@/components/layout/AppShell";

export const metadata = {
  title: "Manager Portal | Apex Global Academy",
};

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      user={{
        name: "Branch Manager",
        email: "manager@apexacademy.edu",
        role: "MANAGER",
      }}
    >
      {children}
    </AppShell>
  );
}
