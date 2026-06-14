"use client";

import { AlertTriangleIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DomainWarningProps {
  existingOrgName: string | undefined;
  existingOrgDomain: string | undefined;
}

export function DomainWarning({ existingOrgName, existingOrgDomain }: DomainWarningProps) {
  return (
    <Alert>
      <AlertTriangleIcon aria-hidden="true" />
      <AlertDescription>
        An organization{" "}
        <span className="font-medium text-foreground">{existingOrgName ?? "Unknown"}</span> already
        exists for the domain{" "}
        <span className="font-mono text-foreground">{existingOrgDomain ?? "unknown"}</span>.
      </AlertDescription>
    </Alert>
  );
}
