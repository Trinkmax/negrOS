"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/staff-session";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  uploadReceiptPhoto,
  signReceiptUrls,
  deleteReceiptPhoto,
} from "@/lib/storage";

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// ===========================================================================
// STAFF — subir comprobante
// ===========================================================================
export type UploadResult = { ok: true; id: string } | { ok: false; error: string };

export async function uploadReceiptAction(formData: FormData): Promise<UploadResult> {
  let session;
  try {
    session = await requireStaff();
  } catch {
    return { ok: false, error: "Sesión expirada" };
  }

  const accountId = String(formData.get("accountId") ?? "");
  const file = formData.get("photo");
  if (!accountId) return { ok: false, error: "Falta cuenta" };
  if (!(file instanceof File)) return { ok: false, error: "Falta foto" };
  if (file.size === 0) return { ok: false, error: "Foto vacía" };
  if (file.size > MAX_BYTES) return { ok: false, error: "Foto demasiado grande" };
  if (!ALLOWED_MIMES.has(file.type))
    return { ok: false, error: `Formato no soportado: ${file.type}` };

  const sb = supabaseAdmin();

  // Defense in depth: cuenta debe pertenecer a la sucursal del staff
  const { data: account } = await sb
    .from("negros_accounts")
    .select("id, branch_id, is_active")
    .eq("id", accountId)
    .maybeSingle();

  if (!account || !account.is_active || account.branch_id !== session.branchId) {
    return { ok: false, error: "Cuenta no disponible" };
  }

  const receiptId = randomUUID();
  const buffer = new Uint8Array(await file.arrayBuffer());
  let photoPath: string;
  try {
    photoPath = await uploadReceiptPhoto({
      branchId: session.branchId,
      receiptId,
      file: buffer,
      mime: file.type,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload falló" };
  }

  const { error } = await sb.from("negros_receipts").insert({
    id: receiptId,
    branch_id: session.branchId,
    account_id: accountId,
    staff_id: session.staffId,
    photo_path: photoPath,
    photo_size: file.size,
    photo_mime: file.type,
  });

  if (error) {
    await deleteReceiptPhoto(photoPath);
    return { ok: false, error: "No se pudo guardar el comprobante" };
  }

  revalidatePath("/staff");
  revalidatePath("/staff/history");
  return { ok: true, id: receiptId };
}

// ===========================================================================
// STAFF — mis comprobantes
// ===========================================================================
export async function listMyRecentReceiptsAction(limit = 50) {
  const session = await requireStaff();
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("negros_receipts")
    .select(
      "id, photo_path, captured_at, account:negros_accounts(id, name, color, icon)",
    )
    .eq("staff_id", session.staffId)
    .is("deleted_at", null)
    .order("captured_at", { ascending: false })
    .limit(limit);

  const rows = data ?? [];
  const urlMap = await signReceiptUrls(rows.map((r) => r.photo_path));
  return rows.map((r) => ({
    id: r.id,
    captured_at: r.captured_at,
    photo_url: urlMap.get(r.photo_path) ?? null,
    account: Array.isArray(r.account) ? r.account[0] : r.account,
  }));
}

// ===========================================================================
// ADMIN — listado filtrable
// ===========================================================================
const ListFiltersSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  branchIds: z.array(z.string().uuid()).optional(),
  accountIds: z.array(z.string().uuid()).optional(),
  staffIds: z.array(z.string().uuid()).optional(),
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(100).default(50),
});

export type ListFilters = z.infer<typeof ListFiltersSchema>;

export async function listReceiptsAction(input: ListFilters) {
  await requireAdmin();
  const filters = ListFiltersSchema.parse(input);
  const sb = supabaseAdmin();

  let q = sb
    .from("negros_receipts")
    .select(
      `id, photo_path, captured_at, branch_id, account_id, staff_id,
       paid_to_owner_at, paid_to_owner_by, owner_confirmed_at,
       branch:negros_branches(id, name),
       account:negros_accounts(id, name, color, icon),
       staff:negros_staff(id, name, avatar_url)`,
      { count: "exact" },
    )
    .is("deleted_at", null)
    .order("captured_at", { ascending: false });

  if (filters.from) q = q.gte("captured_at", filters.from);
  if (filters.to) q = q.lte("captured_at", filters.to);
  if (filters.branchIds?.length) q = q.in("branch_id", filters.branchIds);
  if (filters.accountIds?.length) q = q.in("account_id", filters.accountIds);
  if (filters.staffIds?.length) q = q.in("staff_id", filters.staffIds);

  const fromIdx = filters.page * filters.pageSize;
  const toIdx = fromIdx + filters.pageSize - 1;
  q = q.range(fromIdx, toIdx);

  const { data, count } = await q;
  const rows = data ?? [];
  const urlMap = await signReceiptUrls(rows.map((r) => r.photo_path));

  return {
    rows: rows.map((r) => ({
      id: r.id,
      captured_at: r.captured_at,
      paid_to_owner_at: r.paid_to_owner_at,
      paid_to_owner_by: r.paid_to_owner_by,
      owner_confirmed_at: r.owner_confirmed_at,
      photo_url: urlMap.get(r.photo_path) ?? null,
      branch: Array.isArray(r.branch) ? r.branch[0] : r.branch,
      account: Array.isArray(r.account) ? r.account[0] : r.account,
      staff: Array.isArray(r.staff) ? r.staff[0] : r.staff,
    })),
    total: count ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function getReceiptAction(id: string) {
  await requireAdmin();
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("negros_receipts")
    .select(
      `*, branch:negros_branches(id, name),
       account:negros_accounts(id, name, color, icon, branch_id),
       staff:negros_staff(id, name, avatar_url, branch_id)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const url = (await signReceiptUrls([data.photo_path])).get(data.photo_path) ?? null;
  return { ...data, photo_url: url };
}

const EditSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  adminNote: z.string().max(500).optional().nullable(),
});

export async function editReceiptAction(input: z.infer<typeof EditSchema>) {
  const admin = await requireAdmin();
  const parsed = EditSchema.parse(input);
  const sb = supabaseAdmin();

  const patch: Record<string, unknown> = {
    edited_at: new Date().toISOString(),
    edited_by: admin.userId,
  };
  if (parsed.accountId) patch.account_id = parsed.accountId;
  if (parsed.staffId) patch.staff_id = parsed.staffId;
  if (parsed.adminNote !== undefined) patch.admin_note = parsed.adminNote;

  const { error } = await sb.from("negros_receipts").update(patch).eq("id", parsed.id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/comprobantes");
  return { ok: true as const };
}

export async function softDeleteReceiptAction(id: string) {
  const admin = await requireAdmin();
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("negros_receipts")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: admin.userId,
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/comprobantes");
  return { ok: true as const };
}

export async function restoreReceiptAction(id: string) {
  await requireAdmin();
  const sb = supabaseAdmin();
  const { error } = await sb
    .from("negros_receipts")
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/comprobantes");
  return { ok: true as const };
}
