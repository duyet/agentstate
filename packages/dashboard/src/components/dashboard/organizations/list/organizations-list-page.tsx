import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import { OrganizationsListContent } from "./organizations-list-content";

export function OrganizationsListPage() {
  return (
    <Providers>
      <AppShell>
        <OrganizationsListContent />
      </AppShell>
    </Providers>
  );
}
