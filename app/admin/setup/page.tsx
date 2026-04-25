import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SetupForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Setup" };

export default async function SetupPage() {
  // Solo accesible si no hay admins
  const sb = supabaseAdmin();
  const { count } = await sb
    .from("negros_admins")
    .select("user_id", { count: "exact", head: true });
  if ((count ?? 0) > 0) redirect("/admin/login");

  return <SetupForm />;
}
