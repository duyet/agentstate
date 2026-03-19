import { Input } from "@/components/ui/input";

interface ProjectNameInputProps {
  value: string;
  onChange: (name: string) => void;
  onSubmit: () => void;
}

export function ProjectNameInput({ value, onChange, onSubmit }: ProjectNameInputProps) {
  return (
    <div>
      <label htmlFor="project-name" className="text-xs font-medium text-foreground mb-1.5 block">
        Project name
      </label>
      <Input
        id="project-name"
        placeholder="My Chatbot"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        className="text-sm h-9"
        autoFocus
      />
    </div>
  );
}
