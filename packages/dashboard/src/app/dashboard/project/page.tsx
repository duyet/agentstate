"use client";

import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CoinsIcon,
  CopyIcon,
  HashIcon,
  KeyIcon,
  MessageSquareIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

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

interface Conversation {
  id: string;
  external_id: string | null;
  title: string | null;
  message_count: number;
  token_count: number;
  metadata: Record<string, unknown> | null;
  created_at: number;
  updated_at: number;
}

interface Message {
  id: string;
  role: string;
  content: string;
  metadata: Record<string, unknown> | null;
  token_count: number;
  created_at: number;
}

const ROLE_COLORS: Record<string, string> = {
  user: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  assistant: "bg-green-500/10 text-green-600 dark:text-green-400",
  system: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
  tool: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
};

// ---------------------------------------------------------------------------
// Visible columns config
// ---------------------------------------------------------------------------

const ALL_COLUMNS = [
  { key: "title", label: "Title" },
  { key: "external_id", label: "External ID" },
  { key: "message_count", label: "Messages" },
  { key: "token_count", label: "Tokens" },
  { key: "metadata", label: "Metadata" },
  { key: "created_at", label: "Created" },
  { key: "updated_at", label: "Updated" },
] as const;

type ColumnKey = (typeof ALL_COLUMNS)[number]["key"];

const DEFAULT_COLUMNS: ColumnKey[] = ["title", "message_count", "token_count", "updated_at"];

