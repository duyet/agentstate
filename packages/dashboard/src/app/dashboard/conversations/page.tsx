"use client";

import type { ConversationResponse, ProjectResponse } from "@agentstate/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { api } from "@/lib/api";
import {
  _ConversationsTable,
  _EmptyProjects,
  _LoadingTable,
  _LoadMoreButton,
  _ProjectSelector,
} from "./_components";

type Conversation = ConversationResponse & { project_id: string };

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
  const loadMore = useCallback(() => {
    if (!selectedProjectId || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const lastConv = conversations[conversations.length - 1];
    const cursor = lastConv?.updated_at?.toString();

    api<{ data: Conversation[] }>(
      `/v1/projects/${selectedProjectId}/conversations?limit=50&cursor=${cursor}`,
    )
      .then((res) => {
        setConversations((prev) => [...prev, ...res.data]);
        setHasMore(res.data.length >= 50);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load more"))
      .finally(() => setIsLoadingMore(false));
  }, [selectedProjectId, isLoadingMore, hasMore, conversations]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const handleCreateProject = useCallback(() => router.push("/dashboard"), [router]);
  const handleSelectProject = useCallback((id: string) => setSelectedProjectId(id), []);

  return (
    <div>
      <PageHeader
        title="Conversations"
        description="Browse conversation history across all projects."
        actions={
          <_ProjectSelector
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={handleSelectProject}
          />
        }
      />

      {loadingProjects && (
        <_LoadingTable
          columns={[
            { key: "title", label: "Title" },
            { key: "messages", label: "Messages", className: "hidden sm:table-cell" },
            { key: "tokens", label: "Tokens", className: "hidden sm:table-cell" },
            { key: "created", label: "Created", className: "hidden md:table-cell" },
            { key: "updated", label: "Updated", className: "hidden md:table-cell" },
          ]}
        />
      )}

      {!loadingProjects && projects.length === 0 && (
        <_EmptyProjects onCreateProject={handleCreateProject} />
      )}

      {!loadingProjects && projects.length > 0 && (
        <>
          <_ConversationsTable
            selectedProject={selectedProject}
            loading={loadingConversations}
            conversations={conversations}
          />
          <_LoadMoreButton
            hasMore={hasMore && conversations.length > 0}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadMore}
          />
        </>
      )}
    </div>
  );
}
