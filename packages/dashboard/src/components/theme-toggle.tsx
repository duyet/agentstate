"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

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
    <Button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      size="icon"
      variant="ghost"
      className={className || "size-10 text-muted-foreground hover:text-foreground"}
    >
      {isDark ? <SunIcon className={size} /> : <MoonIcon className={size} />}
    </Button>
  );
}
