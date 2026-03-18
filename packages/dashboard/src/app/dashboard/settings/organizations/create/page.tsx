"use client";

import Link from "next/link";
import { useOrganizationCreationDefaults, useOrganizationList, useUser } from "@clerk/react";
import { ArrowLeftIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

function FormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-64 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-32" />
      </CardContent>
    </Card>
  );
}

export default function CreateOrganizationPage() {
  const { isLoaded, isSignedIn } = useUser();
  const { isLoaded: isOrgListLoaded, createOrganization, setActive } = useOrganizationList();
  const { data: defaults, isLoading: isLoadingDefaults } = useOrganizationCreationDefaults();
  const [organizationName, setOrganizationName] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Pre-populate the form with suggested organization name
  React.useEffect(() => {
    if (defaults?.form.name) {
      setOrganizationName(defaults.form.name);
    }
  }, [defaults?.form.name]);

  if (!isLoaded || !isOrgListLoaded || isLoadingDefaults) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings/organizations">
            <Button variant="ghost" size="icon" disabled>
              <ArrowLeftIcon />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Organization</h1>
            <p className="text-muted-foreground mt-2">Set up a new organization for your team</p>
          </div>
        </div>
        <FormSkeleton />
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  // Check if an organization with this name/domain already exists
  const advisory = defaults?.advisory;
  const showWarning = advisory?.code === "organization_already_exists";
  const existingOrgName = advisory?.meta?.organization_name;
  const existingOrgDomain = advisory?.meta?.organization_domain;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!organizationName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newOrganization = await createOrganization?.({
        name: organizationName.trim(),
      });

      if (newOrganization) {
        await setActive?.({ organization: newOrganization.id });
        toast.success("Organization created successfully");
        window.location.href = "/dashboard/settings/organizations";
      }
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ message?: string }> };
      const message = error?.errors?.[0]?.message ?? "Failed to create organization";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings/organizations">
          <Button variant="ghost" size="icon">
            <ArrowLeftIcon />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Organization</h1>
          <p className="text-muted-foreground mt-2">Set up a new organization for your team</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>
              Enter a name for your organization. You can invite members after creation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.currentTarget.value)}
                placeholder="Acme Inc"
                disabled={isSubmitting}
                required
              />
              {showWarning && (
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  An organization "{existingOrgName}" already exists for the domain "{existingOrgDomain}".
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={!organizationName.trim() || isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Organization"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.assign("/dashboard/settings/organizations")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
