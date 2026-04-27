import { requireStaff } from "@/lib/auth/staff-session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AccountPublic } from "@/lib/db/types";
import { StaffHomeClient } from "./home-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inicio" };

export default async function StaffHomePage() {
  const session = await requireStaff();
  const sb = supabaseAdmin();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [{ count: todayCount }, { data: branch }, { data: accountLinks }] =
    await Promise.all([
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
      sb
        .from("negros_account_branches")
        .select(
          "sort_order, account:negros_accounts!inner(id, name, bank, color, icon, is_active)",
        )
        .eq("branch_id", session.branchId)
        .eq("account.is_active", true)
        .order("sort_order"),
    ]);

  const accounts: AccountPublic[] = (accountLinks ?? [])
    .map((row) => {
      const account = Array.isArray(row.account) ? row.account[0] : row.account;
      if (!account || !account.is_active) return null;
      return {
        id: account.id,
        name: account.name,
        bank: account.bank,
        color: account.color,
        icon: account.icon,
        sort_order: row.sort_order,
      };
    })
    .filter((a): a is AccountPublic => a !== null)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  return (
    <StaffHomeClient
      staffName={session.name}
      branchName={branch?.name ?? ""}
      todayCount={todayCount ?? 0}
      accounts={accounts}
    />
  );
}
