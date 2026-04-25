import { notFound } from "next/navigation";
import { resolveShareToken } from "@/lib/actions/share";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { signReceiptUrls } from "@/lib/storage";
import { ShareView } from "./view";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comprobantes" };

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ctx = await resolveShareToken(token);
  if (!ctx) notFound();

  const sb = supabaseAdmin();
  let q = sb
    .from("negros_receipts")
    .select("id, photo_path, captured_at")
    .is("deleted_at", null)
    .gte("captured_at", ctx.date_from)
    .lte("captured_at", ctx.date_to)
    .order("captured_at", { ascending: false });
  if (ctx.branch_id) q = q.eq("branch_id", ctx.branch_id);
  const { data } = await q;

  const rows = data ?? [];
  const urlMap = await signReceiptUrls(rows.map((r) => r.photo_path));

  return (
    <ShareView
      token={token}
      label={ctx.label}
      dateFrom={ctx.date_from}
      dateTo={ctx.date_to}
      rows={rows.map((r) => ({
        id: r.id,
        photo_url: urlMap.get(r.photo_path) ?? null,
      }))}
    />
  );
}
