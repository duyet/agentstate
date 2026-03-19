"use client";

import { useState } from "react";
import { useDomainActions } from "./_use-domain-actions";
import { useDomainsList } from "./_use-domains-list";
import { useExpandedDomains } from "./_use-expanded-domains";

export function useDomains(projectId: string | null) {
  const [newDomain, setNewDomain] = useState("");

  const { domains, loading, loadDomainsData, setDomains } = useDomainsList(projectId);
  const { expandedDomains, setExpandedDomains, toggleDomain } = useExpandedDomains();
  const {
    adding,
    checkingVerification,
    handleAddDomain,
    handleDeleteDomain,
    handleCheckVerification,
  } = useDomainActions(projectId, setDomains, setExpandedDomains);

  const handleAddDomainWithReset = (onSuccess?: () => void) => {
    handleAddDomain(newDomain, () => {
      setNewDomain("");
      onSuccess?.();
    });
  };

  return {
    domains,
    loading,
    adding,
    checkingVerification,
    expandedDomains,
    newDomain,
    setNewDomain,
    handleAddDomain: handleAddDomainWithReset,
    handleDeleteDomain,
    handleCheckVerification,
    toggleDomain,
    loadDomainsData,
  };
}
