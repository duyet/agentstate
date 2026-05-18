"use client";

interface DomainWarningProps {
  existingOrgName: string | undefined;
  existingOrgDomain: string | undefined;
}

export function DomainWarning({ existingOrgName, existingOrgDomain }: DomainWarningProps) {
  return (
    <p className="text-sm text-muted-foreground">
      An organization "{existingOrgName}" already exists for the domain "{existingOrgDomain}".
    </p>
  );
}
