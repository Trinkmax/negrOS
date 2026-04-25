"use client";
import { useEffect } from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"] as const;

export function PinKeypad({
  value,
  onChange,
  maxLength = 6,
  disabled = false,
  error = false,
}: {
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  disabled?: boolean;
  error?: boolean;
}) {
  // soporte teclado físico
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (disabled) return;
      if (/^[0-9]$/.test(e.key) && value.length < maxLength) {
        onChange(value + e.key);
      } else if (e.key === "Backspace") {
        onChange(value.slice(0, -1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [value, maxLength, onChange, disabled]);

  const press = (k: string) => {
    if (disabled) return;
    if (k === "back") onChange(value.slice(0, -1));
    else if (k && value.length < maxLength) onChange(value + k);
  };

  return (
    <div className="flex flex-col items-center gap-10 w-full">
      {/* dots */}
      <div className="flex gap-3">
        {Array.from({ length: maxLength }).map((_, i) => {
          const filled = i < value.length;
          return (
            <div
              key={i}
              className={cn(
                "size-3 rounded-full border transition-all duration-150",
                filled
                  ? error
                    ? "bg-[var(--danger)] border-[var(--danger)] scale-110"
                    : "bg-white border-white scale-110"
                  : "bg-transparent border-[var(--border-strong)]",
              )}
            />
          );
        })}
      </div>

      {/* keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {KEYS.map((k, i) => {
          if (k === "") return <div key={i} />;
          if (k === "back") {
            return (
              <button
                key={i}
                type="button"
                aria-label="Borrar"
                disabled={disabled || value.length === 0}
                onClick={() => press("back")}
                className="aspect-square flex items-center justify-center text-white/70 active:scale-90 transition-transform disabled:opacity-30"
              >
                <Delete className="size-7" />
              </button>
            );
          }
          return (
            <button
              key={i}
              type="button"
              aria-label={`Tecla ${k}`}
              disabled={disabled}
              onClick={() => press(k)}
              className="aspect-square flex items-center justify-center text-3xl font-light text-white active:bg-[var(--surface-2)] active:scale-95 rounded-full transition-all"
            >
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
}
