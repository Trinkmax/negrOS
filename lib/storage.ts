import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const RECEIPTS_BUCKET = "negros-receipts";
const SIGNED_TTL = 60 * 15; // 15 min

export function buildReceiptPath(opts: {
  branchId: string;
  receiptId: string;
  ext: string;
}) {
  const d = new Date();
  const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return `${opts.branchId}/${ym}/${opts.receiptId}.${opts.ext}`;
}

export function extFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("heic") || mime.includes("heif")) return "heic";
  return "jpg";
}

export async function uploadReceiptPhoto(opts: {
  branchId: string;
  receiptId: string;
  file: ArrayBuffer | Uint8Array;
  mime: string;
}): Promise<string> {
  const ext = extFromMime(opts.mime);
  const path = buildReceiptPath({
    branchId: opts.branchId,
    receiptId: opts.receiptId,
    ext,
  });
  const sb = supabaseAdmin();
  const { error } = await sb.storage.from(RECEIPTS_BUCKET).upload(path, opts.file, {
    contentType: opts.mime,
    upsert: false,
    cacheControl: "31536000",
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

export async function signReceiptUrl(path: string, ttl = SIGNED_TTL): Promise<string | null> {
  const sb = supabaseAdmin();
  const { data } = await sb.storage.from(RECEIPTS_BUCKET).createSignedUrl(path, ttl);
  return data?.signedUrl ?? null;
}

export async function signReceiptUrls(paths: string[], ttl = SIGNED_TTL) {
  if (paths.length === 0) return new Map<string, string>();
  const sb = supabaseAdmin();
  const { data } = await sb.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrls(paths, ttl);
  const map = new Map<string, string>();
  data?.forEach((d) => {
    if (d.path && d.signedUrl) map.set(d.path, d.signedUrl);
  });
  return map;
}

export async function deleteReceiptPhoto(path: string) {
  const sb = supabaseAdmin();
  await sb.storage.from(RECEIPTS_BUCKET).remove([path]);
}
