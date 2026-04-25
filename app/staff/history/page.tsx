import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listMyRecentReceiptsAction } from "@/lib/actions/receipts";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mis comprobantes" };

export default async function HistoryPage() {
  const items = await listMyRecentReceiptsAction(80);

  return (
    <main className="flex min-h-dvh flex-col px-5 py-6 safe-top safe-bottom">
      <header className="flex items-center gap-3 mb-6">
        <Link
          href="/staff"
          className="size-10 flex items-center justify-center text-white rounded-full hover:bg-[var(--surface-2)]"
          aria-label="Volver"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl text-white font-semibold">Mis comprobantes</h1>
      </header>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-12">
          <p className="text-sm text-white">Todavía no subiste nada</p>
          <p className="text-xs text-[var(--text-muted)] max-w-xs">
            Cuando saques tu primera foto va a aparecer acá.
          </p>
          <Link
            href="/staff"
            className="mt-2 text-xs px-4 h-9 inline-flex items-center rounded-full bg-white text-black font-medium"
          >
            Volver al inicio
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((r) => (
            <div
              key={r.id}
              className="aspect-[3/4] rounded-xl overflow-hidden bg-[var(--surface-2)] border border-[var(--border)] relative"
            >
              {r.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.photo_url}
                  alt="Comprobante"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="size-full flex items-center justify-center text-xs text-[var(--text-muted)]">
                  Sin imagen
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2">
                <p className="text-[10px] text-white font-medium truncate">
                  {r.account?.name ?? "—"}
                </p>
                <p className="text-[9px] text-white/70 tabular">
                  {formatDateTime(r.captured_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
