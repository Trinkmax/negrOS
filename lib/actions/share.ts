"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

const CreateSchema = z.object({
  date_from: z.string().datetime(),
  date_to: z.string().datetime(),
  branch_id: z.string().uuid().nullable().optional(),
  label: z.string().max(120).optional().nullable(),
  expires_in_days: z.number().int().min(1).max(60).optional(),
});

function newToken() {
  // 24 chars url-safe base64 (sin padding) ≈ 144 bits de entropía
  return randomBytes(18).toString("base64url");
}

export async function createShareLinkAction(input: z.infer<typeof CreateSchema>) {
  const admin = await requireAdmin();
  const parsed = CreateSchema.parse(input);
  const sb = supabaseAdmin();

  const expires_at = parsed.expires_in_days
    ? new Date(Date.now() + parsed.expires_in_days * 86400_000).toISOString()
    : null;

  const { data, error } = await sb
    .from("negros_share_links")
    .insert({
      token: newToken(),
      date_from: parsed.date_from,
      date_to: parsed.date_to,
      branch_id: parsed.branch_id ?? null,
      label: parsed.label ?? null,
      created_by: admin.userId,
      expires_at,
    })
    .select("token")
    .single();

  if (error || !data) return { ok: false as const, error: error?.message ?? "Error" };
  revalidatePath("/admin/share");
  return { ok: true as const, token: data.token };
}

export async function listShareLinksAction() {
  await requireAdmin();
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("negros_share_links")
    .select("*, branch:negros_branches(id, name)")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((r) => ({
    ...r,
    branch: Array.isArray(r.branch) ? r.branch[0] : r.branch,
  }));
}

export async function revokeShareLinkAction(id: string) {
  await requireAdmin();
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("negros_share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/share");
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Validación de un token (para páginas públicas /share/[token])
// ---------------------------------------------------------------------------
export type ShareLinkContext = {
  id: string;
  date_from: string;
  date_to: string;
  branch_id: string | null;
  label: string | null;
};

export async function resolveShareToken(
  token: string,
): Promise<ShareLinkContext | null> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("negros_share_links")
    .select("id, date_from, date_to, branch_id, label, revoked_at, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!data) return null;
  if (data.revoked_at) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  return {
    id: data.id,
    date_from: data.date_from,
    date_to: data.date_to,
    branch_id: data.branch_id,
    label: data.label,
  };
}
