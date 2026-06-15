import { DashboardShell } from "@/components/dashboard-shell";
import IntegrateContent from "./integrate-content";

/**
 * Astro entry for the /dashboard/integrate route.
 * Mounts the ported Next page body inside the shared auth-gated dashboard shell.
 */
export function IntegratePage() {
  return (
    <DashboardShell>
      <IntegrateContent />
    </DashboardShell>
  );
}
