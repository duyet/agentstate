"use client";

import { SignInButton, useAuth, useClerk, useUser } from "@clerk/react";
import { CaretUpDown, Gear, SignOut, User } from "@phosphor-icons/react";
import { DropdownMenu, Sidebar } from "@cloudflare/kumo";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

function AvatarTile({ initial, className }: { initial: string; className?: string }) {
  return (
    <div
      className={`flex size-8 items-center justify-center rounded-lg bg-muted text-sm font-medium ${className ?? ""}`}
    >
      {initial}
    </div>
  );
}

export function NavUser() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <Sidebar.Menu>
        <Sidebar.MenuItem>
          <SignInButton>
            <button
              type="button"
              className="flex h-8 w-full items-center justify-center rounded-md border text-xs font-medium hover:bg-muted"
            >
              Sign in
            </button>
          </SignInButton>
        </Sidebar.MenuItem>
      </Sidebar.Menu>
    );
  }

  const name = user?.fullName || "Account";
  const email = user?.primaryEmailAddress?.emailAddress || "";
  const initial = name[0]?.toUpperCase() || "U";

  return (
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <DropdownMenu>
          <DropdownMenu.Trigger render={<Sidebar.MenuButton />}>
            <AvatarTile initial={initial} />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{name}</span>
              <span className="truncate text-xs">{email}</span>
            </div>
            <CaretUpDown className="ml-auto size-4" aria-hidden="true" />
          </DropdownMenu.Trigger>
          <DropdownMenu.Content sideOffset={4} className="w-56">
            <DropdownMenu.Label>
              <div className="flex items-center gap-2 text-left text-sm">
                <AvatarTile initial={initial} />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  <span className="truncate text-xs">{email}</span>
                </div>
              </div>
            </DropdownMenu.Label>
            <DropdownMenu.Separator />
            <DropdownMenu.Group>
              <DropdownMenu.LinkItem href="/dashboard" render={<Link href="/dashboard" />} icon={User}>
                Account
              </DropdownMenu.LinkItem>
              <DropdownMenu.LinkItem
                href="/dashboard/settings/organizations"
                render={<Link href="/dashboard/settings/organizations" />}
                icon={Gear}
              >
                Settings
              </DropdownMenu.LinkItem>
            </DropdownMenu.Group>
            <DropdownMenu.Separator />
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm">Theme</span>
              <ThemeToggle />
            </div>
            <DropdownMenu.Separator />
            <DropdownMenu.Item variant="danger" icon={SignOut} onClick={() => signOut()}>
              Log out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  );
}
