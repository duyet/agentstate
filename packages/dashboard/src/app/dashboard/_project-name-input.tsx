"use client";

import { Input } from "@cloudflare/kumo/components/input";

interface ProjectNameInputProps {
  value: string;
  onChange: (name: string) => void;
  onSubmit: () => void;
}

export function ProjectNameInput({ value, onChange, onSubmit }: ProjectNameInputProps) {
  return (
    <Input
      label="Project name"
      placeholder="My Chatbot"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onSubmit()}
      autoFocus
    />
  );
}
