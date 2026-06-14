"use client";

import { UserButton, useAuth, useClerk } from "@clerk/react";
import { SignIn, SquaresFour, UserCircle, UserPlus } from "@phosphor-icons/react";
import { Button, DropdownMenu } from "@cloudflare/kumo";

function SignedOutAccountMenu() {
  const clerk = useClerk();

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger
        render={
          <Button
            variant="outline"
            shape="square"
            size="lg"
            aria-label="Open account menu"
            icon={<UserCircle aria-hidden="true" />}
          />
        }
      />
      <DropdownMenu.Content className="w-44" aria-label="Account menu">
        <DropdownMenu.Group>
          <DropdownMenu.Label>Account</DropdownMenu.Label>
          <DropdownMenu.Item icon={SignIn} onClick={() => clerk.openSignIn({})}>
            Sign in
          </DropdownMenu.Item>
          <DropdownMenu.Item icon={UserPlus} onClick={() => clerk.openSignUp({})}>
            Sign up
          </DropdownMenu.Item>
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

export function TopbarAuth() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <Button
        variant="outline"
        shape="square"
        size="lg"
        disabled
        aria-label="Open account menu"
        icon={<UserCircle aria-hidden="true" />}
      />
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
            labelIcon={<SquaresFour aria-hidden="true" />}
          />
        </UserButton.MenuItems>
      </UserButton>
    );
  }

  return <SignedOutAccountMenu />;
}
