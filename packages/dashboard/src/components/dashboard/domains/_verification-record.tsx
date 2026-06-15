import { ClipboardIcon } from "@phosphor-icons/react";
import { useCopiedText } from "@/lib/hooks/use-copied-text";

interface VerificationRecordProps {
  label: string;
  value: string;
  copy: string;
}

export function VerificationRecord({ label, value, copy }: VerificationRecordProps) {
  const { copied, copy: copyText } = useCopiedText();

  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 font-mono text-[11px] uppercase tracking-wide text-fg-4">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[var(--radius)] border border-edge bg-base px-2.5 py-1.5">
        <code className="flex-1 truncate font-mono text-[12px] text-fg-2">{value}</code>
        <button
          type="button"
          onClick={() => copyText(copy)}
          aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
          className="shrink-0 text-fg-4 transition-[color] hover:text-fg"
        >
          {copied ? (
            <span className="text-[11px] text-pos">Copied</span>
          ) : (
            <ClipboardIcon size={14} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
