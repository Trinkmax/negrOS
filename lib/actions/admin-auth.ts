"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseSSR } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const LoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Contraseña muy corta"),
});

export type AdminLoginResult = { ok: true } | { ok: false; error: string };

export async function loginAdminAction(formData: FormData): Promise<AdminLoginResult> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? "Datos inválidos" };
  }

  const sb = await supabaseSSR();
  const { data, error } = await sb.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { ok: false, error: "Credenciales inválidas" };
  }

  // Verificar que es admin registrado en negros_admins
  const admin = supabaseAdmin();
  const { data: adminRow } = await admin
    .from("negros_admins")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!adminRow) {
    await sb.auth.signOut();
    return { ok: false, error: "Usuario no autorizado como admin" };
  }
  return { ok: true };
}

export async function logoutAdminAction() {
  const sb = await supabaseSSR();
  await sb.auth.signOut();
  redirect("/admin/login");
}
