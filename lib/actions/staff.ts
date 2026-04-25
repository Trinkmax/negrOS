"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

const PIN_LEN = 4;

const StaffSchema = z.object({
  branch_id: z.string().uuid(),
  name: z.string().min(1).max(80),
  avatar_url: z.string().url().optional().nullable(),
  is_active: z.boolean().default(true),
});

function generatePin(): string {
  let pin = "";
  for (let i = 0; i < PIN_LEN; i++) {
    pin += Math.floor(Math.random() * 10).toString();
  }
  return pin;
}

export async function listStaffAction(branchId?: string) {
  await requireAdmin();
  const sb = supabaseAdmin();
  let q = sb
    .from("negros_staff")
    .select(
      "id, branch_id, name, avatar_url, is_active, last_login_at, created_at, branch:negros_branches(id, name)",
    )
    .order("branch_id")
    .order("name");
  if (branchId) q = q.eq("branch_id", branchId);
  const { data } = await q;
  return (data ?? []).map((row) => ({
    ...row,
    branch: Array.isArray(row.branch) ? row.branch[0] : row.branch,
  })) as Array<{
    id: string;
    branch_id: string;
    name: string;
    avatar_url: string | null;
    is_active: boolean;
    last_login_at: string | null;
    created_at: string;
    branch: { id: string; name: string };
  }>;
}

export async function createStaffAction(input: z.infer<typeof StaffSchema>) {
  await requireAdmin();
  const parsed = StaffSchema.parse(input);
  const pin = generatePin();
  const pin_hash = await bcrypt.hash(pin, 10);
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("negros_staff")
    .insert({ ...parsed, pin_hash })
    .select("id, name")
    .single();
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/staff");
  return { ok: true as const, staff: data, pin };
}

export async function updateStaffAction(
  id: string,
  input: Partial<z.infer<typeof StaffSchema>>,
) {
  await requireAdmin();
  const parsed = StaffSchema.partial().parse(input);
  const sb = supabaseAdmin();
  const { error } = await sb.from("negros_staff").update(parsed).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/staff");
  return { ok: true as const };
}

export async function regeneratePinAction(id: string) {
  await requireAdmin();
  const pin = generatePin();
  const pin_hash = await bcrypt.hash(pin, 10);
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("negros_staff")
    .update({ pin_hash, last_login_at: null })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/staff");
  return { ok: true as const, pin };
}

export async function deleteStaffAction(id: string) {
  await requireAdmin();
  const sb = supabaseAdmin();
  const { count } = await sb
    .from("negros_receipts")
    .select("id", { count: "exact", head: true })
    .eq("staff_id", id);
  if ((count ?? 0) > 0) {
    return {
      ok: false as const,
      error: "Tiene comprobantes. Desactivalo en lugar de borrarlo.",
    };
  }
  const { error } = await sb.from("negros_staff").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/staff");
  return { ok: true as const };
}
