"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { DOC_NAV } from "./docs-data";

const SECTION_IDS = DOC_NAV.flatMap((g) => g.items.map(([id]) => id));

export function DocsNav() {
  const [active, setActive] = useState("overview");

  // Lightweight scroll-spy: highlight the section closest to the top of the
  // viewport. Falls back to the clicked anchor's hash on navigation.
  useEffect(() => {
    const headings = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-88px 0px -70% 0px", threshold: 0 },
    );

    for (const heading of headings) observer.observe(heading);
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Documentation sections"
      className="sticky top-[88px] hidden flex-col gap-[18px] lg:flex"
    >
      {DOC_NAV.map((group) => (
        <div key={group.group}>
          <div className="as-label mb-2 block text-[10px]">{group.group}</div>
          <div className="flex flex-col gap-px">
            {group.items.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                aria-current={active === id ? "true" : undefined}
                onClick={() => setActive(id)}
                className={cn(
                  "rounded-[var(--radius)] px-2.5 py-1.5 text-left text-[13.5px] transition-colors",
                  active === id
                    ? "bg-panel2 font-semibold text-fg"
                    : "font-medium text-fg-3 hover:text-fg",
                )}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
