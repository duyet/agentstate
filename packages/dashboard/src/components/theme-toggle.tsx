"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
  /** Icon size in Tailwind class format. Defaults to "h-3.5 w-3.5". */
  size?: string;
  /** Extra classes for the button wrapper. */
  className?: string;
}

export function ThemeToggle({ size = "h-3.5 w-3.5", className }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.theme = next ? "dark" : "light";
    setIsDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className={
        className ??
        "p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      }
    >
      {isDark ? <SunIcon className={size} /> : <MoonIcon className={size} />}
    </button>
  );
}
