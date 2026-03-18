"use client";

import { _VerificationRecord } from "./_verification-record";

interface VerificationMethodProps {
  title: string;
  description: string;
  records: Array<{ label: string; value: string; copy: string }>;
}

export function _VerificationMethod({ title, description, records }: VerificationMethodProps) {
  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <h4 className="font-medium mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      <div className="space-y-2">
        {records.map((record) => (
          <_VerificationRecord key={record.label} {...record} />
        ))}
      </div>
    </div>
  );
}
