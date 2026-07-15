"use client";

import type { ProjectDetailResponse } from "@agentstate/shared";
import { Key } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { ApiKeysTable } from "@/components/dashboard/project/_api-keys-table";
import { _CreatedKeyDisplay } from "@/components/dashboard/project/_created-key-display";
import { KeyNameForm } from "@/components/dashboard/project/_keys-tab";
import { useProjectScope } from "@/components/project-scope";
import { Providers } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useCopiedText } from "@/lib/hooks/use-copied-text";

const NEW_KEY_SESSION_KEY = (projectId: string) => `new_key_${projectId}`;

/**
 * KeysPage - dedicated API Keys dashboard page. Lists keys for the active
 * project (shared ProjectScopeProvider), supports creating a new key and
 * revoking existing ones. Mirrors the project Keys-tab flow but as a
 * first-class, always-discoverable route at /dashboard/keys.
 */
function KeysContent() {
  const { selectedProject, projects, setSelectedProjectId, loadingProjects } = useProjectScope();
  const { copied, copy } = useCopiedText();
  const [keys, setKeys] = useState<ProjectDetailResponse["api_keys"]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  // The full secret is only returned once at creation. We surface it in a
  // one-time reveal/copy UI and persist it to sessionStorage (per project) so
  // a refresh still shows it — but it is NEVER echoed in the table.
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const refreshKeys = useCallback(async () => {
    if (!selectedProject) {
      setKeys([]);
      return;
    }
    setLoading(true);
    try {
      const p = await api<ProjectDetailResponse>(`/v1/projects/${selectedProject.id}`);
      setKeys(p.api_keys ?? []);
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  // On project switch/refresh: restore a freshly created key from sessionStorage
  // and reload the key list. (Mirrors useProjectData's load-on-change pattern.)
  useEffect(() => {
    setCreatedKey(
      selectedProject ? sessionStorage.getItem(NEW_KEY_SESSION_KEY(selectedProject.id)) : null,
    );
    void refreshKeys();
  }, [selectedProject, refreshKeys]);

  const handleCreateKey = async (scopes?: string[]) => {
    if (!newKeyName.trim() || !selectedProject) return;
    const res = await api<{ id: string; key: string }>(`/v1/projects/${selectedProject.id}/keys`, {
      method: "POST",
      body: JSON.stringify({
        name: newKeyName.trim(),
        ...(scopes && scopes.length > 0 ? { scopes } : {}),
      }),
    });
    // Hold the secret only client-side, once. Never sent back to the server.
    sessionStorage.setItem(NEW_KEY_SESSION_KEY(selectedProject.id), res.key);
    setCreatedKey(res.key);
    setNewKeyName("");
    setShowCreate(false);
    await refreshKeys();
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!selectedProject) return;
    await api(`/v1/projects/${selectedProject.id}/keys/${keyId}`, { method: "DELETE" });
    await refreshKeys();
  };

  return (
    <div className="flex flex-col space-y-section page-padding section-padding">
      <PageHeader
        title="API Keys"
        description="Project-scoped keys your agents use to authenticate against the API. Keep them secret."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreate(true)}
            disabled={!selectedProject || loadingProjects}
          >
            <Key size={15} aria-hidden="true" />
            New Key
          </Button>
        }
      />

      {/* Active project selector — shares ProjectScope with the sidebar */}
      <Card className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="as-label-sm text-fg-4">Project</span>
          {loadingProjects ? (
            <div className="h-8 w-40 animate-pulse rounded-[var(--radius)] bg-panel2" />
          ) : (
            <select
              aria-label="Active project"
              value={selectedProject?.id ?? ""}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="h-8 appearance-none rounded-[var(--radius)] border border-edge bg-base px-2.5 text-[13px] text-fg transition-colors hover:bg-panel2 focus-visible:bg-panel2 focus-visible:outline-none"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
        {selectedProject && (
          <code className="font-mono text-[11.5px] text-fg-4">{selectedProject.slug}</code>
        )}
      </Card>

      {showCreate && (
        <KeyNameForm
          value={newKeyName}
          onChange={setNewKeyName}
          onSubmit={handleCreateKey}
          onCancel={() => {
            setShowCreate(false);
            setNewKeyName("");
          }}
        />
      )}

      {createdKey && selectedProject && (
        <_CreatedKeyDisplay apiKey={createdKey} copied={copied} onCopy={copy} />
      )}

      {loading ? (
        <Card className="flex items-center justify-center py-16">
          <div className="size-5 animate-spin rounded-full border-2 border-edge border-t-fg-4" />
        </Card>
      ) : (
        <ApiKeysTable keys={keys} onRevoke={handleRevokeKey} />
      )}
    </div>
  );
}

export function KeysPage() {
  return (
    <Providers>
      <AppShell>
        <KeysContent />
      </AppShell>
    </Providers>
  );
}
