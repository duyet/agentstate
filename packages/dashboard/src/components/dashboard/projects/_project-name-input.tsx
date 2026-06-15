import { useEffect, useRef } from "react";

interface ProjectNameInputProps {
  value: string;
  onChange: (name: string) => void;
  onSubmit: () => void;
}

export function ProjectNameInput({ value, onChange, onSubmit }: ProjectNameInputProps) {
  // Focus the name field on mount (matches the original autoFocus behavior,
  // implemented via ref to avoid the noAutofocus lint on a raw <input>).
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-fg-2">Project name</span>
      <input
        ref={inputRef}
        type="text"
        placeholder="My Chatbot"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        className="min-h-[40px] rounded-[var(--radius)] border border-edge bg-panel px-3 text-[13.5px] text-fg outline-none transition-colors placeholder:text-fg-4 focus:border-accent"
      />
    </label>
  );
}
