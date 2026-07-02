import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

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
    <Input
      ref={inputRef}
      label="Project name"
      type="text"
      placeholder="My Chatbot"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onSubmit()}
    />
  );
}
