import { NextRequest, NextResponse } from "next/server";
import { zipSync, strToU8 } from "fflate";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveShareToken } from "@/lib/actions/share";
import { RECEIPTS_BUCKET, extFromMime } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_ROWS = 1000;

export async function GET(
  _req: NextRequest,
  ctxParam: { params: Promise<{ token: string }> },
) {
  const { token } = await ctxParam.params;
  const ctx = await resolveShareToken(token);
  if (!ctx) return new NextResponse("Link inválido o vencido", { status: 404 });

  const sb = supabaseAdmin();
  let q = sb
    .from("negros_receipts")
    .select(
      `id, photo_path, photo_mime, captured_at,
       branch:negros_branches(name),
       account:negros_accounts(name),
       staff:negros_staff(name)`,
    )
    .is("deleted_at", null)
    .gte("captured_at", ctx.date_from)
    .lte("captured_at", ctx.date_to)
    .order("captured_at", { ascending: true })
    .limit(MAX_ROWS + 1);
  if (ctx.branch_id) q = q.eq("branch_id", ctx.branch_id);

  const { data, error } = await q;
  if (error) return new NextResponse(error.message, { status: 500 });
  const rows = (data ?? []).map((r) => ({
    ...r,
    branch: Array.isArray(r.branch) ? r.branch[0] : r.branch,
    account: Array.isArray(r.account) ? r.account[0] : r.account,
    staff: Array.isArray(r.staff) ? r.staff[0] : r.staff,
  }));

  if (rows.length === 0) return new NextResponse("Sin resultados", { status: 404 });
  if (rows.length > MAX_ROWS)
    return new NextResponse(
      `Demasiados (${rows.length}+). Pedile al admin un link más acotado.`,
      { status: 413 },
    );

  const files: Record<string, Uint8Array> = {};
  const csv: string[] = ["id,fecha,sucursal,cuenta,staff,archivo"];

  const CHUNK = 30;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const blobs = await Promise.all(
      slice.map(async (r) => {
        const { data: blob } = await sb.storage
          .from(RECEIPTS_BUCKET)
          .download(r.photo_path);
        if (!blob) return null;
        return new Uint8Array(await blob.arrayBuffer());
      }),
    );
    blobs.forEach((buf, idx) => {
      const r = slice[idx];
      if (!buf) return;
      const ext = extFromMime(r.photo_mime ?? "image/jpeg");
      const filename = makeFilename(r, ext);
      files[filename] = buf;
      csv.push(
        [
          r.id,
          new Date(r.captured_at).toISOString(),
          esc(r.branch?.name ?? ""),
          esc(r.account?.name ?? ""),
          esc(r.staff?.name ?? ""),
          filename,
        ].join(","),
      );
    });
  }

  files["metadata.csv"] = strToU8("﻿" + csv.join("\n"));

  const zipped = zipSync(files, { level: 0 });
  const fromLabel = ctx.date_from.slice(0, 10);
  const toLabel = ctx.date_to.slice(0, 10);

  return new NextResponse(new Uint8Array(zipped), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="nos_${fromLabel}_${toLabel}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}

function makeFilename(
  r: {
    id: string;
    captured_at: string;
    branch?: { name: string } | null;
    account?: { name: string } | null;
    staff?: { name: string } | null;
  },
  ext: string,
) {
  const d = new Date(r.captured_at);
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}`;
  const slug = (s: string | undefined) =>
    (s ?? "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24);
  return `${stamp}_${slug(r.branch?.name)}_${slug(r.account?.name)}_${slug(
    r.staff?.name,
  )}_${r.id.slice(0, 6)}.${ext}`;
}

function esc(v: string) {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
