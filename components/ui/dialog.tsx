"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type DialogContextType = {
  open: boolean;
  setOpen: (v: boolean) => void;
};
const DialogContext = React.createContext<DialogContextType | null>(null);

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <DialogContext.Provider value={{ open, setOpen: onOpenChange }}>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={() => onOpenChange(false)}
          aria-hidden
        />
        <div className="relative z-10 w-full md:w-auto md:min-w-[28rem] md:max-w-lg animate-in slide-in-from-bottom-8 md:slide-in-from-bottom-2 fade-in">
          {children}
        </div>
      </div>
    </DialogContext.Provider>
  );
}

export function DialogContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(DialogContext);
  return (
    <div
      role="dialog"
      aria-modal
      className={cn(
        "relative bg-[var(--surface)] border border-[var(--border-strong)] rounded-t-2xl md:rounded-2xl p-6 shadow-2xl",
        className,
      )}
    >
      {ctx && (
        <button
          onClick={() => ctx.setOpen(false)}
          aria-label="Cerrar"
          className="absolute top-4 right-4 size-8 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-2)] transition-colors"
        >
          <X className="size-4" />
        </button>
      )}
      {children}
    </div>
  );
}

export function DialogHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5 pr-10">
      <h2 className="text-lg text-white font-semibold tracking-tight">{title}</h2>
      {description && (
        <p className="text-sm text-[var(--text-muted)] mt-1">{description}</p>
      )}
    </div>
  );
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>;
}
