import { AppShell } from "@/components/layout/AppShell";
import { getSession } from "@/lib/auth";

export const metadata = {
  title: "Trainer Portal | Apex Global Academy",
};

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <AppShell
      user={{
        name: session?.name || "Faculty Trainer",
        email: session?.email || "trainer@apexacademy.edu",
        role: "TRAINER",
      }}
    >
      {children}
    </AppShell>
  );
}
