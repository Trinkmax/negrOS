"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Admin marca/desmarca "pago recibido" de la financiera.
 * Es la única acción de pago en el sistema — la financiera nunca toca nada,
 * solo ve fotos y las descarga desde el panel público.
 */
export async function confirmReceivedAction(receiptId: string, received: boolean) {
  const admin = await requireAdmin();
  const sb = supabaseAdmin();
  const patch = received
    ? {
        owner_confirmed_at: new Date().toISOString(),
        owner_confirmed_by: admin.userId,
      }
    : { owner_confirmed_at: null, owner_confirmed_by: null };
  const { error } = await sb.from("negros_receipts").update(patch).eq("id", receiptId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/comprobantes");
  return { ok: true as const };
}
