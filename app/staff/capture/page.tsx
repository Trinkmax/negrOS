import { requireStaff } from "@/lib/auth/staff-session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AccountPublic } from "@/lib/db/types";
import { CaptureFlow } from "./capture-flow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Capturar" };

export default async function CapturePage() {
  const session = await requireStaff();
  const sb = supabaseAdmin();
  const { data: accounts } = await sb
    .from("negros_accounts")
    .select("id, branch_id, name, bank, color, icon, sort_order")
    .eq("branch_id", session.branchId)
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  return <CaptureFlow accounts={(accounts ?? []) as AccountPublic[]} />;
}
