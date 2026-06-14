"use client";

import { Banner } from "@cloudflare/kumo/components/banner";
import { WarningIcon } from "@phosphor-icons/react";

interface DomainWarningProps {
  existingOrgName: string | undefined;
  existingOrgDomain: string | undefined;
}

export function DomainWarning({ existingOrgName, existingOrgDomain }: DomainWarningProps) {
  return (
    <Banner
      variant="alert"
      icon={<WarningIcon aria-hidden="true" weight="fill" />}
      description={`An organization ${existingOrgName ?? "Unknown"} already exists for the domain ${
        existingOrgDomain ?? "unknown"
      }.`}
    />
  );
}