function ProjectContent() {
  const params = useSearchParams();
  const slug = params.get("slug");

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(false);
  const [expandedConv, setExpandedConv] = useState<string | null>(null);
  const [messagesCache, setMessagesCache] = useState<Record<string, Message[]>>({});
  const [visibleCols, setVisibleCols] = useState<ColumnKey[]>(DEFAULT_COLUMNS);
  const [showColPicker, setShowColPicker] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const storedKey = sessionStorage.getItem(`new_key_${slug}`);
    if (storedKey) {
      setCreatedKey(storedKey);
      sessionStorage.removeItem(`new_key_${slug}`);
    }
    api<ProjectDetail>(`/v1/projects/by-slug/${slug}`)
      .then((p) => {
        setProject(p);
        // Fetch conversations
        setConvsLoading(true);
        api<{ data: Conversation[] }>(`/v1/projects/${p.id}/conversations?limit=100`)
          .then((res) => setConversations(res.data))
          .catch(() => {})
          .finally(() => setConvsLoading(false));
      })
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
    const res = await api<{ id: string; key: string }>(`/v1/projects/${project.id}/keys`, {
      method: "POST",
      body: JSON.stringify({ name: newKeyName.trim() }),
    });
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

  async function toggleConversation(convId: string) {
    if (expandedConv === convId) {
      setExpandedConv(null);
      return;
    }
    setExpandedConv(convId);
    if (!messagesCache[convId] && project) {
      const res = await api<{ data: Message[] }>(
        `/v1/projects/${project.id}/conversations/${convId}/messages`,
      );
      setMessagesCache((prev) => ({ ...prev, [convId]: res.data }));
    }
  }

  function toggleColumn(col: ColumnKey) {
    setVisibleCols((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]));
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-3 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return <p className="text-sm text-muted-foreground">Project not found.</p>;
  }

  const activeKeys = project.api_keys.filter((k) => !k.revoked_at);
  const totalConvs = conversations.length;
  const totalMessages = conversations.reduce((s, c) => s + c.message_count, 0);
  const totalTokens = conversations.reduce((s, c) => s + c.token_count, 0);

  function renderCell(conv: Conversation, col: ColumnKey) {
    switch (col) {
      case "title":
        return <span className="text-sm">{conv.title || "Untitled"}</span>;
      case "external_id":
        return (
          <code className="text-xs font-mono text-muted-foreground">{conv.external_id || "—"}</code>
        );
      case "message_count":
        return <span className="text-sm tabular-nums">{conv.message_count}</span>;
      case "token_count":
        return <span className="text-sm tabular-nums">{conv.token_count.toLocaleString()}</span>;
      case "metadata":
        return conv.metadata ? (
          <code className="text-xs font-mono text-muted-foreground truncate max-w-[120px] block">
            {JSON.stringify(conv.metadata)}
          </code>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      case "created_at":
        return (
          <span className="text-xs text-muted-foreground">
            {new Date(conv.created_at).toLocaleDateString()}
          </span>
        );
      case "updated_at":
        return (
          <span className="text-xs text-muted-foreground">
            {new Date(conv.updated_at).toLocaleDateString()}
          </span>
        );
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">{project.name}</h1>
          <p className="text-xs text-muted-foreground font-mono">{project.slug}</p>
        </div>
      </div>

      {/* New key banner */}
      {createdKey && (
        <div className="border border-border rounded-lg p-4 mb-6 bg-card">
          <p className="text-xs font-medium text-foreground mb-2">Your API key (shown once)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-muted px-3 py-2 rounded text-foreground break-all">
              {createdKey}
            </code>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 h-8"
              onClick={() => handleCopy(createdKey)}
            >
              {copiedKey === createdKey ? (
                <CheckIcon className="h-3.5 w-3.5" />
              ) : (
                <CopyIcon className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Copy this key now. It won&apos;t be shown again.
          </p>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquareIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Conversations</span>
          </div>
          <p className="text-xl font-semibold tabular-nums">{totalConvs}</p>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 mb-1">
            <HashIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Messages</span>
          </div>
          <p className="text-xl font-semibold tabular-nums">{totalMessages.toLocaleString()}</p>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 mb-1">
            <CoinsIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Tokens</span>
          </div>
          <p className="text-xl font-semibold tabular-nums">{totalTokens.toLocaleString()}</p>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 mb-1">
            <KeyIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">API Keys</span>
          </div>
          <p className="text-xl font-semibold tabular-nums">{activeKeys.length}</p>
        </div>
      </div>

      {/* API Keys */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-foreground">API Keys</h2>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-7"
            onClick={() => setShowCreateKey(true)}
          >
            <PlusIcon className="h-3 w-3 mr-1" />
            New Key
          </Button>
        </div>

        {showCreateKey && (
          <div className="border border-border rounded-lg p-4 mb-3 bg-card">
            <label htmlFor="key-name" className="text-xs text-muted-foreground mb-1.5 block">Key name</label>
            <div className="flex gap-2">
              <Input
                id="key-name"
                placeholder="e.g. Production"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateKey()}
                className="text-sm h-8"
                autoFocus
              />
              <Button
                size="sm"
                className="text-xs h-8"
                onClick={handleCreateKey}
                disabled={!newKeyName.trim()}
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-8"
                onClick={() => setShowCreateKey(false)}
              >
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
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">
                    Name
                  </th>
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium">
                    Key
                  </th>
                  <th className="text-left px-4 py-2 text-xs text-muted-foreground font-medium hidden sm:table-cell">
                    Last used
                  </th>
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
                      <code className="text-xs font-mono text-muted-foreground">
                        {key.key_prefix}...
                      </code>
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
            <div className="p-6 text-center">
              <p className="text-xs text-muted-foreground">No active API keys</p>
            </div>
          )}
        </div>
      </div>

      {/* Conversations */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-foreground">Conversations</h2>
          <div className="relative">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => setShowColPicker(!showColPicker)}
            >
              Columns
            </Button>
            {showColPicker && (
              <div className="absolute right-0 top-8 z-10 border border-border rounded-lg bg-card p-2 shadow-lg min-w-[160px]">
                {ALL_COLUMNS.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer hover:bg-accent rounded"
                  >
                    <input
                      type="checkbox"
                      checked={visibleCols.includes(col.key)}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {convsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : conversations.length > 0 ? (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full" aria-label="Conversations">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="w-8 px-3 py-2" />
                  {ALL_COLUMNS.filter((c) => visibleCols.includes(c.key)).map((col) => (
                    <th
                      key={col.key}
                      className="text-left px-4 py-2 text-xs text-muted-foreground font-medium"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conversations.map((conv) => (
                  <>
                    <tr
                      key={conv.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => toggleConversation(conv.id)}
                    >
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {expandedConv === conv.id ? (
                          <ChevronDownIcon className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRightIcon className="h-3.5 w-3.5" />
                        )}
                      </td>
                      {ALL_COLUMNS.filter((c) => visibleCols.includes(c.key)).map((col) => (
                        <td key={col.key} className="px-4 py-2.5">
                          {renderCell(conv, col.key)}
                        </td>
                      ))}
                    </tr>
                    {expandedConv === conv.id && (
                      <tr key={`${conv.id}-messages`}>
                        <td colSpan={visibleCols.length + 1} className="bg-muted/20 px-6 py-4">
                          {messagesCache[conv.id] ? (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                              {messagesCache[conv.id].map((msg) => (
                                <div key={msg.id} className="flex gap-3">
                                  <span
                                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${ROLE_COLORS[msg.role] || ROLE_COLORS.system}`}
                                  >
                                    {msg.role}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                                      {msg.content}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                      {new Date(msg.created_at).toLocaleString()}
                                      {msg.token_count > 0 && ` · ${msg.token_count} tokens`}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              {messagesCache[conv.id].length === 0 && (
                                <p className="text-xs text-muted-foreground">No messages</p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                              <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border border-dashed border-border rounded-lg p-8 text-center">
            <MessageSquareIcon className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Use the API key above to start storing conversations.
            </p>
          </div>
        )}
      </div>

      {/* Quick start */}
      <div>
        <h2 className="text-sm font-medium text-foreground mb-3">Quick start</h2>
        <pre
          className="text-xs font-mono bg-card border border-border rounded p-4 overflow-x-auto text-muted-foreground"
          aria-label="Quick start example"
        >
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
