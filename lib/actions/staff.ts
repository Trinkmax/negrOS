"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { pinLookup } from "@/lib/auth/pin-lookup";

const PIN_LEN = 4;

const PinFormat = z
  .string()
  .length(PIN_LEN, `El PIN tiene que ser de ${PIN_LEN} dígitos`)
  .regex(/^\d+$/, "Solo números");

const StaffSchema = z.object({
  branch_id: z.string().uuid(),
  name: z.string().min(1).max(80),
  avatar_url: z.string().url().optional().nullable(),
  is_active: z.boolean().default(true),
});

const CreateStaffSchema = StaffSchema.extend({
  pin: PinFormat.optional().nullable(),
});

function generatePin(): string {
  let pin = "";
  for (let i = 0; i < PIN_LEN; i++) {
    pin += Math.floor(Math.random() * 10).toString();
  }
  return pin;
}

async function isPinTaken(pin: string, exceptStaffId?: string): Promise<boolean> {
  const lookup = pinLookup(pin);
  const sb = supabaseAdmin();
  let q = sb
    .from("negros_staff")
    .select("id", { count: "exact", head: true })
    .eq("pin_lookup", lookup)
    .eq("is_active", true);
  if (exceptStaffId) q = q.neq("id", exceptStaffId);
  const { count } = await q;
  return (count ?? 0) > 0;
}

async function uniqueGeneratedPin(exceptStaffId?: string): Promise<string> {
  for (let i = 0; i < 25; i++) {
    const pin = generatePin();
    if (!(await isPinTaken(pin, exceptStaffId))) return pin;
  }
  throw new Error("No pudimos encontrar un PIN libre. Probá manualmente.");
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

export async function createStaffAction(input: z.infer<typeof CreateStaffSchema>) {
  await requireAdmin();
  const parsed = CreateStaffSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.errors[0]?.message ?? "Datos inválidos",
    };
  }
  const { pin: providedPin, ...rest } = parsed.data;

  let finalPin: string;
  if (providedPin) {
    if (await isPinTaken(providedPin)) {
      return {
        ok: false as const,
        error: "Ese PIN ya lo está usando otro staff. Elegí otro.",
      };
    }
    finalPin = providedPin;
  } else {
    try {
      finalPin = await uniqueGeneratedPin();
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }

  const pin_hash = await bcrypt.hash(finalPin, 10);
  const pin_lookup = pinLookup(finalPin);
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("negros_staff")
    .insert({ ...rest, pin_hash, pin_lookup })
    .select("id, name")
    .single();
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/staff");
  return { ok: true as const, staff: data, pin: finalPin };
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

/**
 * Cambia el PIN del staff. Si `pin` viene vacío/null, genera uno aleatorio único.
 */
export async function setStaffPinAction(id: string, pin?: string | null) {
  await requireAdmin();
  let finalPin: string;
  if (pin) {
    const parsed = PinFormat.safeParse(pin);
    if (!parsed.success) {
      return {
        ok: false as const,
        error: parsed.error.errors[0]?.message ?? "PIN inválido",
      };
    }
    if (await isPinTaken(parsed.data, id)) {
      return {
        ok: false as const,
        error: "Ese PIN ya lo está usando otro staff.",
      };
    }
    finalPin = parsed.data;
  } else {
    try {
      finalPin = await uniqueGeneratedPin(id);
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }

  const pin_hash = await bcrypt.hash(finalPin, 10);
  const pin_lookup = pinLookup(finalPin);
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("negros_staff")
    .update({ pin_hash, pin_lookup, last_login_at: null })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/staff");
  return { ok: true as const, pin: finalPin };
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
