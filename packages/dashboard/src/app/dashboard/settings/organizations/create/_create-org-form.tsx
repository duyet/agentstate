"use client";

import { useRouter } from "next/navigation";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DomainWarning } from "./_domain-warning";
import { useCreateOrganization } from "./_use-create-organization";

interface CreateOrgFormProps {
  organizationName: string;
  setOrganizationName: (name: string) => void;
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
  createOrganization: ((params: { name: string }) => Promise<{ id: string }>) | undefined;
  setActive: ((params: { organization: string }) => Promise<void>) | undefined;
  showWarning: boolean;
  existingOrgName: string | undefined;
  existingOrgDomain: string | undefined;
}

export function CreateOrgForm({
  organizationName,
  setOrganizationName,
  isSubmitting,
  setIsSubmitting,
  createOrganization,
  setActive,
  showWarning,
  existingOrgName,
  existingOrgDomain,
}: CreateOrgFormProps) {
  const router = useRouter();
  const { createOrganizationByName } = useCreateOrganization({
    createOrganization,
    setActive,
    onSuccess: () => router.push("/dashboard/settings/organizations"),
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    await createOrganizationByName(organizationName);
    setIsSubmitting(false);
  };

  return (
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
              <DomainWarning
                existingOrgName={existingOrgName}
                existingOrgDomain={existingOrgDomain}
              />
            )}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={!organizationName.trim() || isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Organization"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/settings/organizations")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
