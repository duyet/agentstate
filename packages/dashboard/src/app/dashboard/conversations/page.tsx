"use client";

import type { ConversationResponse, MessageResponse, ProjectResponse } from "@agentstate/shared";
import { ChevronDownIcon, ChevronRightIcon, MessageSquareIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/dashboard/empty-state";
import { MessageListSkeleton, TableSkeleton } from "@/components/dashboard/loading-states";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

function SkeletonRows() {
  return <TableSkeleton rows={5} columns={5} />;
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
      <TableRow
        className="cursor-pointer"
        onClick={toggle}
        tabIndex={0}
        role="button"
        aria-label={`Toggle ${title}`}
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
            {loading && <MessageListSkeleton lines={3} />}
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
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

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
    setHasMore(true);
    api<{ data: Conversation[] }>(`/v1/projects/${selectedProjectId}/conversations?limit=50`)
      .then((res) => {
        setConversations(res.data);
        setHasMore(res.data.length >= 50); // If we got 50, there might be more
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load data"))
      .finally(() => setLoadingConversations(false));
  }, [selectedProjectId]);

  // Load more conversations
  function loadMore() {
    if (!selectedProjectId || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const lastConv = conversations[conversations.length - 1];
    const cursor = lastConv?.created_at?.toString();

    api<{ data: Conversation[] }>(
      `/v1/projects/${selectedProjectId}/conversations?limit=50&cursor=${cursor}`,
    )
      .then((res) => {
        setConversations((prev) => [...prev, ...res.data]);
        setHasMore(res.data.length >= 50);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load more"))
      .finally(() => setIsLoadingMore(false));
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <div>
      {/* Header */}
      <PageHeader
        title="Conversations"
        description="Browse conversation history across all projects."
        actions={
          projects.length > 1 ? (
            <div className="flex items-center gap-2">
              <label htmlFor="project-select" className="text-xs text-muted-foreground shrink-0">
                Project
              </label>
              <Select
                value={selectedProjectId}
                onValueChange={(v) => setSelectedProjectId(v ?? "")}
              >
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
          ) : undefined
        }
      />

      {/* Loading projects */}
      {loadingProjects && (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 py-3">Title</TableHead>
                <TableHead className="hidden sm:table-cell px-4 py-3">Messages</TableHead>
                <TableHead className="hidden sm:table-cell px-4 py-3">Tokens</TableHead>
                <TableHead className="hidden md:table-cell px-4 py-3">Created</TableHead>
                <TableHead className="hidden md:table-cell px-4 py-3">Updated</TableHead>
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
        <Card className="p-12 border-dashed">
          <EmptyState
            icon={<MessageSquareIcon className="h-6 w-6 text-muted-foreground" />}
            title="No projects yet"
            description="Create a project first, then conversations will appear here."
            action={{
              label: "Create your first project",
              onClick: () => router.push("/dashboard"),
            }}
          />
        </Card>
      )}

      {/* Conversations table */}
      {!loadingProjects && projects.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 py-3">
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
                <TableHead className="hidden sm:table-cell px-4 py-3">Messages</TableHead>
                <TableHead className="hidden sm:table-cell px-4 py-3">Tokens</TableHead>
                <TableHead className="hidden md:table-cell px-4 py-3">Created</TableHead>
                <TableHead className="hidden md:table-cell px-4 py-3">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingConversations && <SkeletonRows />}

              {!loadingConversations &&
                conversations.map((conv) => <ConversationRow key={conv.id} conv={conv} />)}

              {!loadingConversations && conversations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState
                      icon={<MessageSquareIcon className="h-6 w-6 text-muted-foreground" />}
                      title="No conversations yet"
                      description="Conversations will appear here once your agents start logging to this project."
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Load more button */}
      {!loadingProjects &&
        projects.length > 0 &&
        !loadingConversations &&
        conversations.length > 0 &&
        hasMore && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" size="sm" onClick={loadMore} disabled={isLoadingMore}>
              {isLoadingMore ? "Loading..." : "Load more"}
            </Button>
          </div>
        )}
    </div>
  );
}
