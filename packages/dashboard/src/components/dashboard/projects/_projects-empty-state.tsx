import { useOrganization, useOrganizationList } from "@clerk/react";
import { Buildings, Folder } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ProjectsEmptyStateProps {
  onCreateClick: () => void;
}

/**
 * ProjectsEmptyState - Empty state when the user has no projects.
 *
 * Distinguishes "no active Clerk org" (data may exist under another org /
 * personal scope) from a true empty org, so users don't recreate projects
 * while their real data sits under Default Organization (#387/#389).
 */
export function ProjectsEmptyState({ onCreateClick }: ProjectsEmptyStateProps) {
  const { isLoaded: orgLoaded, organization } = useOrganization();
  const { isLoaded: listLoaded, userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  const memberships =
    userMemberships?.data
      ?.map((m) => m.organization)
      .filter((o): o is NonNullable<typeof o> => o != null) ?? [];

  const missingOrg = orgLoaded && listLoaded && !organization && memberships.length > 0;

  if (missingOrg) {
    const preferred =
      memberships.find((o) => o.name.trim().toLowerCase() === "default organization") ??
      memberships[0];

    return (
      <Card className="flex flex-col items-center justify-center gap-element py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-[var(--radius-lg)] border border-edge bg-panel2 text-fg-3">
          <Buildings className="size-5" aria-hidden="true" />
        </span>
        <div className="flex max-w-sm flex-col gap-tight">
          <p className="text-[14px] font-medium text-fg">Select an organization</p>
          <p className="text-[12.5px] leading-5 text-fg-3">
            Your session has no active organization, so the project list looks empty.
            Projects (and conversations) are scoped to a Clerk org — pick{" "}
            <span className="font-medium text-fg">{preferred.name}</span> to restore them.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            if (!setActive) return;
            void setActive({ organization: preferred.id }).then(() => {
              window.location.reload();
            });
          }}
        >
          Switch to {preferred.name}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col items-center justify-center gap-element py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-[var(--radius-lg)] border border-edge bg-panel2 text-fg-3">
        <Folder className="size-5" aria-hidden="true" />
      </span>
      <div className="flex max-w-xs flex-col gap-tight">
        <p className="text-[14px] font-medium text-fg">No projects yet</p>
        <p className="text-[12.5px] leading-5 text-fg-3">
          Projects group your conversations and API keys.
          {organization ? (
            <>
              {" "}
              Active org: <span className="font-medium text-fg">{organization.name}</span>.
            </>
          ) : null}
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={onCreateClick}>
        Create your first project
      </Button>
    </Card>
  );
}
