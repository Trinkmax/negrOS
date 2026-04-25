"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { loginAdminAction } from "@/lib/actions/admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/wordmark";

export function AdminLoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-10 safe-top safe-bottom">
      <div className="w-full max-w-sm flex flex-col items-center">
        <Wordmark size="md" className="mb-1" />
        <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--text-muted)] mb-12">
          Admin
        </p>

        <form
          className="w-full flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            start(async () => {
              const res = await loginAdminAction(data);
              if (res.ok) {
                toast.success("Bienvenido");
                router.replace(next ?? "/admin");
                router.refresh();
              } else {
                toast.error(res.error);
              }
            });
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="dueño@negrOS.app"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" size="lg" disabled={pending} className="mt-4">
            {pending ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </div>
    </main>
  );
}
