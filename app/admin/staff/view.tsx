"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, RefreshCw, Users, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  createStaffAction,
  deleteStaffAction,
  regeneratePinAction,
  updateStaffAction,
} from "@/lib/actions/staff";
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
import type { Branch } from "@/lib/db/types";

type StaffRow = {
  id: string;
  branch_id: string;
  name: string;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  branch: Pick<Branch, "id" | "name">;
};

export function StaffView({
  staff,
  branches,
}: {
  staff: StaffRow[];
  branches: Branch[];
}) {
  const router = useRouter();
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [pending, start] = useTransition();

  // form
  const [branchId, setBranchId] = useState<string>(branches[0]?.id ?? "");
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);

  // pin reveal
  const [revealedPin, setRevealedPin] = useState<{
    name: string;
    pin: string;
  } | null>(null);

  const filtered = useMemo(
    () =>
      filterBranch === "all"
        ? staff
        : staff.filter((s) => s.branch_id === filterBranch),
    [staff, filterBranch],
  );

  function reset() {
    setEditing(null);
    setBranchId(branches[0]?.id ?? "");
    setName("");
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

  function openEdit(s: StaffRow) {
    setEditing(s);
    setBranchId(s.branch_id);
    setName(s.name);
    setActive(s.is_active);
    setOpen(true);
  }

  function save() {
    start(async () => {
      const payload = { branch_id: branchId, name: name.trim(), is_active: active };
      if (editing) {
        const res = await updateStaffAction(editing.id, payload);
        if (res.ok) {
          toast.success("Actualizado");
          setOpen(false);
          router.refresh();
        } else toast.error(res.error);
      } else {
        const res = await createStaffAction(payload);
        if (res.ok) {
          setOpen(false);
          setRevealedPin({ name: res.staff.name, pin: res.pin });
          router.refresh();
        } else toast.error(res.error);
      }
    });
  }

  function regenPin(s: StaffRow) {
    if (!confirm(`¿Generar nuevo PIN para ${s.name}?`)) return;
    start(async () => {
      const res = await regeneratePinAction(s.id);
      if (res.ok) {
        setRevealedPin({ name: s.name, pin: res.pin });
        router.refresh();
      } else toast.error(res.error);
    });
  }

  function remove(s: StaffRow) {
    if (!confirm(`¿Eliminar a ${s.name}?`)) return;
    start(async () => {
      const res = await deleteStaffAction(s.id);
      if (res.ok) {
        toast.success("Eliminado");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  function copyPin() {
    if (!revealedPin) return;
    navigator.clipboard.writeText(revealedPin.pin);
    toast.success("PIN copiado");
  }

  return (
    <div className="max-w-5xl">
      <header className="flex items-center justify-between mb-8 gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Configuración
          </p>
          <h1 className="text-3xl text-white font-semibold tracking-tight mt-1">
            Staff
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
            Nuevo
          </Button>
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
          <Users className="size-8 text-[var(--text-muted)] mx-auto" />
          <p className="text-sm text-white mt-3">Sin staff</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
            Cuando crees un staff te vamos a mostrar el PIN una sola vez.
          </p>
          <Button onClick={openCreate} variant="primary" size="sm">
            <Plus className="size-4" />
            Crear staff
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] border-b border-[var(--border)]">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Sucursal</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium">Último login</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/50 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-[var(--surface-3)] border border-[var(--border-strong)] flex items-center justify-center text-white text-sm">
                        {s.name
                          .split(" ")
                          .map((p) => p[0])
                          .filter(Boolean)
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <span className="text-white font-medium">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[var(--text-muted)]">
                    {s.branch.name}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        s.is_active
                          ? "border-white/20 text-white"
                          : "border-[var(--border)] text-[var(--text-subtle)]"
                      }`}
                    >
                      {s.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[var(--text-muted)] text-xs tabular">
                    {s.last_login_at ? formatDateTime(s.last_login_at) : "—"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => regenPin(s)}
                        className="size-8 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-2)] transition-colors"
                        aria-label="Regenerar PIN"
                        title="Regenerar PIN"
                      >
                        <RefreshCw className="size-4" />
                      </button>
                      <button
                        onClick={() => openEdit(s)}
                        className="size-8 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-2)] transition-colors"
                        aria-label="Editar"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => remove(s)}
                        className="size-8 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--surface-2)] transition-colors"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader
            title={editing ? "Editar staff" : "Nuevo staff"}
            description={
              editing
                ? "Para regenerar el PIN usá el ícono ↻ en la fila."
                : "Te vamos a mostrar el PIN auto-generado una sola vez."
            }
          />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="s-name">Nombre</Label>
              <Input
                id="s-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Lucas, María…"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="s-branch">Sucursal</Label>
              <select
                id="s-branch"
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
            <label className="flex items-center gap-3 mt-1">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="size-4 accent-white"
              />
              <span className="text-sm text-white">Activo</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={pending || !name.trim() || !branchId}>
              {pending ? "Guardando…" : editing ? "Guardar" : "Crear y mostrar PIN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIN reveal dialog (one-time) */}
      <Dialog open={!!revealedPin} onOpenChange={() => setRevealedPin(null)}>
        <DialogContent>
          <DialogHeader
            title={`PIN de ${revealedPin?.name ?? ""}`}
            description="Anotalo o copialo. No lo vamos a volver a mostrar."
          />
          <div className="flex items-center justify-between gap-3 px-5 py-6 rounded-xl bg-[var(--surface-2)] border border-[var(--border-strong)]">
            <p className="text-5xl text-white font-mono tabular tracking-widest">
              {revealedPin?.pin}
            </p>
            <button
              onClick={copyPin}
              className="size-11 flex items-center justify-center rounded-full text-white border border-[var(--border-strong)] hover:bg-[var(--surface-3)] active:scale-95"
              aria-label="Copiar"
            >
              <Copy className="size-4" />
            </button>
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealedPin(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
