"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

const BranchSchema = z.object({
  name: z.string().min(1).max(80),
  address: z.string().max(200).optional().nullable(),
  is_active: z.boolean().default(true),
});

export async function listBranchesAction() {
  await requireAdmin();
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("negros_branches")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function createBranchAction(input: z.infer<typeof BranchSchema>) {
  await requireAdmin();
  const parsed = BranchSchema.parse(input);
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("negros_branches")
    .insert(parsed)
    .select()
    .single();
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/sucursales");
  revalidatePath("/admin");
  return { ok: true as const, branch: data };
}

export async function updateBranchAction(id: string, input: Partial<z.infer<typeof BranchSchema>>) {
  await requireAdmin();
  const parsed = BranchSchema.partial().parse(input);
  const sb = supabaseAdmin();
  const { error } = await sb.from("negros_branches").update(parsed).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/sucursales");
  return { ok: true as const };
}

export async function deleteBranchAction(id: string) {
  await requireAdmin();
  const sb = supabaseAdmin();
  // Solo permitir borrar si no tiene staff/cuentas/recibos asociados
  const [{ count: staff }, { count: accts }, { count: rcpts }] = await Promise.all([
    sb.from("negros_staff").select("id", { count: "exact", head: true }).eq("branch_id", id),
    sb.from("negros_accounts").select("id", { count: "exact", head: true }).eq("branch_id", id),
    sb.from("negros_receipts").select("id", { count: "exact", head: true }).eq("branch_id", id),
  ]);
  if ((staff ?? 0) + (accts ?? 0) + (rcpts ?? 0) > 0) {
    return {
      ok: false as const,
      error: "Tiene staff/cuentas/comprobantes. Desactivala en lugar de borrarla.",
    };
  }
  const { error } = await sb.from("negros_branches").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/sucursales");
  return { ok: true as const };
}
