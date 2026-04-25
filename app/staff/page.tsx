import Link from "next/link";
import { Camera } from "lucide-react";
import { requireStaff } from "@/lib/auth/staff-session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { StaffHomeHeader } from "./header";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inicio" };

export default async function StaffHomePage() {
  const session = await requireStaff();
  const sb = supabaseAdmin();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [{ count: todayCount }, { data: branch }] = await Promise.all([
    sb
      .from("negros_receipts")
      .select("id", { count: "exact", head: true })
      .eq("staff_id", session.staffId)
      .is("deleted_at", null)
      .gte("captured_at", startOfDay.toISOString()),
    sb
      .from("negros_branches")
      .select("name")
      .eq("id", session.branchId)
      .maybeSingle(),
  ]);

  return (
    <main className="flex min-h-dvh flex-col px-5 py-6 safe-top safe-bottom">
      <StaffHomeHeader staffName={session.name} branchName={branch?.name ?? ""} />

      <section className="flex-1 flex flex-col items-center justify-center gap-8">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Hoy
          </p>
          <p className="text-7xl text-white font-semibold tabular leading-none mt-1">
            {todayCount ?? 0}
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            {todayCount === 1 ? "comprobante subido" : "comprobantes subidos"}
          </p>
        </div>

        <Link
          href="/staff/capture"
          className="group relative flex flex-col items-center justify-center gap-3 size-56 rounded-full bg-white text-black active:scale-[0.97] transition-transform shadow-[0_0_60px_rgba(255,255,255,0.08)]"
        >
          <Camera className="size-14 stroke-[1.5]" />
          <span className="text-base font-semibold tracking-tight">
            Sacar foto
          </span>
        </Link>

        <Link
          href="/staff/history"
          className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
        >
          Ver mis comprobantes
        </Link>
      </section>
    </main>
  );
}
