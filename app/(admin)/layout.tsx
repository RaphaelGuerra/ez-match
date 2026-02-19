import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-zinc-200 bg-white/80 backdrop-blur-md">
        <main className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <p className="text-lg font-semibold">EZ-Match</p>
            <nav className="flex items-center gap-3 text-sm text-zinc-600">
              <Link href="/">Dashboard</Link>
              <Link href="/weeks/new">Nova semana</Link>
            </nav>
          </div>
          <LogoutButton />
        </main>
      </header>
      <main className="px-4 py-6">{children}</main>
    </div>
  );
}
