"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Account, Branch } from "@/lib/db/types";

const AccountSchema = z.object({
  name: z.string().min(1).max(80),
  bank: z.string().max(60).optional().nullable(),
  alias_cbu: z.string().max(60).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#FAFAFA"),
  icon: z.string().max(8).optional().nullable(),
  is_active: z.boolean().default(true),
  branch_ids: z.array(z.string().uuid()).min(1, "Elegí al menos una sucursal"),
});

type AccountInput = z.infer<typeof AccountSchema>;

export type AccountWithBranches = Account & {
  branches: Pick<Branch, "id" | "name">[];
};

export async function listAccountsAction(
  branchId?: string,
): Promise<AccountWithBranches[]> {
  await requireAdmin();
  const sb = supabaseAdmin();

  // 1) Cuentas (filtradas por sucursal opcional vía la pivot)
  let baseQuery = sb.from("negros_accounts").select("*").order("name");
  if (branchId) {
    const { data: pivot } = await sb
      .from("negros_account_branches")
      .select("account_id")
      .eq("branch_id", branchId);
    const ids = (pivot ?? []).map((r) => r.account_id);
    if (ids.length === 0) return [];
    baseQuery = baseQuery.in("id", ids);
  }
  const { data: accounts } = await baseQuery;
  if (!accounts || accounts.length === 0) return [];

  // 2) Cargar sucursales de esas cuentas en una sola query
  const { data: pivot } = await sb
    .from("negros_account_branches")
    .select("account_id, branch_id, sort_order, branch:negros_branches(id, name)")
    .in("account_id", accounts.map((a) => a.id))
    .order("sort_order");

  const byAccount = new Map<string, Pick<Branch, "id" | "name">[]>();
  for (const row of pivot ?? []) {
    const branch = Array.isArray(row.branch) ? row.branch[0] : row.branch;
    if (!branch) continue;
    if (!byAccount.has(row.account_id)) byAccount.set(row.account_id, []);
    byAccount.get(row.account_id)!.push(branch);
  }

  return accounts.map((a) => ({
    ...(a as Account),
    branches: byAccount.get(a.id) ?? [],
  }));
}

export async function createAccountAction(input: AccountInput) {
  await requireAdmin();
  const parsed = AccountSchema.parse(input);
  const sb = supabaseAdmin();
  const { branch_ids, ...accountFields } = parsed;

  const { data: created, error } = await sb
    .from("negros_accounts")
    .insert(accountFields)
    .select("id")
    .single();
  if (error || !created) return { ok: false as const, error: error?.message ?? "Error" };

  const links = branch_ids.map((branch_id, idx) => ({
    account_id: created.id,
    branch_id,
    sort_order: idx,
  }));
  const { error: linkErr } = await sb.from("negros_account_branches").insert(links);
  if (linkErr) {
    await sb.from("negros_accounts").delete().eq("id", created.id);
    return { ok: false as const, error: linkErr.message };
  }

  revalidatePath("/admin/cuentas");
  return { ok: true as const };
}

export async function updateAccountAction(
  id: string,
  input: Partial<AccountInput>,
) {
  await requireAdmin();
  const parsed = AccountSchema.partial().parse(input);
  const sb = supabaseAdmin();
  const { branch_ids, ...accountFields } = parsed;

  if (Object.keys(accountFields).length > 0) {
    const { error } = await sb
      .from("negros_accounts")
      .update(accountFields)
      .eq("id", id);
    if (error) return { ok: false as const, error: error.message };
  }

  if (branch_ids) {
    if (branch_ids.length === 0) {
      return { ok: false as const, error: "Elegí al menos una sucursal" };
    }
    const { error: delErr } = await sb
      .from("negros_account_branches")
      .delete()
      .eq("account_id", id);
    if (delErr) return { ok: false as const, error: delErr.message };

    const links = branch_ids.map((branch_id, idx) => ({
      account_id: id,
      branch_id,
      sort_order: idx,
    }));
    const { error: insErr } = await sb
      .from("negros_account_branches")
      .insert(links);
    if (insErr) return { ok: false as const, error: insErr.message };
  }

  revalidatePath("/admin/cuentas");
  return { ok: true as const };
}

export async function setAccountVisibilityAction(id: string, isActive: boolean) {
  await requireAdmin();
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("negros_accounts")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/cuentas");
  return { ok: true as const };
}

export async function reorderAccountAction(
  branchId: string,
  accountId: string,
  sortOrder: number,
) {
  await requireAdmin();
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("negros_account_branches")
    .update({ sort_order: sortOrder })
    .eq("branch_id", branchId)
    .eq("account_id", accountId);
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
