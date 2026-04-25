"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import {
  createAccountAction,
  deleteAccountAction,
  updateAccountAction,
} from "@/lib/actions/accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import type { Branch, Account } from "@/lib/db/types";

type AccountWithBranch = Account & { branch: Pick<Branch, "id" | "name"> };

const COLOR_OPTIONS = [
  "#FAFAFA",
  "#A1A1AA",
  "#22D3EE",
  "#34D399",
  "#FBBF24",
  "#F472B6",
  "#A78BFA",
  "#FB923C",
];

export function AccountsView({
  accounts,
  branches,
}: {
  accounts: AccountWithBranch[];
  branches: Branch[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AccountWithBranch | null>(null);
  const [pending, start] = useTransition();
  const [filterBranch, setFilterBranch] = useState<string>("all");

  // form state
  const [branchId, setBranchId] = useState<string>(branches[0]?.id ?? "");
  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [aliasCbu, setAliasCbu] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [icon, setIcon] = useState("");
  const [active, setActive] = useState(true);

  const filtered = useMemo(
    () =>
      filterBranch === "all"
        ? accounts
        : accounts.filter((a) => a.branch_id === filterBranch),
    [accounts, filterBranch],
  );

  function reset() {
    setEditing(null);
    setBranchId(branches[0]?.id ?? "");
    setName("");
    setBank("");
    setAliasCbu("");
    setColor(COLOR_OPTIONS[0]);
    setIcon("");
    setActive(true);
  }

  function openCreate() {
    if (branches.length === 0) {
      toast.error("Primero creá una sucursal");
      return;
    }
    reset();
    setOpen(true);
  }

  function openEdit(a: AccountWithBranch) {
    setEditing(a);
    setBranchId(a.branch_id);
    setName(a.name);
    setBank(a.bank ?? "");
    setAliasCbu(a.alias_cbu ?? "");
    setColor(a.color);
    setIcon(a.icon ?? "");
    setActive(a.is_active);
    setOpen(true);
  }

  function save() {
    start(async () => {
      const payload = {
        branch_id: branchId,
        name: name.trim(),
        bank: bank.trim() || null,
        alias_cbu: aliasCbu.trim() || null,
        color,
        icon: icon.trim() || null,
        sort_order: 0,
        is_active: active,
      };
      const res = editing
        ? await updateAccountAction(editing.id, payload)
        : await createAccountAction(payload);
      if (res.ok) {
        toast.success(editing ? "Actualizada" : "Cuenta creada");
        setOpen(false);
        reset();
        router.refresh();
      } else toast.error(res.error);
    });
  }

  function remove(a: AccountWithBranch) {
    if (!confirm(`¿Eliminar "${a.name}"?`)) return;
    start(async () => {
      const res = await deleteAccountAction(a.id);
      if (res.ok) {
        toast.success("Eliminada");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  return (
    <div className="max-w-5xl">
      <header className="flex items-center justify-between mb-8 gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Configuración
          </p>
          <h1 className="text-3xl text-white font-semibold tracking-tight mt-1">
            Cuentas
          </h1>
        </div>
        <div className="flex gap-2">
          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="h-11 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white"
          >
            <option value="all">Todas las sucursales</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Nueva
          </Button>
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
          <CreditCard className="size-8 text-[var(--text-muted)] mx-auto" />
          <p className="text-sm text-white mt-3">Sin cuentas</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
            Las cuentas son los botones que ve el staff al subir un comprobante.
          </p>
          <Button onClick={openCreate} variant="primary" size="sm">
            <Plus className="size-4" />
            Crear cuenta
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col gap-4"
            >
              <div className="flex items-start justify-between">
                <div
                  className="size-10 rounded-full flex items-center justify-center text-base font-semibold text-black"
                  style={{ background: a.color }}
                >
                  {a.icon || a.name[0]}
                </div>
                <span
                  className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    a.is_active
                      ? "border-white/20 text-white"
                      : "border-[var(--border)] text-[var(--text-subtle)]"
                  }`}
                >
                  {a.is_active ? "Activa" : "Inactiva"}
                </span>
              </div>
              <div>
                <p className="text-base text-white font-medium">{a.name}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {a.branch.name}
                  {a.bank && ` · ${a.bank}`}
                </p>
                {a.alias_cbu && (
                  <p className="text-xs text-[var(--text-subtle)] mt-1 font-mono truncate">
                    {a.alias_cbu}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-1 mt-auto">
                <button
                  onClick={() => openEdit(a)}
                  className="size-8 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-2)] transition-colors"
                  aria-label="Editar"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  onClick={() => remove(a)}
                  className="size-8 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--surface-2)] transition-colors"
                  aria-label="Eliminar"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader
            title={editing ? "Editar cuenta" : "Nueva cuenta"}
            description="El staff verá esto como un botón en su pantalla."
          />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="a-branch">Sucursal</Label>
              <select
                id="a-branch"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="h-11 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-2)] px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="a-name">Nombre que ve el staff</Label>
              <Input
                id="a-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Galicia Lucas, Mercado Pago…"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="a-bank">Banco</Label>
                <Input
                  id="a-bank"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  placeholder="Galicia"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="a-icon">Ícono (1 emoji)</Label>
                <Input
                  id="a-icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value.slice(0, 2))}
                  placeholder="$"
                  maxLength={2}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="a-cbu">Alias / CBU (opcional)</Label>
              <Input
                id="a-cbu"
                value={aliasCbu}
                onChange={(e) => setAliasCbu(e.target.value)}
                placeholder="lucas.galicia"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`size-8 rounded-full transition-all ${
                      color === c
                        ? "ring-2 ring-white ring-offset-2 ring-offset-[var(--surface)]"
                        : ""
                    }`}
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <label className="flex items-center gap-3 mt-1">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="size-4 accent-white"
              />
              <span className="text-sm text-white">Activa</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={pending || !name.trim() || !branchId}
            >
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
