"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  ImageOff,
  Check,
  X,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { markPaidToOwnerAction } from "@/lib/actions/payments";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";

type Row = {
  id: string;
  captured_at: string;
  paid_to_owner_at: string | null;
  paid_to_owner_by: string | null;
  owner_confirmed_at: string | null;
  photo_url: string | null;
  branch?: { id: string; name: string } | null;
  account?: { id: string; name: string; color: string; icon: string | null } | null;
  staff?: { id: string; name: string } | null;
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
  const router = useRouter();
  const [detail, setDetail] = useState<Row | null>(null);
  const [signedBy, setSignedBy] = useState("");
  const [pending, start] = useTransition();

  const total = rows.length;
  const paid = rows.filter((r) => r.paid_to_owner_at).length;

  function togglePaid(r: Row, paidNow: boolean) {
    start(async () => {
      const res = await markPaidToOwnerAction({
        token,
        receiptId: r.id,
        paid: paidNow,
        signedBy: paidNow ? signedBy : null,
      });
      if (res.ok) {
        toast.success(paidNow ? "Marcado como pagado" : "Desmarcado");
        setDetail(null);
        router.refresh();
      } else toast.error(res.error);
    });
  }

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Resumen
            </p>
            <p className="text-2xl text-white font-semibold tabular mt-1">
              {paid} / {total}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              comprobantes pagados al dueño
            </p>
          </div>
          <div className="flex flex-col gap-2 max-w-[12rem]">
            <Label htmlFor="who">Tu nombre (opcional)</Label>
            <Input
              id="who"
              value={signedBy}
              onChange={(e) => setSignedBy(e.target.value)}
              placeholder="Quién firma"
              className="h-9"
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
            <p className="text-sm text-white">Sin comprobantes en este rango</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {rows.map((r) => {
              const isPaid = !!r.paid_to_owner_at;
              return (
                <div
                  key={r.id}
                  className={`group relative aspect-[3/4] rounded-xl overflow-hidden bg-[var(--surface-2)] border ${
                    isPaid ? "border-white/40" : "border-[var(--border)]"
                  } transition-colors`}
                >
                  <button
                    onClick={() => setDetail(r)}
                    className="block w-full h-full text-left"
                    aria-label="Ver comprobante"
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
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="size-3 rounded-full"
                          style={{ background: r.account?.color ?? "#fff" }}
                        />
                        <span className="text-xs text-white font-medium truncate">
                          {r.account?.name ?? "—"}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/70 truncate">
                        {r.staff?.name} · {r.branch?.name}
                      </p>
                      <p className="text-[10px] text-white/50 tabular">
                        {formatDateTime(r.captured_at)}
                      </p>
                    </div>
                  </button>
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {isPaid && (
                      <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-black font-semibold inline-flex items-center gap-1">
                        <Check className="size-2.5" /> Pagado
                      </span>
                    )}
                    {r.owner_confirmed_at && (
                      <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/70 text-white border border-white/30 inline-flex items-center gap-1">
                        <CheckCheck className="size-2.5" /> Confirmado
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        {detail && (
          <DialogContent className="md:min-w-[40rem]">
            <DialogHeader
              title="Comprobante"
              description={`${detail.branch?.name ?? ""} · ${formatDateTime(detail.captured_at)}`}
            />
            <div className="grid md:grid-cols-2 gap-5">
              <div className="aspect-[3/4] rounded-xl overflow-hidden bg-black border border-[var(--border)]">
                {detail.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={detail.photo_url}
                    alt="Comprobante"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center text-[var(--text-muted)]">
                    <ImageOff className="size-6" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3 text-sm">
                <Field label="Cuenta" value={detail.account?.name ?? "—"} />
                <Field label="Sucursal" value={detail.branch?.name ?? "—"} />
                <Field label="Staff" value={detail.staff?.name ?? "—"} />
                <Field
                  label="Estado"
                  value={
                    detail.paid_to_owner_at
                      ? `Pagado al dueño · ${detail.paid_to_owner_by ?? ""} · ${formatDateTime(detail.paid_to_owner_at)}`
                      : "Pendiente"
                  }
                />
                {detail.photo_url && (
                  <a
                    href={detail.photo_url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-xs px-3 h-9 rounded-full border border-[var(--border-strong)] text-white hover:bg-[var(--surface-2)] self-start"
                  >
                    <Download className="size-3.5" />
                    Descargar foto
                  </a>
                )}
              </div>
            </div>
            <DialogFooter>
              {detail.paid_to_owner_at ? (
                <Button
                  variant="ghost"
                  onClick={() => togglePaid(detail, false)}
                  disabled={pending}
                >
                  <X className="size-4" />
                  Desmarcar
                </Button>
              ) : (
                <Button onClick={() => togglePaid(detail, true)} disabled={pending}>
                  <Check className="size-4" />
                  {pending ? "Marcando…" : "Marcar como pagado"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="text-white">{value}</p>
    </div>
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
