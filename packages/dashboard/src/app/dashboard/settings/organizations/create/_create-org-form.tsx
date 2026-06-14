"use client";

import { Button } from "@cloudflare/kumo/components/button";
import { Input } from "@cloudflare/kumo/components/input";
import { Surface } from "@cloudflare/kumo/components/surface";
import { Text } from "@cloudflare/kumo/components/text";
import { useRouter } from "next/navigation";
import type * as React from "react";
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
      <Surface className="flex max-w-xl flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <Text variant="heading3" as="h2">
            Organization Details
          </Text>
          <Text variant="secondary" as="p">
            Enter a name for your organization. You can invite members after creation.
          </Text>
        </div>
        <div className="flex flex-col gap-2">
          <Input
            id="name"
            type="text"
            label="Organization Name"
            value={organizationName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setOrganizationName(e.currentTarget.value)
            }
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
          <Button
            type="submit"
            variant="primary"
            disabled={!organizationName.trim() || isSubmitting}
            loading={isSubmitting}
          >
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
      </Surface>
    </form>
  );
}
