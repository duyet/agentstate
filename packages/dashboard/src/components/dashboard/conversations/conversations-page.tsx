import { useCallback } from "react";
import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { _ConversationsTable, _EmptyProjects, _ProjectSelector } from "./_components";
import { useConversationsData, useConversationsPagination } from "./_hooks";

function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-[22px] flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex max-w-2xl flex-col gap-1.5">
        <h1 className="text-[26px] tracking-tight text-fg">{title}</h1>
        <p className="text-[14.5px] leading-6 text-fg-3">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </header>
  );
}

function ConversationsContent() {
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
  } = useConversationsData();

  const { isLoadingMore, loadMore } = useConversationsPagination(
    selectedProjectId,
    conversations,
    appendConversations,
    setHasMore,
    hasMore,
  );

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const handleCreateProject = useCallback(() => {
    window.location.assign("/dashboard");
  }, []);
  const handleSelectProject = useCallback(
    (id: string) => setSelectedProjectId(id),
    [setSelectedProjectId],
  );

  const showLoadMore = hasMore && conversations.length > 0;

  return (
    <div className="px-4 lg:px-6">
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
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton cards
            <div
              key={i}
              className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-edge bg-panel p-4"
            >
              <div className="size-10 shrink-0 animate-pulse rounded-[var(--radius)] bg-edge" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-4 w-32 animate-pulse rounded bg-edge" />
                <div className="h-3 w-24 animate-pulse rounded bg-edge" />
              </div>
            </div>
          ))}
        </div>
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
          {showLoadMore && (
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" disabled={isLoadingMore} onClick={loadMore}>
                {isLoadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * ConversationsPage — client:only island for /dashboard/conversations.
 * Wraps content in Providers (Clerk) + AppShell (sidebar/topbar + auth gate).
 */
export function ConversationsPage() {
  return (
    <Providers>
      <AppShell>
        <ConversationsContent />
      </AppShell>
    </Providers>
  );
}
