import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getStaffSession } from "@/lib/auth/staff-session";
import { getAdminSession } from "@/lib/auth/admin-guard";
import { Wordmark } from "@/components/wordmark";

export default async function RootSplash() {
  const [staff, admin] = await Promise.all([getStaffSession(), getAdminSession()]);
  if (staff) redirect("/staff");
  if (admin) redirect("/admin");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-between px-6 py-12 safe-top safe-bottom">
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <Wordmark size="xl" />
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-[0.4em] mt-2">
          Comprobantes
        </p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <Link
          href="/login"
          className="group flex h-14 w-full items-center justify-between rounded-full bg-white text-black px-6 text-base font-semibold tracking-tight active:scale-[0.98] transition-transform"
        >
          Soy staff
          <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/admin/login"
          className="group flex h-14 w-full items-center justify-between rounded-full border border-[var(--border-strong)] text-white px-6 text-base font-medium active:scale-[0.98] transition-transform hover:bg-[var(--surface-2)]"
        >
          Soy admin
          <ArrowRight className="size-5 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5" />
        </Link>
        <p className="mt-3 text-center text-[10px] text-[var(--text-subtle)] uppercase tracking-[0.3em] tabular">
          negrOS · v0
        </p>
      </div>
    </main>
  );
}
