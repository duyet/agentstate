"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/react";
import { ArrowRightIcon, CircleUserRoundIcon, LogInIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function BlankAvatar() {
  return (
    <Button aria-label="Signed-out account" disabled size="icon-sm" type="button" variant="outline">
      <CircleUserRoundIcon data-icon="only" />
    </Button>
  );
}

export function TopbarAuth() {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <Button
          nativeButton={false}
          render={<Link href="/dashboard" />}
          size="sm"
          variant="outline"
        >
          Dashboard
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
        <UserButton />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <SignInButton mode="modal">
        <Button size="sm" type="button" variant="outline">
          Login
          <LogInIcon data-icon="inline-end" />
        </Button>
      </SignInButton>
      <BlankAvatar />
    </div>
  );
}
