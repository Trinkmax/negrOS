import "server-only";
import { supabaseSSR } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type AdminSession = {
  userId: string;
  email: string;
  displayName: string | null;
};

export async function getAdminSession(): Promise<AdminSession | null> {
  const sb = await supabaseSSR();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const admin = supabaseAdmin();
  const { data: row } = await admin
    .from("negros_admins")
    .select("user_id, display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row) return null;
  return {
    userId: user.id,
    email: user.email ?? "",
    displayName: row.display_name,
  };
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new Error("UNAUTHENTICATED_ADMIN");
  return session;
}
