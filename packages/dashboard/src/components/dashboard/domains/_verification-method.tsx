import { VerificationRecord } from "./_verification-record";

interface VerificationMethodProps {
  title: string;
  description: string;
  records: Array<{ label: string; value: string; copy: string }>;
}

export function _VerificationMethod({ title, description, records }: VerificationMethodProps) {
  return (
    <div className="flex flex-col gap-element rounded-[var(--radius)] border border-edge-soft bg-panel2 card-padding-sm">
      <div className="flex flex-col gap-1">
        <h4 className="text-[13px] font-medium text-fg">{title}</h4>
        <p className="text-[12px] leading-5 text-fg-3">{description}</p>
      </div>
      <div className="flex flex-col gap-tight">
        {records.map((record) => (
          <VerificationRecord key={record.label} {...record} />
        ))}
      </div>
    </div>
  );
}
