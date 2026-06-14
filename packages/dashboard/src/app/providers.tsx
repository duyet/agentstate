"use client";

import { ClerkProvider } from "@clerk/react";
import { TooltipProvider as KumoTooltipProvider } from "@cloudflare/kumo";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// Keep Clerk's <SignIn/> and <UserButton/> visually aligned with the
// dashboard: shared 9px corner radius and the Hanken Grotesk body font.
// Primary color is left to Clerk defaults during the Kumo (native) migration.
const clerkAppearance = {
  variables: {
    borderRadius: "0.5625rem",
    fontFamily: "var(--font-sans)",
  },
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      appearance={clerkAppearance}
    >
      {/* Kumo tooltip grouping for migrated components. shadcn's provider is
          retained until the remaining shadcn tooltips are migrated. */}
      <KumoTooltipProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </KumoTooltipProvider>
      <Toaster richColors position="bottom-right" />
    </ClerkProvider>
  );
}
