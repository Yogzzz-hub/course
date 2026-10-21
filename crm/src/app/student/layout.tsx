import { AppShell } from "@/components/layout/AppShell";

export const metadata = {
  title: "Student Portal | Apex Global Academy",
};

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      user={{
        name: "Student",
        email: "student@apexacademy.edu",
        role: "STUDENT",
      }}
    >
      {children}
    </AppShell>
  );
}
