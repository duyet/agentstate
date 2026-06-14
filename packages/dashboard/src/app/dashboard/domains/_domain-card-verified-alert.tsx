"use client";

import { CheckCircleIcon } from "@phosphor-icons/react";
import { Banner } from "@cloudflare/kumo/components/banner";

interface DomainVerifiedAlertProps {
  sslEnabled: boolean;
}

export function _DomainVerifiedAlert({ sslEnabled }: DomainVerifiedAlertProps) {
  return (
    <Banner
      variant="secondary"
      icon={<CheckCircleIcon aria-hidden="true" weight="fill" />}
      title="Domain verified"
      description={`Your domain is verified and ready to use. SSL is ${
        sslEnabled ? "enabled" : "being provisioned"
      }.`}
    />
  );
}
