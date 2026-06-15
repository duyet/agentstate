import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import { DomainsContent } from "./domains-content";

// ---------------------------------------------------------------------------
// Page (wraps content in Providers + AppShell — new design system, no Kumo)
// ---------------------------------------------------------------------------

export function DomainsPage() {
  return (
    <Providers>
      <AppShell>
        <DomainsContent />
      </AppShell>
    </Providers>
  );
}
