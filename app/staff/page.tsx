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

  const [{ count: todayCount }, { data: branch }, { data: accounts }] =
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
        .from("negros_accounts")
        .select("id, branch_id, name, bank, color, icon, sort_order")
        .eq("branch_id", session.branchId)
        .eq("is_active", true)
        .order("sort_order")
        .order("name"),
    ]);

  return (
    <StaffHomeClient
      staffName={session.name}
      branchName={branch?.name ?? ""}
      todayCount={todayCount ?? 0}
      accounts={(accounts ?? []) as AccountPublic[]}
    />
  );
}
