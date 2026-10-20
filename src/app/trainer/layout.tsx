import { AppShell } from "@/components/layout/AppShell";

export const metadata = {
  title: "Trainer Portal | Apex Global Academy",
};

export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      user={{
        name: "Trainer",
        email: "trainer@apexacademy.edu",
        role: "TRAINER",
      }}
    >
      {children}
    </AppShell>
  );
}
