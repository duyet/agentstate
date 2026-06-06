"use client";

import { SignInButton, useAuth, useUser } from "@clerk/react";

export function SidebarUser() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  if (!isLoaded) return null;

  const initial =
    user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "?";

  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5">
      {isSignedIn ? (
        <>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft">
            <span className="text-xs font-semibold text-brand">{initial}</span>
          </div>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium truncate leading-tight">
              {user?.fullName || "Account"}
            </p>
            <p className="text-xs text-muted-foreground truncate leading-tight">
              {user?.primaryEmailAddress?.emailAddress || ""}
            </p>
          </div>
        </>
      ) : (
        <SignInButton>
          <button
            type="button"
            className="flex h-8 w-full items-center justify-center rounded-lg border border-border text-xs font-medium transition-colors hover:bg-accent"
          >
            Sign in
          </button>
        </SignInButton>
      )}
    </div>
  );
}
