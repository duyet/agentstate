"use client";

import type {
  ConversationResponse,
  MessageResponse,
  ProjectDetailResponse,
} from "@agentstate/shared";
import type { LucideIcon } from "lucide-react";
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
import { DataTable } from "@/components/dashboard/data-table";
import { InlineForm } from "@/components/dashboard/inline-form";
import {
  ConversationRowSkeleton,
  MessageListSkeleton,
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
import { TableCell, TableRow } from "@/components/ui/table";
import { ROLE_BADGE_VARIANTS } from "@/lib/constants";

type ProjectDetail = ProjectDetailResponse;
type Conversation = ConversationResponse;
type Message = MessageResponse;

export type ColumnKey =
  | "title"
  | "external_id"
  | "message_count"
  | "token_count"
  | "metadata"
  | "created_at"
  | "updated_at";

export const CONVERSATION_COLUMNS: readonly { key: ColumnKey; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "external_id", label: "External ID" },
  { key: "message_count", label: "Messages" },
  { key: "token_count", label: "Tokens" },
  { key: "metadata", label: "Metadata" },
  { key: "created_at", label: "Created" },
  { key: "updated_at", label: "Updated" },
] as const;

export function renderConversationCell(conv: Conversation, col: ColumnKey): React.ReactNode {
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

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
}

export function _StatCard({ icon: Icon, label, value }: StatCardProps) {
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

interface CreatedKeyDisplayProps {
  apiKey: string;
  copied: boolean;
  onCopy: (text: string) => void;
}

export function _CreatedKeyDisplay({ apiKey, copied, onCopy }: CreatedKeyDisplayProps) {
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

interface ApiKeysTableProps {
  keys: ProjectDetail["api_keys"];
  onRevoke: (keyId: string) => void;
}

export function _ApiKeysTable({ keys, onRevoke }: ApiKeysTableProps) {
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

interface ColumnPickerProps {
  allColumns: readonly { key: ColumnKey; label: string }[];
  visible: ColumnKey[];
  onChange: (columns: ColumnKey[]) => void;
}

export function _ColumnPicker({ allColumns, visible, onChange }: ColumnPickerProps) {
  const toggleCol = (key: ColumnKey) =>
    onChange(visible.includes(key) ? visible.filter((c) => c !== key) : [...visible, key]);

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
            onChange={() => toggleCol(col.key)}
            className="rounded"
          />
          <span className="flex-1">{col.label}</span>
        </label>
      ))}
    </div>
  );
}

interface ConversationMessageProps {
  message: Message;
}

export function ConversationMessage({ message }: ConversationMessageProps) {
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

interface ConversationRowProps {
  conversation: Conversation;
  isExpanded: boolean;
  messages?: Message[];
  isLoading: boolean;
  visibleColumns: ColumnKey[];
  allColumns: readonly { key: ColumnKey; label: string }[];
  onToggle: () => void;
}

export function _ConversationRow({
  conversation,
  isExpanded,
  messages,
  isLoading,
  visibleColumns,
  allColumns,
  onToggle,
}: ConversationRowProps) {
  return (
    <TableRow>
      <TableCell colSpan={visibleColumns.length + 1} className="p-0">
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
                {renderConversationCell(conversation, col.key)}
              </div>
            ))}
        </button>
        {isExpanded && (
          <section
            className="bg-muted/10 border-b border-border px-6 py-5"
            aria-label="Conversation messages"
          >
            {isLoading ? (
              <MessageListSkeleton lines={2} />
            ) : messages?.length ? (
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {messages.map((msg) => (
                  <ConversationMessage key={msg.id} message={msg} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No messages</p>
            )}
          </section>
        )}
      </TableCell>
    </TableRow>
  );
}

export function _ConversationsEmptyState() {
  return (
    <Card className="border-dashed">
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted/60 mb-3">
          <MessageSquareIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">No conversations yet</p>
        <p className="text-xs text-muted-foreground max-w-xs mb-3">
          Use your API key to start storing conversations.
        </p>
        <span className="text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
          POST /api/v1/conversations
        </span>
      </div>
    </Card>
  );
}

interface PageHeaderProps {
  name: string;
  slug: string;
}

export function _PageHeader({ name, slug }: PageHeaderProps) {
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

interface StatsGridProps {
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
  activeKeyCount: number;
}

export function _StatsGrid({
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

interface TabTriggerProps {
  value: string;
  icon: LucideIcon;
  label: string;
  count?: number;
}

export function _TabTrigger({ value, icon: Icon, label, count }: TabTriggerProps) {
  return (
    <button
      type="button"
      className="px-5 py-2.5 text-sm inline-flex items-center gap-1.5 data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground text-muted-foreground transition-colors"
      data-value={value}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count !== undefined && (
        <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">{count}</span>
      )}
    </button>
  );
}

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
}

export function _DataTab({
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
}: DataTabProps) {
  const columns = [
    { key: "expand", label: "" },
    ...allColumns
      .filter((c) => visibleCols.includes(c.key))
      .map((col) => ({ key: col.key, label: col.label })),
  ];

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
        <DataTable
          data={conversations}
          columns={columns}
          rowKey={(conv) => conv.id}
          renderRow={(conv) => (
            <_ConversationRow
              key={conv.id}
              conversation={conv}
              isExpanded={expandedConv === conv.id}
              messages={messagesCache[conv.id]}
              isLoading={loadingMessages[conv.id] || false}
              visibleColumns={visibleCols}
              allColumns={allColumns}
              onToggle={() => onToggleConversation(conv.id)}
            />
          )}
        />
      ) : (
        <_ConversationsEmptyState />
      )}
    </>
  );
}

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

