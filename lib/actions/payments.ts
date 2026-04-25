"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveShareToken } from "@/lib/actions/share";

// ---------------------------------------------------------------------------
// Financiera (vía share token, sin auth) — marca/desmarca "pagado al dueño"
// ---------------------------------------------------------------------------
const MarkSchema = z.object({
  token: z.string().min(8),
  receiptId: z.string().uuid(),
  paid: z.boolean(),
  signedBy: z.string().max(80).optional().nullable(),
});

export async function markPaidToOwnerAction(input: z.infer<typeof MarkSchema>) {
  const parsed = MarkSchema.parse(input);
  const ctx = await resolveShareToken(parsed.token);
  if (!ctx) return { ok: false as const, error: "Link inválido o vencido" };

  const sb = supabaseAdmin();

  // Validar que el receipt pertenece al rango/sucursal del share link
  const { data: row } = await sb
    .from("negros_receipts")
    .select("id, branch_id, captured_at, deleted_at")
    .eq("id", parsed.receiptId)
    .maybeSingle();
  if (!row || row.deleted_at) return { ok: false as const, error: "No encontrado" };
  if (row.captured_at < ctx.date_from || row.captured_at > ctx.date_to)
    return { ok: false as const, error: "Fuera del rango" };
  if (ctx.branch_id && row.branch_id !== ctx.branch_id)
    return { ok: false as const, error: "Fuera de la sucursal" };

  const patch = parsed.paid
    ? {
        paid_to_owner_at: new Date().toISOString(),
        paid_to_owner_by: parsed.signedBy?.trim() || "Financiera",
      }
    : { paid_to_owner_at: null, paid_to_owner_by: null };

  const { error } = await sb
    .from("negros_receipts")
    .update(patch)
    .eq("id", parsed.receiptId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/share/${parsed.token}`);
  revalidatePath("/admin/comprobantes");
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Admin — marca/desmarca "pago recibido"
// ---------------------------------------------------------------------------
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
