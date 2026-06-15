import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import { CreateOrgContent } from "./create-org-content";

export function CreateOrgPage() {
  return (
    <Providers>
      <AppShell>
        <CreateOrgContent />
      </AppShell>
    </Providers>
  );
}
