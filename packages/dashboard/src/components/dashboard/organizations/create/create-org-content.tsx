import { SignIn, useOrganizationCreationDefaults, useOrganizationList, useUser } from "@clerk/react";
import * as React from "react";
import { CreateOrgForm } from "./_create-org-form";
import { CreateOrgHeader } from "./_create-org-header";
import { CreateOrgLoading } from "./_create-org-loading";

export function CreateOrgContent() {
  const { isLoaded, isSignedIn } = useUser();
  const { isLoaded: isOrgListLoaded, createOrganization, setActive } = useOrganizationList();
  const { data: defaults, isLoading: isLoadingDefaults } = useOrganizationCreationDefaults();
  const [organizationName, setOrganizationName] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Seed the name from Clerk's suggested defaults, but never after the user
  // has started typing — a defaults refetch completing mid-edit must not
  // stomp their input (#322).
  const hasUserEditedRef = React.useRef(false);
  const handleNameChange = React.useCallback((name: string) => {
    hasUserEditedRef.current = true;
    setOrganizationName(name);
  }, []);

  React.useEffect(() => {
    if (defaults?.form.name && !hasUserEditedRef.current) {
      setOrganizationName(defaults.form.name);
    }
  }, [defaults?.form.name]);

  if (!isLoaded || !isOrgListLoaded || isLoadingDefaults) {
    return <CreateOrgLoading />;
  }

  // Normally unreachable — AppShell's Gate already blocks signed-out users —
  // but if this component is ever mounted outside the Gate, show the same
  // sign-in prompt instead of a blank page (#321).
  if (!isSignedIn) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center px-4">
        <SignIn routing="hash" />
      </div>
    );
  }

  const advisory = defaults?.advisory;
  const showWarning = advisory?.code === "organization_already_exists";
  const existingOrgName = advisory?.meta?.organization_name;
  const existingOrgDomain = advisory?.meta?.organization_domain;

  return (
    <div className="page-wrap">
      <CreateOrgHeader />
      <CreateOrgForm
        organizationName={organizationName}
        setOrganizationName={handleNameChange}
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
