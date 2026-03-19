"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CreateOrgHeader() {
  return (
    <div className="flex items-center gap-4">
      <Link href="/dashboard/settings/organizations">
        <Button variant="ghost" size="icon">
          <ArrowLeftIcon />
        </Button>
      </Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Organization</h1>
        <p className="text-muted-foreground mt-2">Set up a new organization for your team</p>
      </div>
    </div>
  );
}
