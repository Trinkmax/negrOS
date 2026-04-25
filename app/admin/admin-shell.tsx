"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ReceiptText,
  Building2,
  CreditCard,
  Users,
  LogOut,
} from "lucide-react";
import { logoutAdminAction } from "@/lib/actions/admin-auth";
import { Wordmark } from "@/components/wordmark";
import { cn } from "@/lib/utils";
import type { AdminSession } from "@/lib/auth/admin-guard";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/comprobantes", label: "Comprobantes", icon: ReceiptText },
  { href: "/admin/sucursales", label: "Sucursales", icon: Building2 },
  { href: "/admin/cuentas", label: "Cuentas", icon: CreditCard },
  { href: "/admin/staff", label: "Staff", icon: Users },
];

export function AdminShell({
  session,
  children,
}: {
  session: AdminSession;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh flex bg-black">
      {/* sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-[var(--border)] bg-black sticky top-0 h-dvh">
        <div className="px-6 pt-6 pb-8">
          <Link href="/admin" className="inline-flex items-baseline gap-2">
            <Wordmark size="sm" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Admin
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-3 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 h-10 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-[var(--surface-2)] text-white"
                    : "text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-2)]/50",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-[var(--border)]">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs text-white truncate">
              {session.displayName ?? session.email}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] truncate">
              {session.email}
            </p>
          </div>
          <form action={logoutAdminAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 h-10 rounded-lg text-sm text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-2)]/50 transition-colors"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* mobile topbar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-black/80 backdrop-blur border-b border-[var(--border)] safe-top">
        <div className="flex items-center justify-between px-4 h-14">
          <Wordmark size="sm" />
          <form action={logoutAdminAction}>
            <button
              type="submit"
              className="size-10 flex items-center justify-center text-[var(--text-muted)]"
              aria-label="Cerrar sesión"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
        <nav className="flex overflow-x-auto px-2 pb-2 gap-1 scrollbar-none">
          {NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-2 px-3 h-9 rounded-lg text-xs whitespace-nowrap transition-colors",
                  active
                    ? "bg-[var(--surface-2)] text-white"
                    : "text-[var(--text-muted)] hover:text-white",
                )}
              >
                <Icon className="size-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="flex-1 min-w-0 md:pl-0 pt-[6.5rem] md:pt-0 px-4 md:px-10 py-6 md:py-10">
        {children}
      </main>
    </div>
  );
}
