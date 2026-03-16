"use client";

import { ClerkProvider } from "@clerk/react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster richColors />
    </ClerkProvider>
  );
}
