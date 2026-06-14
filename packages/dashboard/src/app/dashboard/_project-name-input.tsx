import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProjectNameInputProps {
  value: string;
  onChange: (name: string) => void;
  onSubmit: () => void;
}

export function ProjectNameInput({ value, onChange, onSubmit }: ProjectNameInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="project-name">Project name</Label>
      <Input
        id="project-name"
        placeholder="My Chatbot"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        autoFocus
      />
    </div>
  );
}
