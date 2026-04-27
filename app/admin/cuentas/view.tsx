"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  CreditCard,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import {
  createAccountAction,
  deleteAccountAction,
  setAccountVisibilityAction,
  updateAccountAction,
  type AccountWithBranches,
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
import { cn } from "@/lib/utils";
import type { Branch } from "@/lib/db/types";

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
  accounts: AccountWithBranches[];
  branches: Branch[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AccountWithBranches | null>(null);
  const [pending, start] = useTransition();
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [showHidden, setShowHidden] = useState(true);

  // form state
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [aliasCbu, setAliasCbu] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [icon, setIcon] = useState("");
  const [active, setActive] = useState(true);

  const filtered = useMemo(() => {
    return accounts.filter((a) => {
      if (
        filterBranch !== "all" &&
        !a.branches.some((b) => b.id === filterBranch)
      )
        return false;
      if (!showHidden && !a.is_active) return false;
      return true;
    });
  }, [accounts, filterBranch, showHidden]);

  function reset() {
    setEditing(null);
    setBranchIds(branches.length === 1 ? [branches[0].id] : []);
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
    if (filterBranch !== "all") setBranchIds([filterBranch]);
    setOpen(true);
  }

  function openEdit(a: AccountWithBranches) {
    setEditing(a);
    setBranchIds(a.branches.map((b) => b.id));
    setName(a.name);
    setBank(a.bank ?? "");
    setAliasCbu(a.alias_cbu ?? "");
    setColor(a.color);
    setIcon(a.icon ?? "");
    setActive(a.is_active);
    setOpen(true);
  }

  function toggleBranch(id: string) {
    setBranchIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function selectAllBranches() {
    setBranchIds(branches.map((b) => b.id));
  }

  function save() {
    if (branchIds.length === 0) {
      toast.error("Elegí al menos una sucursal");
      return;
    }
    start(async () => {
      const payload = {
        name: name.trim(),
        bank: bank.trim() || null,
        alias_cbu: aliasCbu.trim() || null,
        color,
        icon: icon.trim() || null,
        is_active: active,
        branch_ids: branchIds,
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

  function toggleVisible(a: AccountWithBranches) {
    const next = !a.is_active;
    start(async () => {
      const res = await setAccountVisibilityAction(a.id, next);
      if (res.ok) {
        toast.success(
          next
            ? `“${a.name}” visible para el staff`
            : `“${a.name}” oculta para el staff`,
        );
        router.refresh();
      } else toast.error(res.error);
    });
  }

  function remove(a: AccountWithBranches) {
    if (!confirm(`¿Eliminar "${a.name}"?`)) return;
    start(async () => {
      const res = await deleteAccountAction(a.id);
      if (res.ok) {
        toast.success("Eliminada");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  const totalVisible = accounts.filter((a) => a.is_active).length;
  const totalHidden = accounts.length - totalVisible;
  const allBranchesSelected =
    branchIds.length === branches.length && branches.length > 0;

  return (
    <div className="max-w-5xl">
      <header className="flex items-center justify-between mb-8 gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Configuración
          </p>
          <h1 className="text-3xl text-white font-semibold tracking-tight mt-1">
            Cuentas
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1 tabular">
            {totalVisible} visible{totalVisible !== 1 ? "s" : ""}
            {totalHidden > 0 && ` · ${totalHidden} oculta${totalHidden !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowHidden((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 h-11 px-4 rounded-lg border text-sm transition-colors",
              showHidden
                ? "border-[var(--border-strong)] text-white bg-[var(--surface-2)]"
                : "border-[var(--border)] text-[var(--text-muted)]",
            )}
            title={showHidden ? "Ocultar inactivas" : "Mostrar inactivas"}
          >
            {showHidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            {showHidden ? "Mostrando todas" : "Solo visibles"}
          </button>
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
              className={cn(
                "rounded-2xl border bg-[var(--surface)] p-5 flex flex-col gap-4 transition-all",
                a.is_active
                  ? "border-[var(--border)]"
                  : "border-[var(--border)] opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className={cn(
                    "size-10 rounded-full flex items-center justify-center text-base font-semibold text-black",
                    !a.is_active && "grayscale",
                  )}
                  style={{ background: a.color }}
                >
                  {a.icon || a.name[0]}
                </div>
                <VisibilitySwitch
                  checked={a.is_active}
                  onChange={() => toggleVisible(a)}
                  disabled={pending}
                />
              </div>
              <div>
                <p className="text-base text-white font-medium">{a.name}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {a.bank ?? "—"}
                </p>
                {a.alias_cbu && (
                  <p className="text-xs text-[var(--text-subtle)] mt-1 font-mono truncate">
                    {a.alias_cbu}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {a.branches.length === branches.length ? (
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-white/20 text-white">
                    Todas las sucursales
                  </span>
                ) : (
                  a.branches.map((b) => (
                    <span
                      key={b.id}
                      className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-muted)]"
                    >
                      {b.name}
                    </span>
                  ))
                )}
              </div>
              <div className="flex justify-between items-center mt-auto">
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border inline-flex items-center gap-1",
                    a.is_active
                      ? "border-white/20 text-white"
                      : "border-[var(--border)] text-[var(--text-subtle)]",
                  )}
                >
                  {a.is_active ? (
                    <>
                      <Eye className="size-2.5" />
                      Visible
                    </>
                  ) : (
                    <>
                      <EyeOff className="size-2.5" />
                      Oculta
                    </>
                  )}
                </span>
                <div className="flex gap-1">
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
              <div className="flex items-center justify-between">
                <Label>Sucursales</Label>
                <button
                  type="button"
                  onClick={
                    allBranchesSelected ? () => setBranchIds([]) : selectAllBranches
                  }
                  className="text-xs text-[var(--text-muted)] hover:text-white transition-colors"
                >
                  {allBranchesSelected ? "Ninguna" : "Todas"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {branches.map((b) => {
                  const checked = branchIds.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => toggleBranch(b.id)}
                      className={cn(
                        "h-11 px-3 rounded-lg border text-sm text-left transition-colors",
                        checked
                          ? "border-white bg-white text-black"
                          : "border-[var(--border-strong)] bg-[var(--surface-2)] text-white hover:border-white/40",
                      )}
                      aria-pressed={checked}
                    >
                      {b.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                La cuenta va a aparecer en cada sucursal seleccionada.
              </p>
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
            <label className="flex items-center justify-between gap-3 mt-1 px-3 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
              <div>
                <p className="text-sm text-white font-medium">Visible para el staff</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Si está oculta, no aparece en la pantalla de captura.
                </p>
              </div>
              <VisibilitySwitch
                checked={active}
                onChange={() => setActive((v) => !v)}
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={pending || !name.trim() || branchIds.length === 0}
            >
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VisibilitySwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50",
        checked ? "bg-white" : "bg-[var(--surface-3)]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none inline-block size-5 transform rounded-full shadow ring-0 transition duration-200",
          checked ? "translate-x-5 bg-black" : "translate-x-0 bg-[var(--text-muted)]",
        )}
      />
    </button>
  );
}
