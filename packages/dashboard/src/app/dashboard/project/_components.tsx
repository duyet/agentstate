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
  CoinsIcon,
  CopyIcon,
  HashIcon,
  KeyIcon,
  MessageSquareIcon,
} from "lucide-react";
import Link from "next/link";
import { DataTable } from "@/components/dashboard/data-table";
import { ConversationRowSkeleton } from "@/components/dashboard/loading-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColumnPicker } from "./_column-picker";
import { CONVERSATION_COLUMNS, ConversationRow } from "./_conversation-row";
import type { ColumnKey } from "./_types";
import { DeleteConfirmation } from "./_delete-confirmation";
import { KeysTab } from "./_keys-tab";

type ProjectDetail = ProjectDetailResponse;
type Conversation = ConversationResponse;
type Message = MessageResponse;

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
            <ColumnPicker
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
            <ConversationRow
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

// Re-export for consumers
export { KeysTab as _KeysTab };
export { CONVERSATION_COLUMNS };
export type { ColumnKey };

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
      <DeleteConfirmation
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
