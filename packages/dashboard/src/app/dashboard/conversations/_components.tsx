import type { ConversationResponse, MessageResponse, ProjectResponse } from "@agentstate/shared";
import { ChevronDownIcon, ChevronRightIcon, MessageSquareIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type Column, DataTable, DataTableLoadMore } from "@/components/dashboard/data-table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { MessageListSkeleton } from "@/components/dashboard/loading-states";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { ROLE_BADGE_VARIANTS } from "@/lib/constants";
import { formatDate, formatDateShort } from "@/lib/format";

type Conversation = ConversationResponse & { project_id: string };
type Message = MessageResponse;

// ---------------------------------------------------------------------------
// Role badge
// ---------------------------------------------------------------------------

export function RoleBadge({ role }: { role: string }) {
  const variant = ROLE_BADGE_VARIANTS[role] ?? ROLE_BADGE_VARIANTS.system;
  return (
    <Badge variant={variant} className="text-[10px] font-semibold uppercase tracking-wide">
      {role}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Message row with "show more"
// ---------------------------------------------------------------------------

export function MessageRow({ msg }: { msg: Message }) {
  const [expanded, setExpanded] = useState(false);
  const limit = 200;
  const truncated = msg.content.length > limit;
  const displayed = expanded || !truncated ? msg.content : `${msg.content.slice(0, limit)}…`;

  return (
    <div className="flex gap-3 py-2.5 border-b last:border-b-0 border-border/50">
      <div className="pt-0.5">
        <RoleBadge role={msg.role} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground whitespace-pre-wrap break-words leading-relaxed">
          {displayed}
        </p>
        {truncated && (
          <button
            type="button"
            className="mt-1 text-[11px] text-primary hover:underline"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? "Show less of this message" : "Show more of this message"}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
      <span className="text-[11px] text-muted-foreground shrink-0 pt-0.5">
        {formatDate(msg.created_at)}
      </span>
    </div>
  );
}

// Skeleton rows removed — use DataTable's built-in loading state

// Messages expansion panel

interface MessagesPanelProps {
  projectId: string;
  conversationId: string;
}

function MessagesPanel({ projectId, conversationId }: MessagesPanelProps) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api<{ data: Message[] }>(
          `/v1/projects/${projectId}/conversations/${conversationId}/messages`,
        );
        setMessages(res.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load messages");
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId, conversationId]);

  return (
    <section aria-live="polite" aria-busy={loading}>
      {loading && <MessageListSkeleton lines={3} />}
      {error && (
        <p className="text-xs text-red-500 py-2" role="alert">
          {error}
        </p>
      )}
      {messages !== null && messages.length === 0 && (
        <p className="text-xs text-muted-foreground py-2 italic">
          No messages in this conversation.
        </p>
      )}
      {messages !== null && messages.length > 0 && (
        <div>
          {messages.map((m) => (
            <MessageRow key={m.id} msg={m} />
          ))}
        </div>
      )}
    </section>
  );
}

// Conversation row (accordion)

export function ConversationRow({ conv }: { conv: Conversation }) {
  const [open, setOpen] = useState(false);
  const title = conv.title ?? "Untitled";
  const Chevron = open ? ChevronDownIcon : ChevronRightIcon;

  return (
    <>
      <TableRow
        className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        onClick={() => setOpen((v) => !v)}
        tabIndex={0}
        role="button"
        aria-expanded={open}
        aria-controls={`messages-${conv.id}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        <TableCell>
          <div className="flex items-center gap-2">
            <Chevron className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground truncate max-w-[200px] sm:max-w-xs">
              {title}
            </span>
          </div>
        </TableCell>
        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
          {conv.message_count.toLocaleString()}
        </TableCell>
        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
          {conv.token_count.toLocaleString()}
        </TableCell>
        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
          {formatDateShort(conv.created_at)}
        </TableCell>
        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
          {formatDateShort(conv.updated_at)}
        </TableCell>
      </TableRow>

      {open && (
        <TableRow className="bg-muted/10" id={`messages-${conv.id}`}>
          <TableCell colSpan={5} className="px-6 py-3">
            <MessagesPanel projectId={conv.project_id} conversationId={conv.id} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// Sub-components

export interface _ProjectSelectorProps {
  projects: ProjectResponse[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
}

export function _ProjectSelector({
  projects,
  selectedProjectId,
  onSelectProject,
}: _ProjectSelectorProps) {
  if (projects.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="project-select" className="text-xs text-muted-foreground shrink-0">
        Project
      </label>
      <Select value={selectedProjectId} onValueChange={(v) => onSelectProject(v ?? "")}>
        <SelectTrigger id="project-select" size="sm" className="w-[180px]">
          <SelectValue placeholder="Select project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export interface _EmptyProjectsProps {
  onCreateProject: () => void;
}

export function _EmptyProjects({ onCreateProject }: _EmptyProjectsProps) {
  return (
    <EmptyState
      icon={<MessageSquareIcon className="h-6 w-6 text-muted-foreground" />}
      title="No projects yet"
      description="Create a project first, then conversations will appear here."
      action={{
        label: "Create your first project",
        onClick: onCreateProject,
      }}
    />
  );
}

// Table columns helper

function getConversationsColumns(
  selectedProject: ProjectResponse | undefined,
): Column<Conversation>[] {
  return [
    {
      key: "title",
      label: selectedProject ? (
        <span>
          Title
          <span className="ml-1.5 text-muted-foreground/60 font-normal">
            — {selectedProject.name}
          </span>
        </span>
      ) : (
        "Title"
      ),
    },
    { key: "messages", label: "Messages", className: "hidden sm:table-cell" },
    { key: "tokens", label: "Tokens", className: "hidden sm:table-cell" },
    { key: "created", label: "Created", className: "hidden md:table-cell" },
    { key: "updated", label: "Updated", className: "hidden md:table-cell" },
  ];
}

const CONVERSATIONS_EMPTY_STATE = {
  icon: <MessageSquareIcon className="h-6 w-6 text-muted-foreground" />,
  title: "No conversations yet",
  description: "Conversations will appear here once your agents start logging to this project.",
} as const;

// Conversations table

export interface _ConversationsTableProps {
  selectedProject: ProjectResponse | undefined;
  loading: boolean;
  conversations: Conversation[];
}

export function _ConversationsTable({
  selectedProject,
  loading,
  conversations,
}: _ConversationsTableProps) {
  return (
    <DataTable
      data={conversations}
      columns={getConversationsColumns(selectedProject)}
      loading={loading}
      loadingRows={5}
      empty={CONVERSATIONS_EMPTY_STATE}
      rowKey={(conv) => conv.id}
      renderRow={(conv) => <ConversationRow key={conv.id} conv={conv} />}
    />
  );
}

// Re-export for convenience
export const _LoadMoreButton = DataTableLoadMore;
