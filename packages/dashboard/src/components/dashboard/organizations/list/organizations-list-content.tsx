import { useOrganization, useUser } from "@clerk/react";
import { BuildingsIcon, CaretRightIcon, PlusIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useOrganizationsList } from "@/hooks/_use-organizations-list";

function OrgListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="h-[72px] animate-pulse">
          <div className="h-full w-full" />
        </Card>
      ))}
    </div>
  );
}

export function OrganizationsListContent() {
  const router = useRouter();
  const { isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { organizations, isLoaded: isOrgListLoaded } = useOrganizationsList();
  const { organization: activeOrg } = useOrganization();

  if (!isUserLoaded || !isOrgListLoaded) {
    return (
      <div className="flex flex-col gap-6 px-4 py-7 lg:px-6">
        <Header />
        <OrgListSkeleton />
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-7 lg:px-6">
      <Header
        actions={
          <Link href="/dashboard/settings/organizations/create">
            <Button variant="primary">
              <PlusIcon aria-hidden="true" />
              Create Organization
            </Button>
          </Link>
        }
      />

      {organizations.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-10 place-items-center rounded-[var(--radius)] border border-edge bg-panel2 text-fg-3">
            <BuildingsIcon className="size-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-[15px] font-medium text-fg">No organizations</p>
            <p className="text-[13.5px] text-fg-3">
              You don&rsquo;t belong to any organizations yet. Create one to get started.
            </p>
          </div>
          <Button
            variant="secondary"
            className="mt-1"
            onClick={() => router.push("/dashboard/settings/organizations/create")}
          >
            Create your first organization
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {organizations.map((org) => {
            const isActive = activeOrg?.id === org.id;
            return (
              <Card key={org.id} className="px-4 py-3.5">
                <div className="flex items-center gap-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius)] border border-edge bg-panel2 text-fg-3">
                    <BuildingsIcon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-[14.5px] font-semibold text-fg">{org.name}</h3>
                      {isActive && (
                        <Badge tone="live" dot>
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="num truncate font-mono text-[12.5px] text-fg-3">
                      Created {new Date(org.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/settings/organizations/members?org=${org.id}`}
                    aria-label={`View members for ${org.name}`}
                    className="grid size-8 shrink-0 place-items-center rounded-[var(--radius)] text-fg-3 transition-colors hover:bg-panel2 hover:text-fg"
                  >
                    <CaretRightIcon className="size-4" aria-hidden="true" weight="bold" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Header({ actions }: { actions?: React.ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-4 border-b border-edge-soft pb-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] tracking-tight text-fg">Organizations</h1>
        <p className="text-[14.5px] leading-6 text-fg-3">Manage your organizations and members</p>
      </div>
      {actions}
    </header>
  );
}
