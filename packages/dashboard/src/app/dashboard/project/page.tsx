"use client";

import type {
  ConversationResponse,
  MessageResponse,
  ProjectDetailResponse,
} from "@agentstate/shared";
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
  Settings2Icon,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChartCardSkeleton,
  ConversationRowSkeleton,
  MessageListSkeleton,
  PageHeaderSkeleton,
  StatsCardsSkeleton,
} from "@/components/dashboard/loading-states";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { ROLE_BADGE_VARIANTS } from "@/lib/constants";
import { useCopiedText } from "@/lib/hooks/use-copied-text";

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

// ---------------------------------------------------------------------------
// Stats Card Component
// ---------------------------------------------------------------------------

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}

function _StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// API Key Display Component
// ---------------------------------------------------------------------------

interface CreatedKeyDisplayProps {
  apiKey: string;
  copied: boolean;
  onCopy: (text: string) => void;
}

function _CreatedKeyDisplay({ apiKey, copied, onCopy }: CreatedKeyDisplayProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Your API key (shown once)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm font-mono bg-muted px-3 py-2 rounded break-all">
            {apiKey}
          </code>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCopy(apiKey)}
            aria-label={copied ? "Copied!" : "Copy API key"}
          >
            {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Copy this key now. It won&apos;t be shown again.
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Create Key Form Component
// ---------------------------------------------------------------------------

interface CreateKeyFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function _CreateKeyForm({ value, onChange, onSubmit, onCancel }: CreateKeyFormProps) {
  return (
    <div className="border border-border rounded-lg p-5 mb-4 bg-card">
      <label htmlFor="key-name" className="text-sm text-muted-foreground mb-2 block">
        Key name
      </label>
      <div className="flex gap-2">
        <Input
          id="key-name"
          placeholder="e.g. Production"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          autoFocus
        />
        <Button onClick={onSubmit} disabled={!value.trim()}>
          Create
        </Button>
        <Button variant="ghost" onClick={onCancel} aria-label="Cancel creating API key">
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// API Keys Table Component
// ---------------------------------------------------------------------------

interface ApiKeysTableProps {
  keys: ProjectDetail["api_keys"];
  onRevoke: (keyId: string) => void;
}

function _ApiKeysTable({ keys, onRevoke }: ApiKeysTableProps) {
  const activeKeys = keys.filter((k) => !k.revoked_at);

  if (activeKeys.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted/60 mx-auto mb-3">
          <KeyIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">No active API keys</p>
        <p className="text-xs text-muted-foreground">Create a key to start using the API.</p>
      </div>
    );
  }

  return (
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
              {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : "Never"}
            </td>
            <td className="px-4 py-3">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                aria-label={`Revoke key ${key.name}`}
                onClick={() => onRevoke(key.id)}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// Column Picker Component
// ---------------------------------------------------------------------------

interface ColumnPickerProps {
  allColumns: readonly { key: ColumnKey; label: string }[];
  visible: ColumnKey[];
  onChange: (columns: ColumnKey[]) => void;
}

function _ColumnPicker({ allColumns, visible, onChange }: ColumnPickerProps) {
  return (
    <div
      role="menu"
      aria-label="Select visible columns"
      className="absolute right-0 top-9 z-10 border border-border rounded-lg bg-card p-2 shadow-lg min-w-[160px]"
    >
      {allColumns.map((col) => (
        <label
          key={col.key}
          className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded"
        >
          <input
            type="checkbox"
            checked={visible.includes(col.key)}
            onChange={() =>
              onChange(
                visible.includes(col.key)
                  ? visible.filter((c) => c !== col.key)
                  : [...visible, col.key],
              )
            }
            className="rounded"
          />
          <span className="flex-1">{col.label}</span>
        </label>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversation Message Component
// ---------------------------------------------------------------------------

interface ConversationMessageProps {
  message: Message;
}

function ConversationMessage({ message }: ConversationMessageProps) {
  return (
    <div className="flex gap-3">
      <Badge
        variant={ROLE_BADGE_VARIANTS[message.role] ?? ROLE_BADGE_VARIANTS.system}
        className="text-xs font-mono px-2 py-0.5 rounded shrink-0 mt-1"
      >
        {message.role}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(message.created_at).toLocaleString()}
          {message.token_count > 0 && ` · ${message.token_count} tokens`}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversation Row Component
// ---------------------------------------------------------------------------

interface ConversationRowProps {
  conversation: Conversation;
  isExpanded: boolean;
  messages?: Message[];
  isLoading: boolean;
  visibleColumns: ColumnKey[];
  allColumns: readonly { key: ColumnKey; label: string }[];
  onToggle: () => void;
  renderCell: (conv: Conversation, col: ColumnKey) => React.ReactNode;
}

function _ConversationRow({
  conversation,
  isExpanded,
  messages,
  isLoading,
  visibleColumns,
  allColumns,
  onToggle,
  renderCell,
}: ConversationRowProps) {
  return (
    <tr key={conversation.id} className="group">
      <td colSpan={visibleColumns.length + 1} className="p-0">
        <button
          type="button"
          className="flex w-full items-center border-b border-border bg-transparent text-left hover:bg-muted/20 transition-colors cursor-pointer"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-label={`Toggle ${conversation.title || "Untitled"} conversation`}
        >
          <div className="px-3 py-3 text-muted-foreground" aria-hidden="true">
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </div>
          {allColumns
            .filter((c) => visibleColumns.includes(c.key))
            .map((col) => (
              <div key={col.key} className="px-4 py-3">
                {renderCell(conversation, col.key)}
              </div>
            ))}
        </button>
        {isExpanded && (
          <section
            className="bg-muted/10 border-b border-border px-6 py-5"
            aria-label="Conversation messages"
          >
            {isLoading && <MessageListSkeleton lines={2} />}
            {!isLoading && messages && messages.length > 0 && (
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {messages.map((msg) => (
                  <ConversationMessage key={msg.id} message={msg} />
                ))}
              </div>
            )}
            {!isLoading && messages && messages.length === 0 && (
              <p className="text-sm text-muted-foreground">No messages</p>
            )}
          </section>
        )}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Conversations Empty State Component
// ---------------------------------------------------------------------------

function _ConversationsEmptyState() {
  return (
    <Card className="border-dashed">
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted/60 mb-4">
          <MessageSquareIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">No conversations yet</p>
        <p className="text-xs text-muted-foreground max-w-xs mb-4">
          Use your API key to start storing conversations.
        </p>
        <div className="text-xs text-muted-foreground">
          <span className="font-mono bg-muted px-2 py-1 rounded">POST /api/v1/conversations</span>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page Header Component
// ---------------------------------------------------------------------------

interface PageHeaderProps {
  name: string;
  slug: string;
}

function _PageHeader({ name, slug }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
        <p className="text-sm text-muted-foreground font-mono">{slug}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats Grid Component
// ---------------------------------------------------------------------------

interface StatsGridProps {
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
  activeKeyCount: number;
}

function _StatsGrid({
  totalConversations,
  totalMessages,
  totalTokens,
  activeKeyCount,
}: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <_StatCard icon={MessageSquareIcon} label="Conversations" value={totalConversations} />
      <_StatCard icon={HashIcon} label="Messages" value={totalMessages.toLocaleString()} />
      <_StatCard icon={CoinsIcon} label="Tokens" value={totalTokens.toLocaleString()} />
      <_StatCard icon={KeyIcon} label="API Keys" value={activeKeyCount} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab Trigger with Badge Component
// ---------------------------------------------------------------------------

interface TabTriggerProps {
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
}

function _TabTrigger({ value, icon: Icon, label, count }: TabTriggerProps) {
  return (
    <TabsTrigger value={value} className="px-5 py-2.5 text-sm">
      <Icon className="h-4 w-4" />
      {label}
      {count !== undefined && (
        <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">{count}</span>
      )}
    </TabsTrigger>
  );
}

// ---------------------------------------------------------------------------
// Conversations Table Header Component
// ---------------------------------------------------------------------------

interface ConversationsTableHeaderProps {
  allColumns: readonly { key: ColumnKey; label: string }[];
  visibleColumns: ColumnKey[];
}

function _ConversationsTableHeader({ allColumns, visibleColumns }: ConversationsTableHeaderProps) {
  return (
    <thead>
      <tr className="border-b border-border bg-card">
        <th className="w-8 px-3 py-3" />
        {allColumns
          .filter((c) => visibleColumns.includes(c.key))
          .map((col) => (
            <th key={col.key} className="text-left px-4 py-3 text-muted-foreground font-medium">
              {col.label}
            </th>
          ))}
      </tr>
    </thead>
  );
}

// ---------------------------------------------------------------------------
// Conversations Table Component
// ---------------------------------------------------------------------------

interface ConversationsTableProps {
  conversations: Conversation[];
  expandedConv: string | null;
  messagesCache: Record<string, Message[]>;
  loadingMessages: Record<string, boolean>;
  visibleColumns: ColumnKey[];
  allColumns: readonly { key: ColumnKey; label: string }[];
  onToggle: (convId: string) => void;
  renderCell: (conv: Conversation, col: ColumnKey) => React.ReactNode;
}

function _ConversationsTable({
  conversations,
  expandedConv,
  messagesCache,
  loadingMessages,
  visibleColumns,
  allColumns,
  onToggle,
  renderCell,
}: ConversationsTableProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <_ConversationsTableHeader allColumns={allColumns} visibleColumns={visibleColumns} />
        <tbody>
          {conversations.map((conv) => (
            <_ConversationRow
              key={conv.id}
              conversation={conv}
              isExpanded={expandedConv === conv.id}
              messages={messagesCache[conv.id]}
              isLoading={loadingMessages[conv.id] || false}
              visibleColumns={visibleColumns}
              allColumns={allColumns}
              onToggle={() => onToggle(conv.id)}
              renderCell={renderCell}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data Tab Content Component
// ---------------------------------------------------------------------------

interface DataTabProps {
  totalConvs: number;
  convsLoading: boolean;
  conversations: Conversation[];
  expandedConv: string | null;
  messagesCache: Record<string, Message[]>;
  loadingMessages: Record<string, boolean>;
  visibleCols: ColumnKey[];
  showColPicker: boolean;
  allColumns: readonly { key: ColumnKey; label: string }[];
  onToggleConversation: (convId: string) => void;
  onToggleColPicker: () => void;
  onChangeColumns: (columns: ColumnKey[]) => void;
  renderCell: (conv: Conversation, col: ColumnKey) => React.ReactNode;
}

function _DataTab({
  totalConvs,
  convsLoading,
  conversations,
  expandedConv,
  messagesCache,
  loadingMessages,
  visibleCols,
  showColPicker,
  allColumns,
  onToggleConversation,
  onToggleColPicker,
  onChangeColumns,
  renderCell,
}: DataTabProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {totalConvs} conversation{totalConvs !== 1 ? "s" : ""}
        </p>
        <div className="relative">
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={onToggleColPicker}
            aria-expanded={showColPicker}
            aria-haspopup="menu"
          >
            Columns
          </Button>
          {showColPicker && (
            <_ColumnPicker
              allColumns={allColumns}
              visible={visibleCols}
              onChange={onChangeColumns}
            />
          )}
        </div>
      </div>
      {convsLoading ? (
        <ConversationRowSkeleton rows={3} />
      ) : conversations.length > 0 ? (
        <_ConversationsTable
          conversations={conversations}
          expandedConv={expandedConv}
          messagesCache={messagesCache}
          loadingMessages={loadingMessages}
          visibleColumns={visibleCols}
          allColumns={allColumns}
          onToggle={onToggleConversation}
          renderCell={renderCell}
        />
      ) : (
        <_ConversationsEmptyState />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Keys Tab Content Component
// ---------------------------------------------------------------------------

interface KeysTabProps {
  showCreateKey: boolean;
  newKeyName: string;
  apiKeys: ProjectDetail["api_keys"];
  onCreateKey: () => void;
  onChangeKeyName: (value: string) => void;
  onShowCreateKey: () => void;
  onCancelCreateKey: () => void;
  onRevokeKey: (keyId: string) => void;
}

function _KeysTab({
  showCreateKey,
  newKeyName,
  apiKeys,
  onCreateKey,
  onChangeKeyName,
  onShowCreateKey,
  onCancelCreateKey,
  onRevokeKey,
}: KeysTabProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Manage API keys for this project.</p>
        <Button size="sm" variant="outline" onClick={onShowCreateKey}>
          <PlusIcon className="h-4 w-4 mr-1.5" />
          New Key
        </Button>
      </div>
      {showCreateKey && (
        <_CreateKeyForm
          value={newKeyName}
          onChange={onChangeKeyName}
          onSubmit={onCreateKey}
          onCancel={onCancelCreateKey}
        />
      )}
      <div className="border border-border rounded-lg overflow-hidden">
        <_ApiKeysTable keys={apiKeys} onRevoke={onRevokeKey} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Settings Tab Content Component
// ---------------------------------------------------------------------------

interface SettingsTabProps {
  project: ProjectDetail;
  deleteConfirmSlug: string;
  deleting: boolean;
  onDeleteConfirm: (slug: string) => void;
  onDelete: () => void;
}

function _ProjectSettings({
  project,
  deleteConfirmSlug,
  deleting,
  onDeleteConfirm,
  onDelete,
}: SettingsTabProps) {
  return (
    <div className="space-y-6">
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
          Permanently delete this project and all its data including conversations, messages, and
          API keys.
        </p>
        <AlertDialog onOpenChange={(open) => !open && onDeleteConfirm("")}>
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
              <label htmlFor="delete-confirm" className="text-sm text-muted-foreground mb-2 block">
                Type <code className="font-mono font-semibold text-foreground">{project.slug}</code>{" "}
                to confirm
              </label>
              <Input
                id="delete-confirm"
                placeholder={project.slug}
                value={deleteConfirmSlug}
                onChange={(e) => onDeleteConfirm(e.target.value)}
                className="font-mono"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                disabled={deleteConfirmSlug !== project.slug || deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? "Deleting..." : "Delete project"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function ProjectContent() {
  const params = useSearchParams();
  const slug = params.get("slug");
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(false);
  const [expandedConv, setExpandedConv] = useState<string | null>(null);
  const [messagesCache, setMessagesCache] = useState<Record<string, Message[]>>({});
  const [loadingMessages, setLoadingMessages] = useState<Record<string, boolean>>({});
  const [visibleCols, setVisibleCols] = useState<ColumnKey[]>(DEFAULT_COLUMNS);
  const [showColPicker, setShowColPicker] = useState(false);
  const { copied, copy } = useCopiedText();

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

  const handleCreateKey = useCallback(async () => {
    if (!newKeyName.trim() || !project) return;
    const res = await api<{ id: string; key: string }>(`/v1/projects/${project.id}/keys`, {
      method: "POST",
      body: JSON.stringify({ name: newKeyName.trim() }),
    });
    setCreatedKey(res.key);
    setShowCreateKey(false);
    setNewKeyName("");
    setProject(await api<ProjectDetail>(`/v1/projects/by-slug/${slug}`));
  }, [newKeyName, project, slug]);

  const handleRevokeKey = useCallback(
    async (keyId: string) => {
      if (!project) return;
      await api(`/v1/projects/${project.id}/keys/${keyId}`, { method: "DELETE" });
      setProject(await api<ProjectDetail>(`/v1/projects/by-slug/${slug}`));
    },
    [project, slug],
  );

  const toggleConversation = useCallback(
    async (convId: string) => {
      if (expandedConv === convId) {
        setExpandedConv(null);
        return;
      }
      setExpandedConv(convId);
      if (!messagesCache[convId] && project) {
        setLoadingMessages((prev) => ({ ...prev, [convId]: true }));
        try {
          const res = await api<{ data: Message[] }>(
            `/v1/projects/${project.id}/conversations/${convId}/messages`,
          );
          setMessagesCache((prev) => ({ ...prev, [convId]: res.data }));
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Failed to load messages");
        } finally {
          setLoadingMessages((prev) => ({ ...prev, [convId]: false }));
        }
      }
    },
    [expandedConv, messagesCache, project],
  );

  const handleDeleteProject = useCallback(async () => {
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
  }, [project, deleteConfirmSlug, router]);

  // Memoized computed values
  const activeKeys = useMemo(
    () => project?.api_keys.filter((k) => !k.revoked_at) ?? [],
    [project?.api_keys],
  );
  const totalConvs = conversations.length;
  const totalMessages = useMemo(
    () => conversations.reduce((s, c) => s + c.message_count, 0),
    [conversations],
  );
  const totalTokens = useMemo(
    () => conversations.reduce((s, c) => s + c.token_count, 0),
    [conversations],
  );

  const renderCell = useCallback((conv: Conversation, col: ColumnKey) => {
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
  }, []);

  // Early returns after all hooks
  if (loading)
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <StatsCardsSkeleton count={4} />
        <div className="space-y-3">
          <div className="h-10 bg-muted/60 rounded w-48 animate-pulse" />
          <ChartCardSkeleton height="h-64" />
        </div>
      </div>
    );
  if (!project) return <p className="text-muted-foreground">Project not found.</p>;

  return (
    <div>
      <_PageHeader name={project.name} slug={project.slug} />

      {createdKey && <_CreatedKeyDisplay apiKey={createdKey} copied={copied} onCopy={copy} />}

      <_StatsGrid
        totalConversations={totalConvs}
        totalMessages={totalMessages}
        totalTokens={totalTokens}
        activeKeyCount={activeKeys.length}
      />

      <Tabs defaultValue={createdKey ? "keys" : "data"}>
        <TabsList variant="line" className="mb-6 gap-0 border-b border-border pb-px">
          <_TabTrigger value="data" icon={MessageSquareIcon} label="Data" count={totalConvs} />
          <_TabTrigger value="keys" icon={KeyIcon} label="API Keys" count={activeKeys.length} />
          <_TabTrigger value="settings" icon={Settings2Icon} label="Settings" />
        </TabsList>

        <TabsContent value="settings">
          <_ProjectSettings
            project={project}
            deleteConfirmSlug={deleteConfirmSlug}
            deleting={deleting}
            onDeleteConfirm={setDeleteConfirmSlug}
            onDelete={handleDeleteProject}
          />
        </TabsContent>

        <TabsContent value="keys">
          <_KeysTab
            showCreateKey={showCreateKey}
            newKeyName={newKeyName}
            apiKeys={project.api_keys}
            onCreateKey={handleCreateKey}
            onChangeKeyName={setNewKeyName}
            onShowCreateKey={() => setShowCreateKey(true)}
            onCancelCreateKey={() => setShowCreateKey(false)}
            onRevokeKey={handleRevokeKey}
          />
        </TabsContent>

        <TabsContent value="data">
          <_DataTab
            totalConvs={totalConvs}
            convsLoading={convsLoading}
            conversations={conversations}
            expandedConv={expandedConv}
            messagesCache={messagesCache}
            loadingMessages={loadingMessages}
            visibleCols={visibleCols}
            showColPicker={showColPicker}
            allColumns={ALL_COLUMNS}
            onToggleConversation={toggleConversation}
            onToggleColPicker={() => setShowColPicker(!showColPicker)}
            onChangeColumns={setVisibleCols}
            renderCell={renderCell}
          />
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
