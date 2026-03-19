import { CheckIcon, LoaderIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

type SlugStatus = "idle" | "checking" | "available" | "taken";

interface ProjectSlugInputProps {
  value: string;
  status: SlugStatus;
  onChange: (slug: string) => void;
}

export function ProjectSlugInput({ value, status, onChange }: ProjectSlugInputProps) {
  return (
    <div>
      <label htmlFor="project-slug" className="text-xs font-medium text-foreground mb-1.5 block">
        Project slug
      </label>
      <div className="relative">
        <Input
          id="project-slug"
          placeholder="my-chatbot"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`text-sm h-9 font-mono pr-8 ${
            status === "taken" ? "border-red-500 focus-visible:ring-red-500" : ""
          }`}
          aria-describedby="slug-status"
        />
        {value && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2" aria-hidden="true">
            {status === "checking" && (
              <LoaderIcon className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
            )}
            {status === "available" && <CheckIcon className="h-3.5 w-3.5 text-green-500" />}
            {status === "taken" && <XIcon className="h-3.5 w-3.5 text-red-500" />}
          </div>
        )}
      </div>
      <div id="slug-status" className="min-h-[20px]">
        {status === "taken" && (
          <p className="text-xs text-red-500 mt-1.5" role="alert">
            This slug is already taken. Choose a different one.
          </p>
        )}
        {status === "available" && value && (
          <p className="text-xs text-muted-foreground mt-1.5">Available</p>
        )}
      </div>
    </div>
  );
}
