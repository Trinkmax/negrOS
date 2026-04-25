"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User } from "lucide-react";
import { toast } from "sonner";
import { loginPinAction } from "@/lib/actions/staff-auth";
import { PinKeypad } from "@/components/staff/pin-keypad";
import { Wordmark } from "@/components/wordmark";
import { cn } from "@/lib/utils";

type Staff = {
  id: string;
  name: string;
  avatar_url: string | null;
  branch_id: string;
  branch_name: string;
};

export function LoginWizard({ staffList }: { staffList: Staff[] }) {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [isPending, start] = useTransition();

  function back() {
    setPinError(false);
    setStaff(null);
    setPin("");
  }

  useEffect(() => {
    if (!staff || pin.length < 4 || isPending) return;
    start(async () => {
      const res = await loginPinAction(staff.id, pin);
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
  }, [pin, staff]);

  return (
    <main className="flex min-h-dvh flex-col px-6 py-8 safe-top safe-bottom">
      <header className="flex items-center justify-between mb-10">
        <button
          onClick={back}
          disabled={!staff}
          className={cn(
            "size-10 flex items-center justify-center rounded-full text-white",
            !staff
              ? "opacity-0 pointer-events-none"
              : "hover:bg-[var(--surface-2)] active:scale-95 transition-all",
          )}
          aria-label="Volver"
        >
          <ArrowLeft className="size-5" />
        </button>
        <Wordmark size="sm" />
        <div className="size-10" />
      </header>

      {!staff ? (
        <section className="flex-1 flex flex-col">
          <h1 className="text-2xl font-semibold text-white mb-1">¿Quién sos?</h1>
          <p className="text-sm text-[var(--text-muted)] mb-8">
            Tocá tu nombre.
          </p>
          {staffList.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-12">
              <div className="size-16 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]">
                <User className="size-8" />
              </div>
              <p className="text-base font-medium text-white">Sin staff</p>
              <p className="text-sm text-[var(--text-muted)] max-w-xs">
                Pedile al admin que te dé de alta.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {staffList.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStaff(s)}
                  className="flex flex-col items-center gap-3 px-3 py-6 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--border-strong)] active:scale-[0.98] transition-all"
                >
                  <Avatar name={s.name} url={s.avatar_url} />
                  <div className="text-center">
                    <p className="text-white text-base font-medium">{s.name}</p>
                    {s.branch_name && (
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.2em] mt-0.5">
                        {s.branch_name}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="flex-1 flex flex-col items-center justify-between">
          <div className="flex flex-col items-center gap-3 mt-4">
            <Avatar name={staff.name} url={staff.avatar_url} />
            <p className="text-base text-white">Hola, {staff.name.split(" ")[0]}</p>
            <p className="text-xs text-[var(--text-muted)]">Ingresá tu PIN</p>
          </div>
          <PinKeypad
            value={pin}
            onChange={setPin}
            maxLength={6}
            error={pinError}
            disabled={isPending}
          />
          <div className="h-6" />
        </section>
      )}
    </main>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className="size-16 rounded-full object-cover border border-[var(--border-strong)]"
      />
    );
  }
  return (
    <div className="size-16 rounded-full bg-[var(--surface-3)] border border-[var(--border-strong)] flex items-center justify-center text-white text-lg font-medium">
      {initials}
    </div>
  );
}
