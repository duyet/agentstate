"use client";

import type { ConversationResponse, MessageResponse, ProjectResponse } from "@agentstate/shared";
import { ChevronDownIcon, ChevronRightIcon, MessageSquareIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { ROLE_BADGE_VARIANTS } from "@/lib/constants";
import { formatDate, formatDateShort } from "@/lib/format";

type Conversation = ConversationResponse & { project_id: string };
type Message = MessageResponse;

// ---------------------------------------------------------------------------
// Role badge
// ---------------------------------------------------------------------------

function RoleBadge({ role }: { role: string }) {
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

function MessageRow({ msg }: { msg: Message }) {
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

// ---------------------------------------------------------------------------
// Skeleton rows
// ---------------------------------------------------------------------------

function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, _i) => (
        <TableRow key={Math.random()} className="animate-pulse">
          <TableCell>
            <div className="h-3.5 bg-muted rounded w-40" />
          </TableCell>
          <TableCell className="hidden sm:table-cell">
            <div className="h-3 bg-muted rounded w-8" />
          </TableCell>
          <TableCell className="hidden sm:table-cell">
            <div className="h-3 bg-muted rounded w-12" />
          </TableCell>
          <TableCell className="hidden md:table-cell">
            <div className="h-3 bg-muted rounded w-20" />
          </TableCell>
          <TableCell className="hidden md:table-cell">
            <div className="h-3 bg-muted rounded w-20" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Conversation row (accordion)
// ---------------------------------------------------------------------------

function ConversationRow({ conv }: { conv: Conversation }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (messages !== null) return; // already fetched

    setLoading(true);
    setError(null);
    try {
      const res = await api<{ data: Message[] }>(
        `/v1/projects/${conv.project_id}/conversations/${conv.id}/messages`,
      );
      setMessages(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }

  const title = conv.title ?? "Untitled";

  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: <tr> cannot be a <button> */}
      <TableRow
        className="cursor-pointer"
        onClick={toggle}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
      >
        <TableCell>
          <div className="flex items-center gap-2">
            {open ? (
              <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRightIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
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
        <TableRow className="bg-muted/10">
          <TableCell colSpan={5} className="px-6 py-3">
            {loading && (
              <div className="space-y-2 py-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-3 bg-muted rounded animate-pulse"
                    style={{ width: `${60 + i * 10}%` }}
                  />
                ))}
              </div>
            )}
            {error && <p className="text-xs text-red-500 py-2">{error}</p>}
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
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ConversationsPage() {
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Fetch projects on mount
  useEffect(() => {
    setLoadingProjects(true);
    api<{ data: ProjectResponse[] }>("/v1/projects")
      .then((res) => {
        setProjects(res.data);
        if (res.data.length > 0) {
          setSelectedProjectId(res.data[0].id);
        }
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load data"))
      .finally(() => setLoadingProjects(false));
  }, []);

  // Fetch conversations when selected project changes
  useEffect(() => {
    if (!selectedProjectId) return;
    setLoadingConversations(true);
    setConversations([]);
    api<{ data: Conversation[] }>(`/v1/projects/${selectedProjectId}/conversations`)
      .then((res) => setConversations(res.data))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load data"))
      .finally(() => setLoadingConversations(false));
  }, [selectedProjectId]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Conversations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse conversation history across all projects.
          </p>
        </div>

        {/* Project selector */}
        {projects.length > 1 && (
          <div className="flex items-center gap-2">
            <label htmlFor="project-select" className="text-xs text-muted-foreground shrink-0">
              Project
            </label>
            <Select value={selectedProjectId} onValueChange={(v) => setSelectedProjectId(v ?? "")}>
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
        )}
      </div>

      {/* Loading projects */}
      {loadingProjects && (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden sm:table-cell">Messages</TableHead>
                <TableHead className="hidden sm:table-cell">Tokens</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead className="hidden md:table-cell">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SkeletonRows />
            </TableBody>
          </Table>
        </div>
      )}

      {/* No projects */}
      {!loadingProjects && projects.length === 0 && (
        <div className="border border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted mb-4">
            <MessageSquareIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-foreground mb-1">No projects yet</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Create a project first, then conversations will appear here.
          </p>
        </div>
      )}

      {/* Conversations table */}
      {!loadingProjects && projects.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {selectedProject ? (
                    <span>
                      Title
                      <span className="ml-1.5 text-muted-foreground/60 font-normal">
                        — {selectedProject.name}
                      </span>
                    </span>
                  ) : (
                    "Title"
                  )}
                </TableHead>
                <TableHead className="hidden sm:table-cell">Messages</TableHead>
                <TableHead className="hidden sm:table-cell">Tokens</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead className="hidden md:table-cell">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingConversations && <SkeletonRows />}

              {!loadingConversations &&
                conversations.map((conv) => <ConversationRow key={conv.id} conv={conv} />)}

              {!loadingConversations && conversations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted mb-4">
                        <MessageSquareIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-foreground mb-1">No conversations yet</p>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        Conversations will appear here once your agents start logging to this
                        project.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
