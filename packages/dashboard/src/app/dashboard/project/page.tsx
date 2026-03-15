"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyIcon, CopyIcon, CheckIcon, PlusIcon, TrashIcon, ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: number;
  last_used_at: number | null;
  revoked_at: number | null;
}

interface ProjectDetail {
  id: string;
  name: string;
  slug: string;
  created_at: number;
  api_keys: ApiKey[];
}

function ProjectContent() {
  const params = useSearchParams();
  const slug = params.get("slug");

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    // Check sessionStorage for newly created key (set during project creation)
    const storedKey = sessionStorage.getItem(`new_key_${slug}`);
    if (storedKey) {
      setCreatedKey(storedKey);
      sessionStorage.removeItem(`new_key_${slug}`);
    }
    // Fetch project by slug
    api<ProjectDetail>(`/v1/projects/by-slug/${slug}`)
      .then(setProject)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  async function handleCreateKey() {
    if (!newKeyName.trim() || !project) return;
    const res = await api<{ id: string; key: string; name: string; key_prefix: string; created_at: number }>(
      `/v1/projects/${project.id}/keys`,
      { method: "POST", body: JSON.stringify({ name: newKeyName.trim() }) },
    );
    setCreatedKey(res.key);
    setShowCreateKey(false);
    setNewKeyName("");
    const updated = await api<ProjectDetail>(`/v1/projects/by-slug/${slug}`);
    setProject(updated);
  }

  async function handleRevokeKey(keyId: string) {
    if (!project) return;
    await api(`/v1/projects/${project.id}/keys/${keyId}`, { method: "DELETE" });
    const updated = await api<ProjectDetail>(`/v1/projects/by-slug/${slug}`);
    setProject(updated);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse mt-6" />
      </div>
    );
  }

  if (!project) {
    return <p className="text-sm text-muted-foreground">Project not found.</p>;
  }

  const activeKeys = project.api_keys.filter((k) => !k.revoked_at);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">{project.name}</h1>
          <p className="text-xs text-muted-foreground font-mono">{project.slug}</p>
        </div>
      </div>

      {createdKey && (
        <div className="border border-border rounded-lg p-4 mb-6 bg-card">
          <p className="text-xs font-medium text-foreground mb-2">Your API key (shown once)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-muted px-3 py-2 rounded text-foreground break-all">
              {createdKey}
            </code>
            <Button size="sm" variant="outline" className="shrink-0 h-8" onClick={() => handleCopy(createdKey)}>
              {copiedKey === createdKey ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Copy this key now. It won&apos;t be shown again.
          </p>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium text-foreground">API Keys</h2>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowCreateKey(true)}>
            <PlusIcon className="h-3 w-3 mr-1" />
            New Key
          </Button>
        </div>

        {showCreateKey && (
          <div className="border border-border rounded-lg p-4 mb-3 bg-card">
            <label className="text-xs text-muted-foreground mb-1.5 block">Key name</label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Production"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateKey()}
                className="text-sm h-8"
                autoFocus
              />
              <Button size="sm" className="text-xs h-8" onClick={handleCreateKey} disabled={!newKeyName.trim()}>
                Create
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-8" onClick={() => setShowCreateKey(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="border border-border rounded-lg overflow-hidden">
          {activeKeys.length > 0 ? (
            <table className="w-full" aria-label="API keys">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Name</th>
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">Key</th>
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium hidden sm:table-cell">Last used</th>
                  <th className="px-4 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {activeKeys.map((key) => (
                  <tr key={key.id} className="border-b last:border-b-0 border-border">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <KeyIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">{key.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <code className="text-xs font-mono text-muted-foreground">{key.key_prefix}...</code>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground hidden sm:table-cell">
                      {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                        onClick={() => handleRevokeKey(key.id)}
                      >
                        <TrashIcon className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center">
              <p className="text-xs text-muted-foreground">No active API keys</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-medium text-foreground mb-3">Quick start</h2>
        <pre className="text-xs font-mono bg-card border border-border rounded p-4 overflow-x-auto text-muted-foreground" aria-label="Quick start example">
{`curl -X POST https://agentstate.app/api/v1/conversations \\
  -H "Authorization: Bearer <your-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'`}
        </pre>
      </div>
    </div>
  );
}

export default function ProjectPage() {
  return (
    <Suspense fallback={<div className="h-32 bg-muted rounded animate-pulse" />}>
      <ProjectContent />
    </Suspense>
  );
}
