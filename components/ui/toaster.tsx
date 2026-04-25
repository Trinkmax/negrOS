"use client";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-center"
      offset={24}
      richColors={false}
      toastOptions={{
        style: {
          background: "var(--surface-2)",
          border: "1px solid var(--border-strong)",
          color: "var(--text)",
          fontFamily: "var(--font-sans)",
          borderRadius: "var(--radius-md)",
        },
      }}
    />
  );
}
