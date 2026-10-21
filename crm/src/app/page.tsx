import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { CourseNavbar } from "@/frontend/components/layout/CourseNavbar";
import { CourseFooter } from "@/frontend/components/layout/CourseFooter";
import { HomeLanding } from "@/frontend/components/home/HomeLanding";

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

  return (
    <div className="min-h-screen bg-[#140D13] flex flex-col justify-between text-white selection:bg-[#681C35] selection:text-white">
      {/* Sleek Course Navigation with prominent CRM Portal Sign-In */}
      <CourseNavbar />

      {/* Full Interactive Course Experience (3D Eclipse, Arenas, Programs, Pricing) */}
      <main className="flex-1">
        <HomeLanding />
      </main>

      {/* Academy Footer */}
      <CourseFooter />
    </div>
  );
}
