"use client";

import { UserButton, useAuth, useClerk } from "@clerk/react";
import { CircleUserRoundIcon, LayoutDashboardIcon, LogInIcon, UserPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function SignedOutAccountMenu() {
  const clerk = useClerk();

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
        <DropdownMenuGroup>
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => clerk.openSignIn({})}>
            <LogInIcon aria-hidden="true" />
            <span>Sign in</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => clerk.openSignUp({})}>
            <UserPlusIcon aria-hidden="true" />
            <span>Sign up</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
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
