"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Trash2,
  X,
  Save,
  Share2,
  CheckCheck,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import {
  editReceiptAction,
  softDeleteReceiptAction,
} from "@/lib/actions/receipts";
import { confirmReceivedAction } from "@/lib/actions/payments";
import { createShareLinkAction } from "@/lib/actions/share";
import type { Branch, Account } from "@/lib/db/types";
import { formatDateTime } from "@/lib/utils";

type Row = {
  id: string;
  captured_at: string;
  photo_url: string | null;
  owner_confirmed_at: string | null;
  branch: { id: string; name: string };
  account: { id: string; name: string; color: string; icon: string | null };
  staff: { id: string; name: string; avatar_url: string | null };
};

type StaffRow = { id: string; branch_id: string; name: string; avatar_url: string | null };
type AccountRow = Account & { branch: { id: string; name: string } };

export function ReceiptsView({
  rows,
  total,
  page,
  pageSize,
  branches,
  accounts,
  staff,
}: {
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  branches: Branch[];
  accounts: AccountRow[];
  staff: StaffRow[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [openFilters, setOpenFilters] = useState(false);
  const [openShare, setOpenShare] = useState(false);
  const [detail, setDetail] = useState<Row | null>(null);
  const [pending, start] = useTransition();

  const [from, setFrom] = useState(sp.get("from") ?? "");
  const [to, setTo] = useState(sp.get("to") ?? "");
  const [branchSel, setBranchSel] = useState<string[]>(
    sp.get("branch")?.split(",").filter(Boolean) ?? [],
  );
  const [accountSel, setAccountSel] = useState<string[]>(
    sp.get("account")?.split(",").filter(Boolean) ?? [],
  );
  const [staffSel, setStaffSel] = useState<string[]>(
    sp.get("staff")?.split(",").filter(Boolean) ?? [],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const accountsForBranch = useMemo(() => {
    if (branchSel.length === 0) return accounts;
    return accounts.filter((a) => branchSel.includes(a.branch_id));
  }, [accounts, branchSel]);

  const staffForBranch = useMemo(() => {
    if (branchSel.length === 0) return staff;
    return staff.filter((s) => branchSel.includes(s.branch_id));
  }, [staff, branchSel]);

  function applyFilters() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (branchSel.length) params.set("branch", branchSel.join(","));
    if (accountSel.length) params.set("account", accountSel.join(","));
    if (staffSel.length) params.set("staff", staffSel.join(","));
    params.set("page", "0");
    router.push(`/admin/comprobantes?${params.toString()}`);
    setOpenFilters(false);
  }

  function clearFilters() {
    setFrom("");
    setTo("");
    setBranchSel([]);
    setAccountSel([]);
    setStaffSel([]);
    router.push("/admin/comprobantes");
    setOpenFilters(false);
  }

  function quickRange(days: number) {
    const t = new Date();
    const f = new Date();
    f.setDate(f.getDate() - days);
    if (days === 0) f.setHours(0, 0, 0, 0);
    setFrom(toLocalInput(f));
    setTo(toLocalInput(t));
  }

  function changePage(delta: number) {
    const next = Math.min(Math.max(0, page + delta), totalPages - 1);
    const params = new URLSearchParams(sp);
    params.set("page", String(next));
    router.push(`/admin/comprobantes?${params.toString()}`);
  }

  function downloadZip() {
    const params = new URLSearchParams();
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to).toISOString());
    if (branchSel.length) params.set("branch", branchSel.join(","));
    if (accountSel.length) params.set("account", accountSel.join(","));
    if (staffSel.length) params.set("staff", staffSel.join(","));
    window.location.href = `/api/download?${params.toString()}`;
  }

  function toggleConfirmed(r: Row) {
    start(async () => {
      const next = !r.owner_confirmed_at;
      const res = await confirmReceivedAction(r.id, next);
      if (res.ok) {
        toast.success(next ? "Pago confirmado" : "Confirmación quitada");
        router.refresh();
        if (detail?.id === r.id) {
          setDetail({
            ...r,
            owner_confirmed_at: next ? new Date().toISOString() : null,
          });
        }
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="max-w-7xl">
      <header className="flex items-center justify-between mb-8 gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Repositorio
          </p>
          <h1 className="text-3xl text-white font-semibold tracking-tight mt-1">
            Comprobantes
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1 tabular">
            {total} resultado{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setOpenFilters(true)}>
            <Filter className="size-4" />
            Filtros
          </Button>
          <Button variant="secondary" onClick={() => setOpenShare(true)}>
            <Share2 className="size-4" />
            Compartir
          </Button>
          <Button onClick={downloadZip} disabled={total === 0}>
            <Download className="size-4" />
            Descargar
          </Button>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
          <p className="text-sm text-white">Sin comprobantes</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Probá ampliar los filtros o esperá a la primera subida del staff.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {rows.map((r) => {
              const isReceived = !!r.owner_confirmed_at;
              return (
                <button
                  key={r.id}
                  onClick={() => setDetail(r)}
                  className={`group relative aspect-[3/4] rounded-xl overflow-hidden bg-[var(--surface-2)] border ${
                    isReceived
                      ? "border-white/40"
                      : "border-[var(--border)]"
                  } hover:border-[var(--border-strong)] active:scale-[0.99] transition-all text-left`}
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
                        style={{ background: r.account.color }}
                      />
                      <span className="text-xs text-white font-medium truncate">
                        {r.account.name}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/70 truncate">
                      {r.staff.name} · {r.branch.name}
                    </p>
                    <p className="text-[10px] text-white/50 tabular">
                      {formatDateTime(r.captured_at)}
                    </p>
                  </div>
                  {isReceived && (
                    <div className="absolute top-2 left-2">
                      <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-black font-semibold inline-flex items-center gap-1">
                        <CheckCheck className="size-2.5" /> Recibido
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between text-sm text-[var(--text-muted)]">
            <p className="tabular">
              Página {page + 1} de {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => changePage(-1)}
                disabled={page === 0}
                className="size-9 flex items-center justify-center rounded-lg border border-[var(--border)] hover:bg-[var(--surface-2)] disabled:opacity-30"
                aria-label="Anterior"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => changePage(1)}
                disabled={page >= totalPages - 1}
                className="size-9 flex items-center justify-center rounded-lg border border-[var(--border)] hover:bg-[var(--surface-2)] disabled:opacity-30"
                aria-label="Siguiente"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Filters dialog */}
      <Dialog open={openFilters} onOpenChange={setOpenFilters}>
        <DialogContent className="md:min-w-[36rem]">
          <DialogHeader title="Filtros" description="Acotá la búsqueda." />
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              {[
                ["Hoy", 0],
                ["7 días", 7],
                ["30 días", 30],
                ["90 días", 90],
              ].map(([label, days]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => quickRange(days as number)}
                  className="text-xs px-3 h-8 rounded-full border border-[var(--border-strong)] text-white hover:bg-[var(--surface-2)]"
                >
                  {label as string}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Desde</Label>
                <Input
                  type="datetime-local"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Hasta</Label>
                <Input
                  type="datetime-local"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>
            <MultiPicker
              label="Sucursales"
              items={branches.map((b) => ({ id: b.id, label: b.name }))}
              value={branchSel}
              onChange={setBranchSel}
            />
            <MultiPicker
              label="Cuentas"
              items={accountsForBranch.map((a) => ({
                id: a.id,
                label: `${a.name} · ${a.branch.name}`,
              }))}
              value={accountSel}
              onChange={setAccountSel}
            />
            <MultiPicker
              label="Staff"
              items={staffForBranch.map((s) => ({ id: s.id, label: s.name }))}
              value={staffSel}
              onChange={setStaffSel}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={clearFilters}>
              Limpiar
            </Button>
            <Button onClick={applyFilters}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share dialog */}
      <Dialog open={openShare} onOpenChange={setOpenShare}>
        <ShareCreateDialog
          branches={branches}
          onClose={() => setOpenShare(false)}
        />
      </Dialog>

      {/* Detail / edit */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        {detail && (
          <ReceiptDetail
            row={detail}
            accounts={accounts}
            staff={staff}
            pending={pending}
            onSave={(payload) =>
              start(async () => {
                const res = await editReceiptAction({ id: detail.id, ...payload });
                if (res.ok) {
                  toast.success("Actualizado");
                  setDetail(null);
                  router.refresh();
                } else toast.error(res.error);
              })
            }
            onDelete={() => {
              if (!confirm("¿Eliminar este comprobante?")) return;
              start(async () => {
                const res = await softDeleteReceiptAction(detail.id);
                if (res.ok) {
                  toast.success("Eliminado");
                  setDetail(null);
                  router.refresh();
                } else toast.error(res.error);
              });
            }}
            onToggleConfirmed={() => toggleConfirmed(detail)}
            onClose={() => setDetail(null)}
          />
        )}
      </Dialog>
    </div>
  );
}

function ShareCreateDialog({
  branches,
  onClose,
}: {
  branches: Branch[];
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [created, setCreated] = useState<{ url: string; label: string } | null>(null);

  // Defaults: hoy 00:00 → 23:59
  const today = new Date();
  const startStr = (() => {
    const d = new Date(today);
    d.setHours(0, 0, 0, 0);
    return toLocalInput(d);
  })();
  const endStr = (() => {
    const d = new Date(today);
    d.setHours(23, 59, 59, 999);
    return toLocalInput(d);
  })();

  const [from, setFrom] = useState(startStr);
  const [to, setTo] = useState(endStr);
  const [branchId, setBranchId] = useState<string>("");
  const [label, setLabel] = useState(
    `Comprobantes ${today.toLocaleDateString("es-AR")}`,
  );
  const [expiresDays, setExpiresDays] = useState(7);

  function preset(days: number) {
    const t = new Date();
    const f = new Date(t);
    f.setDate(t.getDate() - days);
    if (days === 0) {
      f.setHours(0, 0, 0, 0);
      t.setHours(23, 59, 59, 999);
    }
    setFrom(toLocalInput(f));
    setTo(toLocalInput(t));
  }

  function create() {
    start(async () => {
      const res = await createShareLinkAction({
        date_from: new Date(from).toISOString(),
        date_to: new Date(to).toISOString(),
        branch_id: branchId || null,
        label: label.trim() || null,
        expires_in_days: expiresDays,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const url = `${window.location.origin}/share/${res.token}`;
      setCreated({ url, label });
    });
  }

  function copy() {
    if (!created) return;
    navigator.clipboard.writeText(created.url);
    toast.success("Link copiado");
  }

  function whatsapp() {
    if (!created) return;
    const msg = `${created.label}\n${created.url}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener",
    );
  }

  if (created) {
    return (
      <DialogContent className="md:min-w-[32rem]">
        <DialogHeader
          title="Link listo"
          description="Compartilo con tu financiera."
        />
        <div className="rounded-xl bg-[var(--surface-2)] border border-[var(--border-strong)] px-4 py-3 flex items-center gap-3">
          <p className="text-sm text-white truncate font-mono flex-1">
            {created.url}
          </p>
          <button
            onClick={copy}
            className="size-9 flex items-center justify-center rounded-full text-white border border-[var(--border-strong)] hover:bg-[var(--surface-3)]"
            aria-label="Copiar"
          >
            <Copy className="size-4" />
          </button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={whatsapp}>
            <Share2 className="size-4" />
            WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="md:min-w-[36rem]">
      <DialogHeader
        title="Compartir con financiera"
        description="Generá un link de solo-lectura para que la financiera vea y marque pagos."
      />
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-2">
          {[
            ["Hoy", 0],
            ["Ayer + hoy", 1],
            ["7 días", 7],
          ].map(([lbl, d]) => (
            <button
              key={lbl}
              type="button"
              onClick={() => preset(d as number)}
              className="text-xs px-3 h-8 rounded-full border border-[var(--border-strong)] text-white hover:bg-[var(--surface-2)]"
            >
              {lbl as string}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label>Desde</Label>
            <Input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Hasta</Label>
            <Input
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Sucursal (opcional)</Label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="h-11 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white"
          >
            <option value="">Todas</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Título del link</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Expira en</Label>
          <select
            value={expiresDays}
            onChange={(e) => setExpiresDays(Number(e.target.value))}
            className="h-11 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white"
          >
            <option value={1}>1 día</option>
            <option value={3}>3 días</option>
            <option value={7}>7 días</option>
            <option value={15}>15 días</option>
            <option value={30}>30 días</option>
          </select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={pending}>
          Cancelar
        </Button>
        <Button onClick={create} disabled={pending || !from || !to}>
          {pending ? "Generando…" : "Generar link"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function MultiPicker({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: { id: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
        {items.length === 0 && (
          <span className="text-xs text-[var(--text-muted)]">Sin opciones</span>
        )}
        {items.map((it) => {
          const active = value.includes(it.id);
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => toggle(it.id)}
              className={`text-xs px-3 h-8 rounded-full border transition-colors ${
                active
                  ? "bg-white text-black border-white"
                  : "border-[var(--border-strong)] text-white hover:bg-[var(--surface-2)]"
              }`}
            >
              {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReceiptDetail({
  row,
  accounts,
  staff,
  pending,
  onSave,
  onDelete,
  onToggleConfirmed,
  onClose,
}: {
  row: Row;
  accounts: AccountRow[];
  staff: StaffRow[];
  pending: boolean;
  onSave: (p: { accountId?: string; staffId?: string; adminNote?: string | null }) => void;
  onDelete: () => void;
  onToggleConfirmed: () => void;
  onClose: () => void;
}) {
  const [accountId, setAccountId] = useState(row.account.id);
  const [staffId, setStaffId] = useState(row.staff.id);
  const [note, setNote] = useState("");

  const accountsForBranch = accounts.filter((a) => a.branch_id === row.branch.id);
  const staffForBranch = staff.filter((s) => s.branch_id === row.branch.id);

  return (
    <DialogContent className="md:min-w-[44rem]">
      <DialogHeader
        title="Comprobante"
        description={`${row.branch.name} · ${formatDateTime(row.captured_at)}`}
      />
      <div className="grid md:grid-cols-2 gap-5">
        <div className="aspect-[3/4] rounded-xl overflow-hidden bg-[var(--surface-2)] border border-[var(--border)] relative">
          {row.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.photo_url}
              alt="Comprobante"
              className="w-full h-full object-contain bg-black"
            />
          ) : (
            <div className="size-full flex items-center justify-center text-[var(--text-muted)]">
              <ImageOff className="size-6" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4">
          {/* Pago recibido */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 flex flex-col gap-3">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
              Pago de la financiera
            </p>
            <p className="text-sm text-white">
              {row.owner_confirmed_at
                ? `Recibido · ${formatDateTime(row.owner_confirmed_at)}`
                : "Pendiente de cobro"}
            </p>
            <Button
              size="sm"
              variant={row.owner_confirmed_at ? "outline" : "primary"}
              onClick={onToggleConfirmed}
              disabled={pending}
              className="self-start"
            >
              <CheckCheck className="size-4" />
              {row.owner_confirmed_at ? "Quitar confirmación" : "Marcar como recibido"}
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Cuenta destino</Label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="h-11 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white"
            >
              {accountsForBranch.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Staff</Label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="h-11 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white"
            >
              {staffForBranch.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Nota interna (opcional)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anotá algo si querés…"
            />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="danger" onClick={onDelete} disabled={pending}>
          <Trash2 className="size-4" />
          Eliminar
        </Button>
        <Button variant="ghost" onClick={onClose} disabled={pending}>
          <X className="size-4" />
          Cerrar
        </Button>
        <Button
          onClick={() =>
            onSave({
              accountId: accountId !== row.account.id ? accountId : undefined,
              staffId: staffId !== row.staff.id ? staffId : undefined,
              adminNote: note || undefined,
            })
          }
          disabled={pending}
        >
          <Save className="size-4" />
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}
