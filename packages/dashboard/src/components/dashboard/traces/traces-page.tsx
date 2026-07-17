import { useSearchParams } from "next/navigation";
import { Suspense, useCallback } from "react";
import { AppShell } from "@/components/app-shell";
import { _EmptyProjects } from "@/components/dashboard/conversations/_components";
import { PageHeader } from "@/components/dashboard/page-header";
import { useProjectScope } from "@/components/project-scope";
import { Providers } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { TraceDetail } from "./_trace-detail";
import { TracesTable } from "./_traces-table";
import { useTraceDetail, useTracesData } from "./_use-traces-data";

// ---------------------------------------------------------------------------
// Trace content (uses useSearchParams, must be inside Suspense)
// ---------------------------------------------------------------------------

function TracesContent() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  // The active project comes from the sidebar-driven global scope.
  const { projects, selectedProjectId, loadingProjects } = useProjectScope();

  const { traces, loading, hasMore, loadingMore, loadMore } = useTracesData(selectedProjectId);
  const { detail, loadingDetail } = useTraceDetail(selectedProjectId, selectedId);

  const handleCreateProject = useCallback(() => window.location.assign("/dashboard"), []);

  const handleSelect = useCallback(
    (id: string) => {
      const url = new URL(window.location.href);
      if (selectedId === id) {
        url.searchParams.delete("id");
      } else {
        url.searchParams.set("id", id);
      }
      window.history.pushState({}, "", url.toString());
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    [selectedId],
  );

  return (
    <div className="page-wrap">
      <PageHeader title="Traces" description="LLM execution traces and observability." />

      {loadingProjects && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
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
          <TracesTable
            traces={traces}
            loading={loading}
            selectedId={selectedId}
            onSelect={handleSelect}
          />

          {hasMore && (
            <div className="mt-component flex justify-center">
              <Button variant="secondary" disabled={loadingMore} onClick={loadMore}>
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}

          {selectedId && <TraceDetail detail={detail} loadingDetail={loadingDetail} />}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (wraps content in Providers + AppShell + Suspense for useSearchParams)
// ---------------------------------------------------------------------------

export function TracesPage() {
  return (
    <Providers>
      <AppShell>
        <Suspense
          fallback={<div className="h-32 animate-pulse rounded-[var(--radius-lg)] bg-panel2" />}
        >
          <TracesContent />
        </Suspense>
      </AppShell>
    </Providers>
  );
}
