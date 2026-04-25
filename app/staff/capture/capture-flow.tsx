"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { uploadReceiptAction } from "@/lib/actions/receipts";
import type { AccountPublic } from "@/lib/db/types";

type Step = "camera" | "account";

export function CaptureFlow({ accounts }: { accounts: AccountPublic[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("camera");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Auto-abrir el picker al entrar
  useEffect(() => {
    const t = setTimeout(() => fileRef.current?.click(), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function onPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setPhoto(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
    setStep("account");
  }

  function retake() {
    setPhoto(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setStep("camera");
    setTimeout(() => fileRef.current?.click(), 80);
  }

  function pickAccount(account: AccountPublic) {
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
          router.replace("/staff");
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
    <main className="flex min-h-dvh flex-col bg-black safe-top safe-bottom">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPicked}
        className="hidden"
      />

      <header className="flex items-center justify-between px-5 py-4">
        <button
          onClick={() => router.replace("/staff")}
          className="size-10 flex items-center justify-center text-white rounded-full hover:bg-[var(--surface-2)] active:scale-95"
          aria-label="Cancelar"
          disabled={pending}
        >
          {step === "camera" ? <ArrowLeft className="size-5" /> : <X className="size-5" />}
        </button>
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
          {step === "camera" ? "Sacá una foto" : "Elegí la cuenta"}
        </p>
        <div className="size-10" />
      </header>

      {step === "camera" && (
        <>
          <section className="flex-1 flex items-center justify-center px-5">
            <div className="flex flex-col items-center text-center gap-3 text-[var(--text-muted)]">
              <Camera className="size-12" />
              <p className="text-sm">Esperando la foto…</p>
            </div>
          </section>
          <footer className="px-5 py-6">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-14 rounded-full bg-white text-black font-semibold flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Camera className="size-5" />
              Abrir cámara
            </button>
          </footer>
        </>
      )}

      {step === "account" && previewUrl && (
        <>
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
            {accounts.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-6 text-center">
                <p className="text-sm text-white">Sin cuentas configuradas</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Pedile al admin que cargue cuentas para esta sucursal.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => pickAccount(a)}
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
            )}
            {pending && (
              <p className="text-xs text-[var(--text-muted)] mt-4 text-center tabular">
                Subiendo…
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
