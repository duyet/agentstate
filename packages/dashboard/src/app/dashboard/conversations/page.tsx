"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { CardListSkeleton } from "@/components/dashboard/loading-states";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  _ConversationsTable,
  _EmptyProjects,
  _LoadMoreButton,
  _ProjectSelector,
} from "./_components";
import { _useConversationsData, _useConversationsPagination } from "./_hooks";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ConversationsPage() {
  const router = useRouter();

  const {
    projects,
    selectedProjectId,
    conversations,
    loadingProjects,
    loadingConversations,
    hasMore,
    setSelectedProjectId,
    appendConversations,
    setHasMore,
  } = _useConversationsData();

  const { isLoadingMore, loadMore } = _useConversationsPagination(
    selectedProjectId,
    conversations,
    appendConversations,
    setHasMore,
    hasMore,
  );

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const handleCreateProject = useCallback(() => router.push("/dashboard"), [router]);
  const handleSelectProject = useCallback(
    (id: string) => setSelectedProjectId(id),
    [setSelectedProjectId],
  );

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

      {loadingProjects && <CardListSkeleton count={3} />}

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
            hasNext={hasMore && conversations.length > 0}
            loading={isLoadingMore}
            onLoadMore={loadMore}
          />
        </>
      )}
    </div>
  );
}
