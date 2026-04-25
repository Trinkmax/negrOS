"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setupFirstAdminAction } from "@/lib/actions/setup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/wordmark";

export function SetupForm() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <Wordmark size="md" />
          <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--text-muted)] mt-1">
            Setup
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h1 className="text-xl text-white font-semibold tracking-tight">
            Creá el primer admin
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 mb-6">
            Esta pantalla solo está disponible una vez. Usala para vos.
          </p>

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              start(async () => {
                const res = await setupFirstAdminAction(data);
                if (res.ok) {
                  toast.success("Admin creado");
                  router.replace("/admin");
                  router.refresh();
                } else {
                  toast.error(res.error);
                }
              });
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="display">Nombre</Label>
              <Input
                id="display"
                name="displayName"
                required
                placeholder="Tu nombre"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña (mín 8)</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <Button type="submit" size="lg" disabled={pending} className="mt-3">
              {pending ? "Creando…" : "Crear admin y entrar"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
