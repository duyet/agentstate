"use client";

import { useOrganization, useUser } from "@clerk/react";
import { Badge } from "@cloudflare/kumo/components/badge";
import { Button } from "@cloudflare/kumo/components/button";
import { Surface } from "@cloudflare/kumo/components/surface";
import { BuildingsIcon, CaretRightIcon, PlusIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CardListSkeleton } from "@/components/dashboard/loading-states";
import { PageHeader } from "@/components/dashboard/page-header";
import { useOrganizationsList } from "@/hooks/_use-organizations-list";

function OrgListSkeleton() {
  return <CardListSkeleton count={3} />;
}

export default function OrganizationsPage() {
  const router = useRouter();
  const { isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { organizations, isLoaded: isOrgListLoaded } = useOrganizationsList();
  const { organization: activeOrg } = useOrganization();

  if (!isUserLoaded || !isOrgListLoaded) {
    return (
      <div className="flex flex-col gap-6 px-4 lg:px-6">
        <PageHeader title="Organizations" description="Manage your organizations and members" />
        <OrgListSkeleton />
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <PageHeader
        title="Organizations"
        description="Manage your organizations and members"
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
        <Surface className="border-border border border-dashed">
          <EmptyState
            icon={<BuildingsIcon aria-hidden="true" />}
            title="No organizations"
            description="You don't belong to any organizations yet. Create one to get started."
            action={{
              label: "Create your first organization",
              onClick: () => {
                router.push("/dashboard/settings/organizations/create");
              },
            }}
          />
        </Surface>
      ) : (
        <div className="flex flex-col gap-3">
          {organizations.map((org) => (
            <Surface key={org.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                  <BuildingsIcon className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-foreground">{org.name}</h3>
                    {activeOrg?.id === org.id && <Badge variant="primary">Active</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(org.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Link href={`/dashboard/settings/organizations/members?org=${org.id}`}>
                  <Button
                    variant="ghost"
                    shape="square"
                    aria-label={`View members for ${org.name}`}
                  >
                    <CaretRightIcon aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </Surface>
          ))}
        </div>
      )}
    </div>
  );
}
