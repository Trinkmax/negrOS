"use client";

import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { logoutStaffAction } from "@/lib/actions/staff-auth";

export function StaffHomeHeader({
  staffName,
  branchName,
}: {
  staffName: string;
  branchName: string;
}) {
  const firstName = staffName.split(" ")[0];
  return (
    <header className="flex items-center justify-between mb-2">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
          {branchName}
        </p>
        <h1 className="text-xl text-white font-semibold mt-0.5">
          Hola, {firstName}
        </h1>
      </div>
      <button
        onClick={() =>
          toast("¿Cerrar sesión?", {
            action: { label: "Salir", onClick: () => logoutStaffAction() },
          })
        }
        className="size-10 rounded-full border border-[var(--border-strong)] flex items-center justify-center text-white hover:bg-[var(--surface-2)] active:scale-95 transition-all"
        aria-label="Cerrar sesión"
      >
        <LogOut className="size-4" />
      </button>
    </header>
  );
}
