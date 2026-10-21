import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();

  // If already authenticated, redirect smoothly to user's assigned role dashboard
  if (session) {
    switch (session.role) {
      case "ADMIN":
        redirect("/admin");
      case "MANAGER":
        redirect("/manager");
      case "FINANCIER":
        redirect("/financier");
      case "TRAINER":
        redirect("/trainer");
      case "STUDENT":
        redirect("/student");
      default:
        redirect("/login");
    }
  }

  // Direct unauthenticated visitors to CRM portal login
  redirect("/login");
}
