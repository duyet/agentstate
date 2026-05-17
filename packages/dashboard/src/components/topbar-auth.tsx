"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/react";
import { ArrowRightIcon, CircleUserRoundIcon, LogInIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function BlankAvatar() {
  return (
    <Button
      aria-label="Signed-out account"
      className="size-10"
      disabled
      size="icon"
      type="button"
      variant="outline"
    >
      <CircleUserRoundIcon data-icon="only" />
    </Button>
  );
}

export function TopbarAuth() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2" aria-busy="true">
        <Button className="min-h-10" disabled size="sm" type="button" variant="outline">
          Login
          <LogInIcon data-icon="inline-end" />
        </Button>
        <BlankAvatar />
      </div>
    );
  }

  if (isLoaded && isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <Button
          className="min-h-10"
          nativeButton={false}
          render={<Link href="/dashboard" />}
          size="sm"
          variant="outline"
        >
          Dashboard
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
        <UserButton
          appearance={{
            elements: {
              userButtonAvatarBox: "size-10",
            },
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <SignInButton mode="modal">
        <Button className="min-h-10" size="sm" type="button" variant="outline">
          Login
          <LogInIcon data-icon="inline-end" />
        </Button>
      </SignInButton>
      <BlankAvatar />
    </div>
  );
}
