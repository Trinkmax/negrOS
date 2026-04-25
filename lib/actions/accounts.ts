"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

const AccountSchema = z.object({
  branch_id: z.string().uuid(),
  name: z.string().min(1).max(80),
  bank: z.string().max(60).optional().nullable(),
  alias_cbu: z.string().max(60).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#FAFAFA"),
  icon: z.string().max(8).optional().nullable(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export async function listAccountsAction(branchId?: string) {
  await requireAdmin();
  const sb = supabaseAdmin();
  let q = sb
    .from("negros_accounts")
    .select("*, branch:negros_branches(id, name)")
    .order("branch_id")
    .order("sort_order")
    .order("name");
  if (branchId) q = q.eq("branch_id", branchId);
  const { data } = await q;
  return (data ?? []).map((row) => ({
    ...row,
    branch: Array.isArray(row.branch) ? row.branch[0] : row.branch,
  })) as Array<
    import("@/lib/db/types").Account & {
      branch: { id: string; name: string };
    }
  >;
}

export async function createAccountAction(input: z.infer<typeof AccountSchema>) {
  await requireAdmin();
  const parsed = AccountSchema.parse(input);
  const sb = supabaseAdmin();
  const { error } = await sb.from("negros_accounts").insert(parsed);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/cuentas");
  return { ok: true as const };
}

export async function updateAccountAction(
  id: string,
  input: Partial<z.infer<typeof AccountSchema>>,
) {
  await requireAdmin();
  const parsed = AccountSchema.partial().parse(input);
  const sb = supabaseAdmin();
  const { error } = await sb.from("negros_accounts").update(parsed).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/cuentas");
  return { ok: true as const };
}

export async function deleteAccountAction(id: string) {
  await requireAdmin();
  const sb = supabaseAdmin();
  const { count } = await sb
    .from("negros_receipts")
    .select("id", { count: "exact", head: true })
    .eq("account_id", id);
  if ((count ?? 0) > 0) {
    return {
      ok: false as const,
      error: "Tiene comprobantes. Desactivala en lugar de borrarla.",
    };
  }
  const { error } = await sb.from("negros_accounts").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/cuentas");
  return { ok: true as const };
}
