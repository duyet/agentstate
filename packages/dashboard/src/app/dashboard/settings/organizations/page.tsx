"use client";

import { useOrganization, useOrganizationList, useUser } from "@clerk/react";
import {
  Building2Icon,
  Building2Icon as Building2IconLucide,
  ChevronRightIcon,
  PlusIcon,
} from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CardListSkeleton } from "@/components/dashboard/loading-states";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function OrgListSkeleton() {
  return <CardListSkeleton count={3} />;
}

export default function OrganizationsPage() {
  const { isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { isLoaded: isOrgListLoaded, userMemberships } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  });
  const { organization: activeOrg } = useOrganization();

  // Extract organizations from user memberships, filtering out undefined
  const organizations =
    userMemberships?.data
      ?.map((m) => m.organization)
      .filter((org): org is NonNullable<typeof org> => org != null) ?? [];

  if (!isUserLoaded || !isOrgListLoaded) {
    return (
      <div className="space-y-6">
        <PageHeader title="Organizations" description="Manage your organizations and members" />
        <OrgListSkeleton />
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description="Manage your organizations and members"
        actions={
          <Link href="/dashboard/settings/organizations/create">
            <Button>
              <PlusIcon />
              Create Organization
            </Button>
          </Link>
        }
      />

      {organizations.length === 0 ? (
        <Card className="p-12 border-dashed">
          <EmptyState
            icon={<Building2IconLucide className="h-6 w-6 text-muted-foreground" />}
            title="No organizations"
            description="You don't belong to any organizations yet. Create one to get started."
            action={{
              label: "Create your first organization",
              onClick: () => {
                window.location.href = "/dashboard/settings/organizations/create";
              },
            }}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {organizations.map((org) => (
            <Card
              key={org.id}
              className={activeOrg?.id === org.id ? "border-primary bg-primary/5" : undefined}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2Icon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{org.name}</h3>
                      {activeOrg?.id === org.id && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(org.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link href={`/dashboard/settings/organizations/members?org=${org.id}`}>
                    <Button variant="ghost" size="icon">
                      <ChevronRightIcon />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
