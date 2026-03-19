"use client";

interface DomainWarningProps {
  existingOrgName: string | undefined;
  existingOrgDomain: string | undefined;
}

export function DomainWarning({ existingOrgName, existingOrgDomain }: DomainWarningProps) {
  return (
    <p className="text-sm text-orange-600 dark:text-orange-400">
      An organization "{existingOrgName}" already exists for the domain "{existingOrgDomain}".
    </p>
  );
}