export function _KeysTab({
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
        <InlineForm
          value={newKeyName}
          onChange={onChangeKeyName}
          onSubmit={onCreateKey}
          onCancel={onCancelCreateKey}
          placeholder="e.g. Production"
          label="Key name"
          submitLabel="Create"
          inputId="key-name"
        />
      )}
      <div className="border border-border rounded-lg overflow-hidden">
        <_ApiKeysTable keys={apiKeys} onRevoke={onRevokeKey} />
      </div>
    </>
  );
}

export function _QuickStartCode() {
  return (
    <div>
      <h3 className="font-medium mb-3">Quick start</h3>
      <pre className="font-mono text-sm bg-card border border-border rounded-lg p-5 overflow-x-auto text-muted-foreground leading-relaxed">
        {`curl -X POST https://agentstate.app/api/v1/conversations \\
  -H "Authorization: Bearer <your-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'`}
      </pre>
    </div>
  );
}

interface ProjectDetailsProps {
  project: ProjectDetail;
}

export function _ProjectDetails({ project }: ProjectDetailsProps) {
  return (
    <div>
      <h3 className="font-medium mb-2">Project details</h3>
      <div className="text-sm text-muted-foreground space-y-1.5">
        <p>
          ID: <code className="font-mono text-foreground/70">{project.id}</code>
        </p>
        <p>Created: {new Date(project.created_at).toLocaleString()}</p>
        <p>
          Base URL: <code className="font-mono text-foreground/70">https://agentstate.app/api</code>
        </p>
      </div>
    </div>
  );
}

interface DeleteConfirmationProps {
  projectName: string;
  projectSlug: string;
  confirmSlug: string;
  deleting: boolean;
  onConfirmChange: (slug: string) => void;
  onDelete: () => void;
}

export function _DeleteConfirmation({
  projectName,
  projectSlug,
  confirmSlug,
  deleting,
  onConfirmChange,
  onDelete,
}: DeleteConfirmationProps) {
  return (
    <div className="border border-red-200 dark:border-red-900/50 rounded-lg p-5">
      <h3 className="font-medium text-red-600 dark:text-red-400 mb-2">Danger zone</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Permanently delete this project and all its data including conversations, messages, and API
        keys.
      </p>
      <AlertDialog onOpenChange={(open) => !open && onConfirmChange("")}>
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
            <AlertDialogTitle>Delete {projectName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project and all
              associated conversations, messages, and API keys.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <label htmlFor="delete-confirm" className="text-sm text-muted-foreground mb-2 block">
              Type <code className="font-mono font-semibold text-foreground">{projectSlug}</code> to
              confirm
            </label>
            <Input
              id="delete-confirm"
              placeholder={projectSlug}
              value={confirmSlug}
              onChange={(e) => onConfirmChange(e.target.value)}
              className="font-mono"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              disabled={confirmSlug !== projectSlug || deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Deleting..." : "Delete project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface SettingsTabProps {
  project: ProjectDetail;
  deleteConfirmSlug: string;
  deleting: boolean;
  onDeleteConfirm: (slug: string) => void;
  onDelete: () => void;
}

export function _ProjectSettings({
  project,
  deleteConfirmSlug,
  deleting,
  onDeleteConfirm,
  onDelete,
}: SettingsTabProps) {
  return (
    <div className="space-y-6">
      <_QuickStartCode />
      <_ProjectDetails project={project} />
      <_DeleteConfirmation
        projectName={project.name}
        projectSlug={project.slug}
        confirmSlug={deleteConfirmSlug}
        deleting={deleting}
        onConfirmChange={onDeleteConfirm}
        onDelete={onDelete}
      />
    </div>
  );
}
