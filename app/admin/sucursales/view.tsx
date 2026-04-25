"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, Building2 } from "lucide-react";
import { toast } from "sonner";
import {
  createBranchAction,
  deleteBranchAction,
  updateBranchAction,
} from "@/lib/actions/branches";
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

export function BranchesView({ branches }: { branches: Branch[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [active, setActive] = useState(true);
  const [pending, start] = useTransition();

  function openCreate() {
    setEditing(null);
    setName("");
    setAddress("");
    setActive(true);
    setOpen(true);
  }

  function openEdit(b: Branch) {
    setEditing(b);
    setName(b.name);
    setAddress(b.address ?? "");
    setActive(b.is_active);
    setOpen(true);
  }

  function save() {
    start(async () => {
      const payload = {
        name: name.trim(),
        address: address.trim() || null,
        is_active: active,
      };
      const res = editing
        ? await updateBranchAction(editing.id, payload)
        : await createBranchAction(payload);
      if (res.ok) {
        toast.success(editing ? "Actualizada" : "Sucursal creada");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function remove(b: Branch) {
    if (!confirm(`¿Eliminar "${b.name}"? No se puede deshacer.`)) return;
    start(async () => {
      const res = await deleteBranchAction(b.id);
      if (res.ok) {
        toast.success("Eliminada");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  return (
    <div className="max-w-4xl">
      <header className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Configuración
          </p>
          <h1 className="text-3xl text-white font-semibold tracking-tight mt-1">
            Sucursales
          </h1>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Nueva
        </Button>
      </header>

      {branches.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
          <Building2 className="size-8 text-[var(--text-muted)] mx-auto" />
          <p className="text-sm text-white mt-3">Sin sucursales</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
            Empezá creando la primera.
          </p>
          <Button onClick={openCreate} variant="primary" size="sm">
            <Plus className="size-4" />
            Crear sucursal
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] border-b border-[var(--border)]">
                <th className="px-5 py-3 font-medium">Nombre</th>
                <th className="px-5 py-3 font-medium">Dirección</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium">Creada</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/50 transition-colors"
                >
                  <td className="px-5 py-4 text-white font-medium">{b.name}</td>
                  <td className="px-5 py-4 text-[var(--text-muted)]">
                    {b.address || "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        b.is_active
                          ? "border-white/20 text-white"
                          : "border-[var(--border)] text-[var(--text-subtle)]"
                      }`}
                    >
                      {b.is_active ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[var(--text-muted)] text-xs tabular">
                    {formatDateTime(b.created_at)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(b)}
                        className="size-8 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-2)] transition-colors"
                        aria-label="Editar"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => remove(b)}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader
            title={editing ? "Editar sucursal" : "Nueva sucursal"}
            description="Las sucursales agrupan cuentas y staff."
          />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="b-name">Nombre</Label>
              <Input
                id="b-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Centro, Belgrano…"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="b-addr">Dirección (opcional)</Label>
              <Input
                id="b-addr"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Av. Siempre Viva 742"
              />
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
            <Button onClick={save} disabled={pending || !name.trim()}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
