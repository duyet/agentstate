"use client";

import { useOrganization, useOrganizationList, useUser } from "@clerk/react";
import { Building2Icon, ChevronRightIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function OrgListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="size-10 shrink-0" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-8 shrink-0" />
        </div>
      ))}
    </div>
  );
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground mt-2">Manage your organizations and members</p>
        </div>
        <OrgListSkeleton />
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground mt-2">Manage your organizations and members</p>
        </div>
        <Link href="/dashboard/settings/organizations/create">
          <Button>
            <PlusIcon />
            Create Organization
          </Button>
        </Link>
      </div>

      {organizations.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No organizations</CardTitle>
            <CardDescription>
              You don't belong to any organizations yet. Create one to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/settings/organizations/create">
              <Button>
                <PlusIcon />
                Create your first organization
              </Button>
            </Link>
          </CardContent>
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
