import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Northwind Analytics",
    template: "%s · Northwind Analytics",
  },
  description:
    "Production analytics dashboard for customers, orders and system activity.",
};

/**
 * Root layout — a Server Component.
 *
 * The shell (sidebar, main landmark) is rendered once on the server and
 * persists across navigations; only the `children` slot changes. The sidebar
 * itself is a Client Component for active-link highlighting, so it is an island
 * inside an otherwise server-rendered tree.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <div className="flex min-h-dvh flex-col md:flex-row">
          <Sidebar />
          <main id="main" className="min-w-0 flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
