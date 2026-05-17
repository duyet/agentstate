"use client";

import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/react";
import { CircleUserRoundIcon, LayoutDashboardIcon, LogInIcon, UserPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function SignedOutAccountMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Open account menu"
            className="size-10"
            size="icon"
            type="button"
            variant="outline"
          />
        }
      >
        <CircleUserRoundIcon data-icon="only" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44" aria-label="Account menu">
        <DropdownMenuLabel>Account</DropdownMenuLabel>
        <SignInButton mode="modal">
          <DropdownMenuItem>
            <LogInIcon aria-hidden="true" />
            <span>Sign in</span>
          </DropdownMenuItem>
        </SignInButton>
        <SignUpButton mode="modal">
          <DropdownMenuItem>
            <UserPlusIcon aria-hidden="true" />
            <span>Sign up</span>
          </DropdownMenuItem>
        </SignUpButton>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TopbarAuth() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <Button
        aria-label="Open account menu"
        aria-disabled="true"
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

  if (isLoaded && isSignedIn) {
    return (
      <UserButton
        appearance={{
          elements: {
            userButtonAvatarBox: "size-10",
          },
        }}
      >
        <UserButton.MenuItems>
          <UserButton.Link
            href="/dashboard"
            label="Console dashboard"
            labelIcon={<LayoutDashboardIcon aria-hidden="true" />}
          />
        </UserButton.MenuItems>
      </UserButton>
    );
  }

  return <SignedOutAccountMenu />;
}
