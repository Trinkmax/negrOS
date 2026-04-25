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
import { pinLookup } from "@/lib/auth/pin-lookup";

const PinSchema = z
  .string()
  .length(4, "El PIN tiene que ser de 4 dígitos")
  .regex(/^\d+$/, "Solo números");

export type LoginPinResult = { ok: true } | { ok: false; error: string };

/**
 * Login con solo PIN. Cada PIN es único entre staff activos.
 * Lookup directo via HMAC(pin) — no recorremos toda la tabla.
 *
 * Fallback: si encontramos staff con pin_lookup nulo (creados antes de
 * la migration 009), comparamos bcrypt contra cada uno y backfilleamos
 * pin_lookup al primer match. Esto evita pedirle al admin regenerar
 * todos los PINs.
 */
export async function loginPinAction(pin: string): Promise<LoginPinResult> {
  const parsed = PinSchema.safeParse(pin);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "PIN inválido" };
  }

  const sb = supabaseAdmin();
  const lookup = pinLookup(parsed.data);

  // 1) Camino normal: lookup determinístico
  const { data: byLookup } = await sb
    .from("negros_staff")
    .select("id, branch_id, name, pin_hash, is_active")
    .eq("pin_lookup", lookup)
    .eq("is_active", true)
    .maybeSingle();

  let staff = byLookup;

  // 2) Fallback para staff legacy sin pin_lookup
  if (!staff) {
    const { data: legacy } = await sb
      .from("negros_staff")
      .select("id, branch_id, name, pin_hash, is_active")
      .eq("is_active", true)
      .is("pin_lookup", null);
    if (legacy) {
      for (const row of legacy) {
        if (await bcrypt.compare(parsed.data, row.pin_hash)) {
          staff = row;
          // backfill async — no esperamos
          await sb
            .from("negros_staff")
            .update({ pin_lookup: lookup })
            .eq("id", row.id);
          break;
        }
      }
    }
  }

  if (!staff) return { ok: false, error: "PIN incorrecto" };

  const valid = await bcrypt.compare(parsed.data, staff.pin_hash);
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
