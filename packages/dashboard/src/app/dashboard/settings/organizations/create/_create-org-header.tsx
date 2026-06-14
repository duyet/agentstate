"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CreateOrgHeader() {
  return (
    <header className="flex items-center gap-3 border-b border-border pb-5">
      <Button
        variant="ghost"
        size="icon-sm"
        nativeButton={false}
        render={<Link href="/dashboard/settings/organizations" />}
      >
        <ArrowLeftIcon aria-hidden="true" />
        <span className="sr-only">Back to organizations</span>
      </Button>
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] tracking-tight text-foreground">Create Organization</h1>
        <p className="text-[14.5px] leading-6 text-muted-foreground">
          Set up a new organization for your team
        </p>
      </div>
    </header>
  );
}
