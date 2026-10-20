import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apex Global Academy | Enterprise Technical & Architecture Academy",
  description:
    "Official portal for Apex Global Academy. Comprehensive programs in software engineering, distributed systems, cloud computing, and applied machine learning.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#FBF9F5] text-[#251923] selection:bg-[#F6EBCF] selection:text-[#6D1A2B]">
        {children}
      </body>
    </html>
  );
}
