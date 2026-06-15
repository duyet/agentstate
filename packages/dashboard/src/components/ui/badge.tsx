import type { ReactNode } from "react";

type Tone = "default" | "live" | "warn" | "idle";

const tones: Record<Tone, string> = {
  default: "border-edge text-fg-3",
  live: "border-pos/40 bg-pos/10 text-pos",
  warn: "border-warn/40 bg-warn/10 text-warn",
  idle: "border-edge text-fg-4",
};
const dotBg: Record<Tone, string> = {
  default: "bg-fg-4",
  live: "bg-pos",
  warn: "bg-warn",
  idle: "bg-fg-4",
};

export function Badge({
  tone = "default",
  dot = false,
  className = "",
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px] ${tones[tone]} ${className}`}
    >
      {dot && <span className={`size-1.5 rounded-full ${dotBg[tone]}`} />}
      {children}
    </span>
  );
}
