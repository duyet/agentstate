"use client";

import { Moon, Sun } from "@phosphor-icons/react";
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
    const el = document.documentElement;
    // Kumo uses `data-mode="dark"`; shadcn uses the `.dark` class. Set both
    // while the two systems coexist during the Kumo migration.
    el.classList.toggle("dark", next);
    el.setAttribute("data-mode", next ? "dark" : "light");
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
      {isDark ? <Sun className={size} /> : <Moon className={size} />}
    </Button>
  );
}
