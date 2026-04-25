"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, LogOut, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { logoutStaffAction } from "@/lib/actions/staff-auth";
import { uploadReceiptAction } from "@/lib/actions/receipts";
import type { AccountPublic } from "@/lib/db/types";

export function StaffHomeClient({
  staffName,
  branchName,
  todayCount,
  accounts,
}: {
  staffName: string;
  branchName: string;
  todayCount: number;
  accounts: AccountPublic[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const firstName = staffName.split(" ")[0];

  // cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // bloquea scroll del body cuando el sheet está abierto
  useEffect(() => {
    if (!photo) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [photo]);

  function openCamera() {
    if (accounts.length === 0) {
      toast.error("Pedile al admin que cargue cuentas");
      return;
    }
    fileRef.current?.click();
  }

  function onPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setPhoto(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
  }

  function discard() {
    setPhoto(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  function retake() {
    discard();
    setTimeout(() => fileRef.current?.click(), 80);
  }

  function submit(account: AccountPublic) {
    if (!photo || pending) return;
    start(async () => {
      try {
        const compressed = await imageCompression(photo, {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 1800,
          useWebWorker: true,
          initialQuality: 0.82,
          fileType: "image/jpeg",
        });
        const fd = new FormData();
        fd.append("accountId", account.id);
        fd.append(
          "photo",
          new File([compressed], `${account.id}.jpg`, { type: "image/jpeg" }),
        );
        const res = await uploadReceiptAction(fd);
        if (res.ok) {
          toast.success(`Subido a ${account.name}`);
          discard();
          router.refresh();
        } else {
          toast.error(res.error);
        }
      } catch {
        toast.error("No pudimos procesar la foto");
      }
    });
  }

  return (
    <main className="flex min-h-dvh flex-col px-5 py-6 safe-top safe-bottom">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPicked}
        className="hidden"
      />

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

      <section className="flex-1 flex flex-col items-center justify-center gap-8">
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
            Hoy
          </p>
          <p className="text-7xl text-white font-semibold tabular leading-none mt-1">
            {todayCount}
          </p>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            {todayCount === 1 ? "comprobante subido" : "comprobantes subidos"}
          </p>
        </div>

        <button
          onClick={openCamera}
          className="group relative flex flex-col items-center justify-center gap-3 size-56 rounded-full bg-white text-black active:scale-[0.97] transition-transform shadow-[0_0_60px_rgba(255,255,255,0.08)]"
          aria-label="Sacar foto"
        >
          <Camera className="size-14 stroke-[1.5]" />
          <span className="text-base font-semibold tracking-tight">
            Sacar foto
          </span>
        </button>

        <Link
          href="/staff/history"
          className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
        >
          Ver mis comprobantes
        </Link>
      </section>

      {/* Sheet de selección de cuenta — aparece cuando hay foto */}
      {photo && previewUrl && (
        <div className="fixed inset-0 z-40 bg-black flex flex-col safe-top safe-bottom animate-in fade-in slide-in-from-bottom-4">
          <header className="flex items-center justify-between px-5 py-4">
            <button
              onClick={discard}
              className="size-10 flex items-center justify-center text-white rounded-full hover:bg-[var(--surface-2)] active:scale-95"
              aria-label="Cancelar"
              disabled={pending}
            >
              <X className="size-5" />
            </button>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
              Elegí la cuenta
            </p>
            <div className="size-10" />
          </header>

          <section className="px-5 mb-4">
            <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface-2)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Comprobante"
                className="w-full h-40 object-cover"
              />
              <button
                onClick={retake}
                disabled={pending}
                className="absolute top-3 right-3 h-8 px-3 rounded-full bg-black/70 backdrop-blur text-white text-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-40"
              >
                <RotateCcw className="size-3.5" />
                Repetir
              </button>
            </div>
          </section>

          <section className="flex-1 px-5 pb-6 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)] mb-3">
              ¿A qué cuenta?
            </p>
            <div className="grid grid-cols-2 gap-3">
              {accounts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => submit(a)}
                  disabled={pending}
                  className="group relative aspect-square rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--border-strong)] active:scale-[0.97] transition-all flex flex-col justify-between p-4 text-left overflow-hidden disabled:opacity-50"
                >
                  <div
                    className="size-9 rounded-full flex items-center justify-center text-base font-semibold text-black"
                    style={{ background: a.color }}
                    aria-hidden
                  >
                    {a.icon ?? a.name[0]}
                  </div>
                  <div>
                    <p className="text-white text-base font-medium leading-tight">
                      {a.name}
                    </p>
                    {a.bank && (
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {a.bank}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
            {pending && (
              <p className="text-xs text-[var(--text-muted)] mt-4 text-center tabular">
                Subiendo…
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
