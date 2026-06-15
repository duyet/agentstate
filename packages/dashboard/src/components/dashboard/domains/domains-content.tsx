import { PlusIcon } from "@phosphor-icons/react";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  _AddDomainForm,
  _DomainsEmptyState,
  _DomainsList,
  _DomainsLoadingSkeleton,
} from "./_components";
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
      <div className="flex flex-col gap-6 px-5 py-7 sm:px-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex max-w-2xl flex-col gap-1.5">
            <h1 className="text-[24px] font-semibold tracking-tight text-fg">Custom Domains</h1>
            <p className="text-[13.5px] leading-6 text-fg-3">
              Add a custom domain to serve your project from your own domain with SSL.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowAddForm(!showAddForm)}
            className="min-h-[36px] py-2"
          >
            <PlusIcon size={15} aria-hidden="true" />
            Add Domain
          </Button>
        </header>

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
