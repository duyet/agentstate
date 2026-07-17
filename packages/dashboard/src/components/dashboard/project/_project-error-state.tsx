import { MagnifyingGlassIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ProjectLoadError } from "./_use-project-data";

interface ProjectErrorStateProps {
  kind: ProjectLoadError;
  onRetry: () => void;
}

/**
 * Replaces the bare "Project not found." string previously shown for every
 * load failure. Distinguishes a genuine 404 (project doesn't exist / no
 * access) from a transient failure (network blip, expired session, 500),
 * and gives the transient case a Retry action instead of a dead end.
 */
export function _ProjectErrorState({ kind, onRetry }: ProjectErrorStateProps) {
  const notFound = kind === "not-found";

  return (
    <div className="px-6 py-6 lg:px-8">
      <Card className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full border border-edge bg-panel2">
          {notFound ? (
            <MagnifyingGlassIcon className="size-5 text-fg-3" aria-hidden="true" />
          ) : (
            <WarningCircleIcon className="size-5 text-fg-3" aria-hidden="true" />
          )}
        </div>
        <div className="flex max-w-xs flex-col gap-1">
          <h3 className="text-[15px] font-medium text-fg">
            {notFound ? "Project not found" : "Couldn't load this project"}
          </h3>
          <p className="text-[13px] text-fg-3">
            {notFound
              ? "This project doesn't exist, or you don't have access to it."
              : "Something went wrong loading this project. Check your connection and try again."}
          </p>
        </div>
        {notFound ? (
          <a
            href="/dashboard"
            className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-[var(--radius)] border border-edge px-4 py-2.5 text-[13px] font-medium text-fg transition-[background-color,color,border-color] hover:bg-panel2"
          >
            Back to dashboard
          </a>
        ) : (
          <Button variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        )}
      </Card>
    </div>
  );
}
