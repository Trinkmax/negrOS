"use client";

import { useState } from "react";
import { Download, ImageOff, X } from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

type Row = {
  id: string;
  photo_url: string | null;
};

export function ShareView({
  token,
  label,
  dateFrom,
  dateTo,
  rows,
}: {
  token: string;
  label: string | null;
  dateFrom: string;
  dateTo: string;
  rows: Row[];
}) {
  const [detail, setDetail] = useState<Row | null>(null);

  return (
    <main className="min-h-dvh bg-black">
      <header className="sticky top-0 z-30 bg-black/80 backdrop-blur border-b border-[var(--border)] safe-top">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Wordmark size="sm" />
            <div className="min-w-0">
              <p className="text-xs text-white truncate font-medium">
                {label ?? "Comprobantes"}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] tabular truncate">
                {fmtRange(dateFrom, dateTo)}
              </p>
            </div>
          </div>
          <a
            href={`/api/share-download/${token}`}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white text-black text-sm font-semibold active:scale-[0.97]"
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">Descargar todo</span>
          </a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-6">
        <header className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Comprobantes
          </p>
          <p className="text-2xl text-white font-semibold tabular mt-1">
            {rows.length}
          </p>
        </header>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
            <p className="text-sm text-white">Sin comprobantes en este rango</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {rows.map((r) => (
              <button
                key={r.id}
                onClick={() => setDetail(r)}
                className="aspect-[3/4] rounded-xl overflow-hidden bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--border-strong)] active:scale-[0.99] transition-all"
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
                  <div className="size-full flex items-center justify-center text-[var(--text-muted)]">
                    <ImageOff className="size-6" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        {detail && (
          <DialogContent className="md:min-w-[36rem] !p-0 !bg-black !border-[var(--border)]">
            <div className="relative">
              <button
                onClick={() => setDetail(null)}
                className="absolute top-3 right-3 z-10 size-9 flex items-center justify-center rounded-full bg-black/60 backdrop-blur text-white hover:bg-black/80 transition-colors"
                aria-label="Cerrar"
              >
                <X className="size-4" />
              </button>
              {detail.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detail.photo_url}
                  alt="Comprobante"
                  className="w-full max-h-[80vh] object-contain bg-black rounded-2xl"
                />
              ) : (
                <div className="aspect-[3/4] flex items-center justify-center text-[var(--text-muted)]">
                  <ImageOff className="size-6" />
                </div>
              )}
              {detail.photo_url && (
                <div className="absolute bottom-3 left-3">
                  <a
                    href={detail.photo_url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-xs px-3 h-9 rounded-full bg-white text-black font-medium hover:bg-zinc-200"
                  >
                    <Download className="size-3.5" />
                    Descargar
                  </a>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </main>
  );
}

function fmtRange(from: string, to: string) {
  const f = new Date(from);
  const t = new Date(to);
  const same =
    f.getFullYear() === t.getFullYear() &&
    f.getMonth() === t.getMonth() &&
    f.getDate() === t.getDate();
  const fmt = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return same ? fmt.format(f) : `${fmt.format(f)} → ${fmt.format(t)}`;
}
