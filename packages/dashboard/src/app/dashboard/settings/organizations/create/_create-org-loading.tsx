"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { Button } from "@cloudflare/kumo/components/button";
import { Surface } from "@cloudflare/kumo/components/surface";
import { FormSkeleton, PageHeaderSkeleton } from "@/components/dashboard/loading-states";

export function CreateOrgLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings/organizations">
          <Button
            variant="ghost"
            shape="square"
            size="sm"
            disabled
            aria-label="Back to organizations"
          >
            <ArrowLeftIcon aria-hidden="true" />
          </Button>
        </Link>
        <PageHeaderSkeleton />
      </div>
      <Surface className="flex max-w-xl flex-col gap-6 p-6">
        <FormSkeleton fields={1} />
      </Surface>
    </div>
  );
}
