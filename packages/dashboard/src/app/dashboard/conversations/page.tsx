"use client";

import { ChevronDownIcon, ChevronRightIcon, MessageSquareIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Project {
  id: string;
  name: string;
  slug: string;
}

interface Conversation {
  id: string;
  project_id: string;
  title: string | null;
  message_count: number;
  token_count: number;
  created_at: number;
  updated_at: number;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  token_count: number;
  created_at: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Role badge
// ---------------------------------------------------------------------------

const ROLE_STYLES: Record<string, string> = {
  user: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  assistant: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  system: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  tool: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};

function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_STYLES[role] ?? ROLE_STYLES.system;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide shrink-0 ${cls}`}
    >
      {role}
    </span>
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
        <tr key={Math.random()} className="border-b border-border animate-pulse">
          <td className="px-4 py-3">
            <div className="h-3.5 bg-muted rounded w-40" />
          </td>
          <td className="px-4 py-3 hidden sm:table-cell">
            <div className="h-3 bg-muted rounded w-8" />
          </td>
          <td className="px-4 py-3 hidden sm:table-cell">
            <div className="h-3 bg-muted rounded w-12" />
          </td>
          <td className="px-4 py-3 hidden md:table-cell">
            <div className="h-3 bg-muted rounded w-20" />
          </td>
          <td className="px-4 py-3 hidden md:table-cell">
            <div className="h-3 bg-muted rounded w-20" />
          </td>
        </tr>
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
      <tr
        className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={toggle}
      >
        <td className="px-4 py-3">
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
        </td>
        <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
          {conv.message_count.toLocaleString()}
        </td>
        <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">
          {conv.token_count.toLocaleString()}
        </td>
        <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
          {formatDateShort(conv.created_at)}
        </td>
        <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
          {formatDateShort(conv.updated_at)}
        </td>
      </tr>

      {open && (
        <tr className="border-b border-border bg-muted/10">
          <td colSpan={5} className="px-6 py-3">
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
          </td>
        </tr>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ConversationsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Fetch projects on mount
  useEffect(() => {
    setLoadingProjects(true);
    api<{ data: Project[] }>("/v1/projects")
      .then((res) => {
        setProjects(res.data);
        if (res.data.length > 0) {
          setSelectedProjectId(res.data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProjects(false));
  }, []);

  // Fetch conversations when selected project changes
  useEffect(() => {
    if (!selectedProjectId) return;
    setLoadingConversations(true);
    setConversations([]);
    api<{ data: Conversation[] }>(`/v1/projects/${selectedProjectId}/conversations`)
      .then((res) => setConversations(res.data))
      .catch(() => {})
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
            <select
              id="project-select"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="text-xs h-8 px-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Loading projects */}
      {loadingProjects && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                  Title
                </th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden sm:table-cell">
                  Messages
                </th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden sm:table-cell">
                  Tokens
                </th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden md:table-cell">
                  Created
                </th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden md:table-cell">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              <SkeletonRows />
            </tbody>
          </table>
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
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
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
                </th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden sm:table-cell">
                  Messages
                </th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden sm:table-cell">
                  Tokens
                </th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden md:table-cell">
                  Created
                </th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden md:table-cell">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {loadingConversations && <SkeletonRows />}

              {!loadingConversations &&
                conversations.map((conv) => <ConversationRow key={conv.id} conv={conv} />)}

              {!loadingConversations && conversations.length === 0 && (
                <tr>
                  <td colSpan={5}>
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
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
