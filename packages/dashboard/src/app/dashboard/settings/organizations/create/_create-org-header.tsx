"use client";

import { Button } from "@cloudflare/kumo/components/button";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import Link from "next/link";

export function CreateOrgHeader() {
  return (
    <header className="flex items-center gap-3 border-border border-b pb-5">
      <Link href="/dashboard/settings/organizations">
        <Button variant="ghost" shape="square" size="sm" aria-label="Back to organizations">
          <ArrowLeftIcon aria-hidden="true" />
        </Button>
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] tracking-tight text-foreground">Create Organization</h1>
        <p className="text-[14.5px] leading-6 text-muted-foreground">
          Set up a new organization for your team
        </p>
      </div>
    </header>
  );
}
