"use client";

import { VerificationRecord } from "./_verification-record";

interface VerificationMethodProps {
  title: string;
  description: string;
  records: Array<{ label: string; value: string; copy: string }>;
}

export function _VerificationMethod({ title, description, records }: VerificationMethodProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-2">
        {records.map((record) => (
          <VerificationRecord key={record.label} {...record} />
        ))}
      </div>
    </div>
  );
}
