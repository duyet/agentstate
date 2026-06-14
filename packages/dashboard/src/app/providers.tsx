"use client";

import { ClerkProvider } from "@clerk/react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// Keep Clerk's <SignIn/> and <UserButton/> visually aligned with the dashboard
// design system: the vermilion accent, the shared 9px corner radius, and the
// Hanken Grotesk body font.
const clerkAppearance = {
  variables: {
    colorPrimary: "#d9543a",
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
