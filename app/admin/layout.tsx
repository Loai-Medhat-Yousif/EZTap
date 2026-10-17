import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/auth/require-admin";
import { Sidebar } from "@/components/admin/sidebar";
import { MobileNav } from "@/components/admin/mobile-nav";
import { Topbar } from "@/components/admin/topbar";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getAdminContext();

  // proxy.ts already redirects unauthenticated requests away from
  // /admin/**, but a Server Component should never trust that its
  // request definitely passed through the proxy unchanged — checking
  // again here is what makes this route actually protected rather than
  // protected by convention.
  if (!context) {
    redirect("/login");
  }
  const { user } = context;

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userEmail={user.email} />
        <MobileNav />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
