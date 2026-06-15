import { ClipboardText } from "@cloudflare/kumo/components/clipboard-text";

interface VerificationRecordProps {
  label: string;
  value: string;
  copy: string;
}

export function VerificationRecord({ label, value, copy }: VerificationRecordProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-sm text-muted-foreground">{label}:</span>
      <ClipboardText className="flex-1" size="sm" text={value} textToCopy={copy} />
    </div>
  );
}
