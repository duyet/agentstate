"use client";

import type {
  ConversationResponse,
  MessageResponse,
  ProjectDetailResponse,
} from "@agentstate/shared";
import {
  ArrowLeftIcon,
  BookOpenIcon,
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
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { ROLE_STYLES } from "@/lib/constants";

type ProjectDetail = ProjectDetailResponse;
type Conversation = ConversationResponse;
type Message = MessageResponse;

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
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
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
        setConvsLoading(true);
        api<{ data: Conversation[] }>(`/v1/projects/${p.id}/conversations?limit=100`)
          .then((res) => setConversations(res.data))
          .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load data"))
          .finally(() => setConvsLoading(false));
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load data"))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(text);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      console.error("Failed to copy to clipboard");
    }
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
    setProject(await api<ProjectDetail>(`/v1/projects/by-slug/${slug}`));
  }
  async function handleRevokeKey(keyId: string) {
    if (!project) return;
    await api(`/v1/projects/${project.id}/keys/${keyId}`, { method: "DELETE" });
    setProject(await api<ProjectDetail>(`/v1/projects/by-slug/${slug}`));
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
  async function handleDeleteProject() {
    if (!project || deleteConfirmSlug !== project.slug) return;
    setDeleting(true);
    try {
      await api(`/v1/projects/${project.id}`, { method: "DELETE" });
      toast.success(`Project "${project.name}" deleted`);
      router.push("/dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete project");
      setDeleting(false);
    }
  }

  if (loading)
    return (
      <div className="space-y-4">
        <div className="h-7 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  if (!project) return <p className="text-muted-foreground">Project not found.</p>;

  const activeKeys = project.api_keys.filter((k) => !k.revoked_at);
  const totalConvs = conversations.length;
  const totalMessages = conversations.reduce((s, c) => s + c.message_count, 0);
  const totalTokens = conversations.reduce((s, c) => s + c.token_count, 0);

  function renderCell(conv: Conversation, col: ColumnKey) {
    switch (col) {
      case "title":
        return conv.title || "Untitled";
      case "external_id":
        return <code className="font-mono text-muted-foreground">{conv.external_id || "—"}</code>;
      case "message_count":
        return <span className="tabular-nums">{conv.message_count}</span>;
      case "token_count":
        return <span className="tabular-nums">{conv.token_count.toLocaleString()}</span>;
      case "metadata":
        return conv.metadata ? (
          <code className="font-mono text-muted-foreground text-xs truncate max-w-[140px] block">
            {JSON.stringify(conv.metadata)}
          </code>
        ) : (
          "—"
        );
      case "created_at":
        return (
          <span className="text-muted-foreground">
            {new Date(conv.created_at).toLocaleDateString()}
          </span>
        );
      case "updated_at":
        return (
          <span className="text-muted-foreground">
            {new Date(conv.updated_at).toLocaleDateString()}
          </span>
        );
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
          <p className="text-sm text-muted-foreground font-mono">{project.slug}</p>
        </div>
      </div>

      {createdKey && (
        <div className="border border-border rounded-lg p-5 mb-6 bg-card">
          <p className="font-medium mb-2">Your API key (shown once)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono bg-muted px-3 py-2 rounded break-all">
              {createdKey}
            </code>
            <Button size="sm" variant="outline" onClick={() => handleCopy(createdKey)}>
              {copiedKey === createdKey ? (
                <CheckIcon className="h-4 w-4" />
              ) : (
                <CopyIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Copy this key now. It won&apos;t be shown again.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: MessageSquareIcon, label: "Conversations", value: totalConvs },
          { icon: HashIcon, label: "Messages", value: totalMessages.toLocaleString() },
          { icon: CoinsIcon, label: "Tokens", value: totalTokens.toLocaleString() },
          { icon: KeyIcon, label: "API Keys", value: activeKeys.length },
        ].map((s) => (
          <div key={s.label} className="border border-border rounded-lg p-4 bg-card">
            <div className="flex items-center gap-2 mb-1.5">
              <s.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue={createdKey ? "keys" : "overview"}>
        <TabsList variant="line" className="mb-6 gap-0 border-b border-border pb-px">
          <TabsTrigger value="overview" className="px-4 py-2">
            <BookOpenIcon className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="keys" className="px-4 py-2">
            <KeyIcon className="h-4 w-4" />
            API Keys
            <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
              {activeKeys.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="conversations" className="px-4 py-2">
            <MessageSquareIcon className="h-4 w-4" />
            Conversations
            <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
              {totalConvs}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div>
            <h3 className="font-medium mb-3">Quick start</h3>
            <pre className="font-mono text-sm bg-card border border-border rounded-lg p-5 overflow-x-auto text-muted-foreground leading-relaxed">
              {`curl -X POST https://agentstate.app/api/v1/conversations \\
  -H "Authorization: Bearer <your-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'`}
            </pre>
          </div>
          <div>
            <h3 className="font-medium mb-2">Project details</h3>
            <div className="text-sm text-muted-foreground space-y-1.5">
              <p>
                ID: <code className="font-mono text-foreground/70">{project.id}</code>
              </p>
              <p>Created: {new Date(project.created_at).toLocaleString()}</p>
              <p>
                Base URL:{" "}
                <code className="font-mono text-foreground/70">https://agentstate.app/api</code>
              </p>
            </div>
          </div>
          <div className="border border-red-200 dark:border-red-900/50 rounded-lg p-5">
            <h3 className="font-medium text-red-600 dark:text-red-400 mb-2">Danger zone</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Permanently delete this project and all its data including conversations, messages,
              and API keys.
            </p>
            <AlertDialog onOpenChange={(open) => !open && setDeleteConfirmSlug("")}>
              <AlertDialogTrigger
                render={
                  <Button variant="destructive" size="sm">
                    <TrashIcon className="h-4 w-4 mr-1.5" />
                    Delete project
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {project.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the project and all
                    associated conversations, messages, and API keys.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-2">
                  <label
                    htmlFor="delete-confirm"
                    className="text-sm text-muted-foreground mb-2 block"
                  >
                    Type{" "}
                    <code className="font-mono font-semibold text-foreground">{project.slug}</code>{" "}
                    to confirm
                  </label>
                  <Input
                    id="delete-confirm"
                    placeholder={project.slug}
                    value={deleteConfirmSlug}
                    onChange={(e) => setDeleteConfirmSlug(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteProject}
                    disabled={deleteConfirmSlug !== project.slug || deleting}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {deleting ? "Deleting..." : "Delete project"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TabsContent>

        <TabsContent value="keys">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">Manage API keys for this project.</p>
            <Button size="sm" variant="outline" onClick={() => setShowCreateKey(true)}>
              <PlusIcon className="h-4 w-4 mr-1.5" />
              New Key
            </Button>
          </div>
          {showCreateKey && (
            <div className="border border-border rounded-lg p-5 mb-4 bg-card">
              <label htmlFor="key-name" className="text-sm text-muted-foreground mb-2 block">
                Key name
              </label>
              <div className="flex gap-2">
                <Input
                  id="key-name"
                  placeholder="e.g. Production"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateKey()}
                  autoFocus
                />
                <Button onClick={handleCreateKey} disabled={!newKeyName.trim()}>
                  Create
                </Button>
                <Button variant="ghost" onClick={() => setShowCreateKey(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          <div className="border border-border rounded-lg overflow-hidden">
            {activeKeys.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-card">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Name</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Key</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden sm:table-cell">
                      Last used
                    </th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {activeKeys.map((key) => (
                    <tr
                      key={key.id}
                      className="border-b last:border-b-0 border-border hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <KeyIcon className="h-4 w-4 text-muted-foreground" />
                          {key.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="font-mono text-muted-foreground">{key.key_prefix}...</code>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {key.last_used_at
                          ? new Date(key.last_used_at).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                          aria-label={`Revoke key ${key.name}`}
                          onClick={() => handleRevokeKey(key.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-muted-foreground">No active API keys</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="conversations">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {totalConvs} conversation{totalConvs !== 1 ? "s" : ""}
            </p>
            <div className="relative">
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => setShowColPicker(!showColPicker)}
              >
                Columns
              </Button>
              {showColPicker && (
                <div className="absolute right-0 top-9 z-10 border border-border rounded-lg bg-card p-2 shadow-lg min-w-[160px]">
                  {ALL_COLUMNS.map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded"
                    >
                      <input
                        type="checkbox"
                        checked={visibleCols.includes(col.key)}
                        onChange={() =>
                          setVisibleCols((p) =>
                            p.includes(col.key) ? p.filter((c) => c !== col.key) : [...p, col.key],
                          )
                        }
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
                <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : conversations.length > 0 ? (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-card">
                    <th className="w-8 px-3 py-3" />
                    {ALL_COLUMNS.filter((c) => visibleCols.includes(c.key)).map((col) => (
                      <th
                        key={col.key}
                        className="text-left px-4 py-3 text-muted-foreground font-medium"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {conversations.map((conv) => (
                    <tr key={conv.id} className="group">
                      <td colSpan={visibleCols.length + 1} className="p-0">
                        <button
                          type="button"
                          className="flex w-full items-center border-b border-border bg-transparent text-left hover:bg-muted/20 transition-colors cursor-pointer"
                          onClick={() => toggleConversation(conv.id)}
                        >
                          <div className="px-3 py-3 text-muted-foreground">
                            {expandedConv === conv.id ? (
                              <ChevronDownIcon className="h-4 w-4" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4" />
                            )}
                          </div>
                          {ALL_COLUMNS.filter((c) => visibleCols.includes(c.key)).map((col) => (
                            <div key={col.key} className="px-4 py-3">
                              {renderCell(conv, col.key)}
                            </div>
                          ))}
                        </button>
                        {expandedConv === conv.id && (
                          <div className="bg-muted/10 border-b border-border px-6 py-5">
                            {messagesCache[conv.id] ? (
                              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                                {messagesCache[conv.id].length > 0 ? (
                                  messagesCache[conv.id].map((msg) => (
                                    <div key={msg.id} className="flex gap-3">
                                      <span
                                        className={`text-xs font-mono px-2 py-0.5 rounded shrink-0 mt-1 ${ROLE_STYLES[msg.role] ?? ROLE_STYLES.system}`}
                                      >
                                        {msg.role}
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                          {msg.content}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {new Date(msg.created_at).toLocaleString()}
                                          {msg.token_count > 0 && ` · ${msg.token_count} tokens`}
                                        </p>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground">No messages</p>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
                                <div className="h-5 w-1/2 bg-muted rounded animate-pulse" />
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border border-dashed border-border rounded-lg p-10 text-center">
              <MessageSquareIcon className="h-6 w-6 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No conversations yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Use the API key to start storing conversations.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
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
