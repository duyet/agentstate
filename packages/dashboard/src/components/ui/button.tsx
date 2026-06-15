import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children?: ReactNode;
}

const base =
  "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-[var(--radius)] px-4 py-2.5 text-[13px] font-medium transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100";

const variants: Record<Variant, string> = {
  primary: "bg-white text-black hover:bg-zinc-200",
  secondary: "border border-edge text-fg hover:bg-panel2",
  ghost: "text-fg-3 hover:text-fg hover:bg-panel2",
  danger: "border border-neg/40 bg-neg/10 text-neg hover:bg-neg/20",
};

export function Button({ variant = "secondary", className = "", children, ...rest }: Props) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
