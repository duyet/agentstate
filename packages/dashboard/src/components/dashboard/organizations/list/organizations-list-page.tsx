import { DashboardShell } from "@/components/dashboard-shell";
import { OrganizationsListContent } from "./organizations-list-content";

export function OrganizationsListPage() {
  return (
    <DashboardShell>
      <OrganizationsListContent />
    </DashboardShell>
  );
}
