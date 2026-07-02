import { Check, Spinner, X } from "@phosphor-icons/react";

type SlugStatus = "idle" | "checking" | "available" | "taken";

interface ProjectSlugInputProps {
  value: string;
  status: SlugStatus;
  onChange: (slug: string) => void;
}

export function ProjectSlugInput({ value, status, onChange }: ProjectSlugInputProps) {
  const isTaken = status === "taken";
  const isAvailable = status === "available" && !!value;

  return (
    <label className="flex flex-col gap-tight">
      <span className="text-[13px] font-medium text-fg-2">Project slug</span>
      <div className="relative">
        <input
          type="text"
          placeholder="my-chatbot"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={isTaken || undefined}
          className={`min-h-[40px] w-full rounded-[var(--radius)] border bg-panel2 px-3 font-mono text-[13.5px] text-fg outline-none transition-colors placeholder:text-fg-4 focus:border-accent focus:ring-1 focus:ring-accent ${
            isTaken ? "border-neg focus:border-neg focus:ring-neg" : "border-edge"
          }`}
        />
        {value && (
          <div
            className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center"
            aria-hidden="true"
          >
            {status === "checking" && <Spinner className="size-4 animate-spin text-fg-4" />}
            {isAvailable && <Check className="size-4 text-pos" />}
            {isTaken && <X className="size-4 text-neg" />}
          </div>
        )}
      </div>
      {isTaken && (
        <span className="text-[12px] text-neg" role="alert">
          This slug is already taken. Choose a different one.
        </span>
      )}
      {isAvailable && <span className="text-[12px] text-pos">Available</span>}
    </label>
  );
}
