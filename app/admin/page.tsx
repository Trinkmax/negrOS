import { requireAdmin } from "@/lib/auth/admin-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  await requireAdmin();
  const sb = supabaseAdmin();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOf7d = new Date();
  startOf7d.setDate(startOf7d.getDate() - 7);
  startOf7d.setHours(0, 0, 0, 0);
  const startOf30d = new Date();
  startOf30d.setDate(startOf30d.getDate() - 30);
  startOf30d.setHours(0, 0, 0, 0);

  const [
    { count: today },
    { count: last7 },
    { count: last30 },
    { count: branches },
    { count: staff },
  ] = await Promise.all([
    sb
      .from("negros_receipts")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("captured_at", startOfDay.toISOString()),
    sb
      .from("negros_receipts")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("captured_at", startOf7d.toISOString()),
    sb
      .from("negros_receipts")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("captured_at", startOf30d.toISOString()),
    sb
      .from("negros_branches")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    sb
      .from("negros_staff")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  return (
    <div className="max-w-6xl">
      <header className="mb-10">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
          Overview
        </p>
        <h1 className="text-3xl text-white font-semibold tracking-tight mt-1">
          Hola.
        </h1>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-10">
        <Kpi label="Hoy" value={today ?? 0} hint="comprobantes" />
        <Kpi label="Últimos 7 días" value={last7 ?? 0} hint="comprobantes" />
        <Kpi label="Últimos 30 días" value={last30 ?? 0} hint="comprobantes" />
        <Kpi label="Sucursales" value={branches ?? 0} hint="activas" subtle />
        <Kpi label="Staff" value={staff ?? 0} hint="activos" subtle />
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-sm text-white">¿Qué hago primero?</p>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Cargá una sucursal, sus cuentas y un staff. Luego repartí el PIN.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/admin/sucursales"
            className="text-xs px-3 h-8 inline-flex items-center rounded-full border border-[var(--border-strong)] text-white hover:bg-[var(--surface-2)]"
          >
            Sucursales
          </a>
          <a
            href="/admin/cuentas"
            className="text-xs px-3 h-8 inline-flex items-center rounded-full border border-[var(--border-strong)] text-white hover:bg-[var(--surface-2)]"
          >
            Cuentas
          </a>
          <a
            href="/admin/staff"
            className="text-xs px-3 h-8 inline-flex items-center rounded-full border border-[var(--border-strong)] text-white hover:bg-[var(--surface-2)]"
          >
            Staff
          </a>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  subtle = false,
}: {
  label: string;
  value: number;
  hint?: string;
  subtle?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] p-5 ${
        subtle ? "bg-[var(--surface)]" : "bg-[var(--surface-2)]"
      }`}
    >
      <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="text-4xl text-white font-semibold tabular leading-none mt-2">
        {value}
      </p>
      {hint && (
        <p className="text-xs text-[var(--text-muted)] mt-2">{hint}</p>
      )}
    </div>
  );
}
