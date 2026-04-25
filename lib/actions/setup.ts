"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseSSR } from "@/lib/supabase/server";

const SetupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(80),
});

/**
 * Bootstrap del primer admin.
 * Solo funciona si la tabla negros_admins está vacía — no es un endpoint de
 * registro general. Crea el auth user, lo agrega a negros_admins, y abre la
 * sesión vía Supabase SSR.
 */
export async function setupFirstAdminAction(formData: FormData) {
  const parsed = SetupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.errors[0]?.message ?? "Datos inválidos",
    };
  }

  const admin = supabaseAdmin();
  const { count } = await admin
    .from("negros_admins")
    .select("user_id", { count: "exact", head: true });

  if ((count ?? 0) > 0) {
    return { ok: false as const, error: "Ya hay un admin. Usá /admin/login." };
  }

  // Crear auth user
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (createErr || !created.user) {
    return {
      ok: false as const,
      error: createErr?.message ?? "No se pudo crear el usuario",
    };
  }

  // Insertar en negros_admins
  const { error: adminErr } = await admin.from("negros_admins").insert({
    user_id: created.user.id,
    display_name: parsed.data.displayName,
  });
  if (adminErr) {
    // rollback best-effort
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false as const, error: adminErr.message };
  }

  // Iniciar sesión SSR
  const ssr = await supabaseSSR();
  const { error: signinErr } = await ssr.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (signinErr) return { ok: false as const, error: signinErr.message };

  return { ok: true as const };
}
