"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { loginPinAction } from "@/lib/actions/staff-auth";
import { PinKeypad } from "@/components/staff/pin-keypad";
import { Wordmark } from "@/components/wordmark";

export function LoginPin() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [isPending, start] = useTransition();

  useEffect(() => {
    if (pin.length !== 4 || isPending) return;
    start(async () => {
      const res = await loginPinAction(pin);
      if (res.ok) {
        toast.success("Bienvenido");
        router.replace("/staff");
        router.refresh();
      } else {
        setPinError(true);
        setTimeout(() => {
          setPin("");
          setPinError(false);
        }, 600);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <main className="flex min-h-dvh flex-col px-6 py-8 safe-top safe-bottom">
      <header className="flex items-center justify-center mb-10">
        <Wordmark size="sm" />
      </header>

      <section className="flex-1 flex flex-col items-center justify-between">
        <div className="flex flex-col items-center gap-2 mt-4">
          <h1 className="text-2xl font-semibold text-white">Ingresá tu PIN</h1>
          <p className="text-sm text-[var(--text-muted)]">4 dígitos</p>
        </div>
        <PinKeypad
          value={pin}
          onChange={setPin}
          maxLength={4}
          error={pinError}
          disabled={isPending}
        />
        <div className="h-6" />
      </section>
    </main>
  );
}
