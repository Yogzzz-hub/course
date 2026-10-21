import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/space-grotesk";
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
    <html lang="en" className="h-full" data-theme="theme-1" data-motion="active">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('academy-theme');
                var motion = localStorage.getItem('academy-motion');
                document.documentElement.dataset.theme = /^theme-[1-4]$/.test(theme || '') ? theme : 'theme-1';
                document.documentElement.dataset.motion = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || motion === 'paused' ? 'paused' : 'active';
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--text)] selection:bg-[var(--accent-soft)] selection:text-[var(--accent)] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
