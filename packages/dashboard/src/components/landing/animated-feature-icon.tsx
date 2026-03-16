"use client";

type FeatureIconVariant = "database" | "cpu" | "plug";

interface AnimatedFeatureIconProps {
  variant: FeatureIconVariant;
  className?: string;
}

export function AnimatedFeatureIcon({ variant, className = "" }: AnimatedFeatureIconProps) {
  return (
    <div className={`flex items-center justify-center w-10 h-10 rounded-lg bg-accent ${className}`}>
      {variant === "database" && <DatabaseIcon />}
      {variant === "cpu" && <CpuIcon />}
      {variant === "plug" && <PlugIcon />}
    </div>
  );
}

function DatabaseIcon() {
  return (
    <svg
      role="presentation"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5 text-muted-foreground"
    >
      <ellipse cx="12" cy="5" rx="8" ry="3" className="animate-pulse-soft" />
      <path d="M20 5v6c0 1.657-3.582 3-8 3S4 12.657 4 11V5" />
      <path d="M20 11v6c0 1.657-3.582 3-8 3s-8-1.343-8-3v-6" />
    </svg>
  );
}

function CpuIcon() {
  return (
    <svg
      role="presentation"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5 text-muted-foreground"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" rx="1" className="animate-pulse-soft" />
      {/* Pins */}
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="15" x2="4" y2="15" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="15" x2="23" y2="15" />
    </svg>
  );
}

function PlugIcon() {
  return (
    <svg
      role="presentation"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5 text-muted-foreground"
    >
      <path d="M12 22v-5" />
      <path d="M9 8V1" />
      <path d="M15 8V1" />
      <path d="M18 8H6a2 2 0 0 0-2 2v2c0 3.314 3.582 6 8 6s8-2.686 8-6v-2a2 2 0 0 0-2-2Z" />
      {/* Connection dots */}
      <circle cx="9" cy="1" r="0.5" fill="currentColor" className="animate-pulse-soft" />
      <circle cx="15" cy="1" r="0.5" fill="currentColor" className="animate-pulse-soft" />
    </svg>
  );
}
