import { CheckIcon, LoaderIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type SlugStatus = "idle" | "checking" | "available" | "taken";

interface ProjectSlugInputProps {
  value: string;
  status: SlugStatus;
  onChange: (slug: string) => void;
}

export function ProjectSlugInput({ value, status, onChange }: ProjectSlugInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="project-slug">Project slug</Label>
      <div className="relative">
        <Input
          id="project-slug"
          placeholder="my-chatbot"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn("font-mono pr-8", status === "taken" && "border-destructive")}
          aria-invalid={status === "taken"}
          aria-describedby="slug-status"
        />
        {value && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2" aria-hidden="true">
            {status === "checking" && (
              <LoaderIcon className="size-4 animate-spin text-muted-foreground" />
            )}
            {status === "available" && <CheckIcon className="size-4 text-brand" />}
            {status === "taken" && <XIcon className="size-4 text-destructive" />}
          </div>
        )}
      </div>
      <div id="slug-status" className="min-h-[20px]">
        {status === "taken" && (
          <p className="text-xs text-destructive" role="alert">
            This slug is already taken. Choose a different one.
          </p>
        )}
        {status === "available" && value && <p className="text-xs text-brand-ink">Available</p>}
      </div>
    </div>
  );
}
