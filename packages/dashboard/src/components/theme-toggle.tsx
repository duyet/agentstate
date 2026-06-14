"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { Button } from "@cloudflare/kumo";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
  /** Extra classes for the button wrapper. */
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
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
      variant="ghost"
      shape="square"
      className={className}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
