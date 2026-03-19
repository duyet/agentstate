"use client";

import { useOrganizationCreationDefaults, useOrganizationList, useUser } from "@clerk/react";
import * as React from "react";
import { CreateOrgForm } from "./_create-org-form";
import { CreateOrgHeader } from "./_create-org-header";
import { CreateOrgLoading } from "./_create-org-loading";

export default function CreateOrganizationPage() {
  const { isLoaded, isSignedIn } = useUser();
  const { isLoaded: isOrgListLoaded, createOrganization, setActive } = useOrganizationList();
  const { data: defaults, isLoading: isLoadingDefaults } = useOrganizationCreationDefaults();
  const [organizationName, setOrganizationName] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (defaults?.form.name) {
      setOrganizationName(defaults.form.name);
    }
  }, [defaults?.form.name]);

  if (!isLoaded || !isOrgListLoaded || isLoadingDefaults) {
    return <CreateOrgLoading />;
  }

  if (!isSignedIn) {
    return null;
  }

  const advisory = defaults?.advisory;
  const showWarning = advisory?.code === "organization_already_exists";
  const existingOrgName = advisory?.meta?.organization_name;
  const existingOrgDomain = advisory?.meta?.organization_domain;

  return (
    <div className="space-y-6">
      <CreateOrgHeader />
      <CreateOrgForm
        organizationName={organizationName}
        setOrganizationName={setOrganizationName}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
        createOrganization={createOrganization}
        setActive={setActive}
        showWarning={showWarning}
        existingOrgName={existingOrgName}
        existingOrgDomain={existingOrgDomain}
      />
    </div>
  );
}
