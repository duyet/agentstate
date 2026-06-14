"use client";

import { ClerkProvider } from "@clerk/react";
import { TooltipProvider } from "@cloudflare/kumo";
import { Toaster } from "sonner";

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
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster richColors position="bottom-right" />
    </ClerkProvider>
  );
}
