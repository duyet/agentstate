import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import IntegrateContent from "./integrate-content";

/**
 * Astro entry for the /dashboard/integrate route.
 * Providers supplies ClerkProvider; AppShell renders the sidebar/topbar and the
 * auth gate.
 */
export function IntegratePage() {
  return (
    <Providers>
      <AppShell>
        <IntegrateContent />
      </AppShell>
    </Providers>
  );
}
