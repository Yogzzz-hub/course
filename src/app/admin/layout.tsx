import { AppShell } from "@/components/layout/AppShell";

export const metadata = {
  title: "Admin Portal | Apex Global Academy",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      user={{
        name: "System Admin",
        email: "admin@apexacademy.edu",
        role: "ADMIN",
      }}
    >
      {children}
    </AppShell>
  );
}
