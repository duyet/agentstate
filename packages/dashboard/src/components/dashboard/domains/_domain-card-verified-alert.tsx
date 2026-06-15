import { CheckCircleIcon } from "@phosphor-icons/react";

interface DomainVerifiedAlertProps {
  sslEnabled: boolean;
}

export function _DomainVerifiedAlert({ sslEnabled }: DomainVerifiedAlertProps) {
  return (
    <div className="flex items-start gap-2.5 rounded-[var(--radius)] border border-pos/40 bg-pos/10 px-3 py-2.5">
      <CheckCircleIcon
        className="mt-0.5 size-4 shrink-0 text-pos"
        aria-hidden="true"
        weight="fill"
      />
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-medium text-fg">Domain verified</span>
        <span className="text-[12px] leading-5 text-fg-3">
          Your domain is verified and ready to use. SSL is{" "}
          {sslEnabled ? "enabled" : "being provisioned"}.
        </span>
      </div>
    </div>
  );
}
