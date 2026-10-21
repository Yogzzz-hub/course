import { AppShell } from "@/components/layout/AppShell";
import { getSession } from "@/lib/auth";

export const metadata = {
  title: "Student Portal | Apex Global Academy",
};

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <AppShell
      user={{
        name: session?.name || "Student",
        email: session?.email || "student@apexacademy.edu",
        role: "STUDENT",
        registrationNumber: session?.registrationNumber,
      }}
    >
      {children}
    </AppShell>
  );
}
