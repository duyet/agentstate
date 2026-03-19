"use client";

import { SignInButton, UserButton, useAuth, useUser } from "@clerk/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function SidebarUser() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  if (!isLoaded) return null;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      {isSignedIn ? (
        <>
          <UserButton />
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium truncate leading-tight">
              {user?.fullName || "Account"}
            </p>
            <p className="text-xs text-muted-foreground truncate leading-tight">
              {user?.primaryEmailAddress?.emailAddress || ""}
            </p>
          </div>
          <div className="shrink-0 group-data-[collapsible=icon]:hidden">
            <ThemeToggle size="h-4 w-4" />
          </div>
        </>
      ) : (
        <>
          <SignInButton>
            <Button size="sm" variant="outline" className="flex-1 text-xs">
              Sign in
            </Button>
          </SignInButton>
          <div className="shrink-0">
            <ThemeToggle size="h-4 w-4" />
          </div>
        </>
      )}
    </div>
  );
}
