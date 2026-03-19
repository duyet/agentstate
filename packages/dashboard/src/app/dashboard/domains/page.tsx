"use client";

import { PlusIcon } from "lucide-react";
import { Suspense, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
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
// Domains Page
// ---------------------------------------------------------------------------

export default function DomainsPage() {
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
    <Suspense fallback={<div className="h-32 bg-muted rounded animate-pulse" />}>
      <div>
        <PageHeader
          title="Custom Domains"
          description="Add a custom domain to serve your project from your own domain with SSL."
          actions={
            <Button size="sm" variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
              <PlusIcon className="h-4 w-4 mr-1.5" />
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
