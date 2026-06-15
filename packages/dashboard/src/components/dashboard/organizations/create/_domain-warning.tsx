import { WarningIcon } from "@phosphor-icons/react";

interface DomainWarningProps {
  existingOrgName: string | undefined;
  existingOrgDomain: string | undefined;
}

export function DomainWarning({ existingOrgName, existingOrgDomain }: DomainWarningProps) {
  return (
    <div className="flex items-start gap-2.5 rounded-[var(--radius)] border border-warn/40 bg-warn/10 px-3 py-2.5 text-[13px] text-warn">
      <WarningIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" weight="fill" />
      <p>
        An organization <span className="font-medium">{existingOrgName ?? "Unknown"}</span> already
        exists for the domain <span className="font-mono">{existingOrgDomain ?? "unknown"}</span>.
      </p>
    </div>
  );
}
