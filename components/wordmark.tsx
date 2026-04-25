import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZE_MAP = {
  sm: { h: 28, w: 88 },
  md: { h: 44, w: 138 },
  lg: { h: 72, w: 226 },
  xl: { h: 140, w: 440 },
} as const;

export function Wordmark({
  className,
  size = "md",
  priority = false,
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  priority?: boolean;
}) {
  const { h, w } = SIZE_MAP[size];
  return (
    <Image
      src="/logo.png"
      alt="nos"
      width={w}
      height={h}
      priority={priority}
      className={cn("select-none object-contain", className)}
      style={{ height: h, width: "auto" }}
    />
  );
}
