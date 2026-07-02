import { PlusIcon } from "@phosphor-icons/react";
import { Suspense, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import {
  _AddDomainForm,
  _DomainsEmptyState,
  _DomainsList,
  _DomainsLoadingSkeleton,
} from "./_components/index";
import { useDomains } from "./_use-domains";
import { useProjectId } from "./_use-project-id";

// ---------------------------------------------------------------------------
// Domains Content (new design system — plain Tailwind + tokens, no Kumo)
// ---------------------------------------------------------------------------

export function DomainsContent() {
  const projectId = useProjectId();
  const [showAddForm, setShowAddForm] = useState(false);

  const {
    domains,
    loading,
    adding,
    checkingVerification,
    expandedDomains,
    newDomain,
    setNewDomain,
    handleAddDomain,
    handleDeleteDomain,
    handleCheckVerification,
    toggleDomain,
  } = useDomains(projectId);

  if (loading) {
    return <_DomainsLoadingSkeleton />;
  }

  return (
    <Suspense
      fallback={<div className="h-32 animate-pulse rounded-[var(--radius-lg)] bg-panel2" />}
    >
      <div className="flex flex-col gap-component px-4 py-7 lg:px-6">
        <PageHeader
          title="Custom Domains"
          description="Add a custom domain to serve your project from your own domain with SSL."
          actions={
            <Button variant="secondary" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
              <PlusIcon size={15} aria-hidden="true" />
              Add Domain
            </Button>
          }
        />

        {showAddForm && (
          <_AddDomainForm
            value={newDomain}
            onChange={setNewDomain}
            onSubmit={() => handleAddDomain(() => setShowAddForm(false))}
            onCancel={() => setShowAddForm(false)}
            adding={adding}
          />
        )}

        {domains.length === 0 ? (
          <_DomainsEmptyState onAddDomain={() => setShowAddForm(true)} />
        ) : (
          <_DomainsList
            domains={domains}
            expandedDomains={expandedDomains}
            checkingVerification={checkingVerification}
            onToggle={toggleDomain}
            onVerify={handleCheckVerification}
            onDelete={handleDeleteDomain}
          />
        )}
      </div>
    </Suspense>
  );
}
