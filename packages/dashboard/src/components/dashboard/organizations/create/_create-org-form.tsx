import { useRouter } from "next/navigation";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DomainWarning } from "./_domain-warning";
import { useCreateOrganization } from "./_use-create-organization";

const inputClass =
  "h-9 w-full rounded-[var(--radius)] border border-edge bg-panel px-3 text-[13.5px] text-fg placeholder:text-fg-4 outline-none transition-colors focus:border-accent/60 disabled:opacity-50";

const labelClass = "font-mono text-[11px] uppercase tracking-[0.1em] text-fg-4";

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
      <Card className="flex max-w-xl flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-[16px] font-semibold text-fg">Organization Details</h2>
          <p className="text-[13.5px] leading-6 text-fg-3">
            Enter a name for your organization. You can invite members after creation.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className={labelClass}>
            Organization Name
          </label>
          <input
            id="name"
            type="text"
            className={inputClass}
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
          >
            {isSubmitting ? "Creating..." : "Create Organization"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/dashboard/settings/organizations")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </Card>
    </form>
  );
}
