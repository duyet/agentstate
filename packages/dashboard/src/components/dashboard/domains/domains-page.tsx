import { DashboardShell } from "@/components/dashboard-shell";
import { DomainsContent } from "./domains-content";

// ---------------------------------------------------------------------------
// Page (wraps content in DashboardShell)
// ---------------------------------------------------------------------------

export function DomainsPage() {
  return (
    <DashboardShell>
      <DomainsContent />
    </DashboardShell>
  );
}
