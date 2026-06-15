import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import { MembersContent } from "./members-content";

export function MembersPage() {
  return (
    <Providers>
      <AppShell>
        <Suspense
          fallback={
            <div className="flex min-h-[60dvh] items-center justify-center">
              <div className="size-5 animate-spin rounded-full border-2 border-edge border-t-fg-4" />
            </div>
          }
        >
          <MembersContent />
        </Suspense>
      </AppShell>
    </Providers>
  );
}
