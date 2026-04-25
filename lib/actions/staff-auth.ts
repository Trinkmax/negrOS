"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  signStaffSession,
  setStaffCookie,
  clearStaffCookie,
} from "@/lib/auth/staff-session";

const PinSchema = z
  .string()
  .length(4, "El PIN tiene que ser de 4 dígitos")
  .regex(/^\d+$/, "Solo números");

export type LoginPinResult =
  | { ok: true }
  | { ok: false; error: string };

export async function loginPinAction(
  staffId: string,
  pin: string,
): Promise<LoginPinResult> {
  const parsed = PinSchema.safeParse(pin);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "PIN inválido" };
  }
  if (!staffId) return { ok: false, error: "Falta staff" };

  const sb = supabaseAdmin();
  const { data: staff, error } = await sb
    .from("negros_staff")
    .select("id, branch_id, name, pin_hash, is_active")
    .eq("id", staffId)
    .maybeSingle();

  if (error || !staff || !staff.is_active) {
    return { ok: false, error: "Usuario no disponible" };
  }

  const valid = await bcrypt.compare(pin, staff.pin_hash);
  if (!valid) return { ok: false, error: "PIN incorrecto" };

  await sb
    .from("negros_staff")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", staff.id);

  const token = await signStaffSession({
    staffId: staff.id,
    branchId: staff.branch_id,
    name: staff.name,
  });
  await setStaffCookie(token);

  return { ok: true };
}

export async function logoutStaffAction() {
  await clearStaffCookie();
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Listado de staff para la pantalla de login (todo el staff activo).
// El staff ya pertenece a una sucursal, no la elige acá.
// ---------------------------------------------------------------------------
export async function listLoginStaffAction() {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("negros_staff")
    .select("id, name, avatar_url, branch_id, branch:negros_branches(name)")
    .eq("is_active", true)
    .order("name");
  type Row = {
    id: string;
    name: string;
    avatar_url: string | null;
    branch_id: string;
    branch: { name: string } | { name: string }[] | null;
  };
  return ((data ?? []) as Row[]).map((s) => ({
    id: s.id,
    name: s.name,
    avatar_url: s.avatar_url,
    branch_id: s.branch_id,
    branch_name: Array.isArray(s.branch)
      ? s.branch[0]?.name ?? ""
      : s.branch?.name ?? "",
  }));
}
