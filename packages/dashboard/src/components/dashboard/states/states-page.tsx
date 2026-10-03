"use client";

import type {
  StateEventResponse,
  StateListResponse,
  StateRecordResponse,
} from "@agentstate/shared";
import { Database } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { ScopedKeyGate } from "@/components/dashboard/_scoped-key-gate";
import { PageHeader } from "@/components/dashboard/page-header";
import { StateDetail } from "@/components/dashboard/states/_state-detail";
import { StatesTable } from "@/components/dashboard/states/_states-table";
import {
  UpsertStateForm,
  type UpsertStateInput,
} from "@/components/dashboard/states/_upsert-state-form";
import { useProjectScope } from "@/components/project-scope";
import { Providers } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ApiError } from "@/lib/api";
import { apiScoped } from "@/lib/scoped-api";

const PAGE_SIZE = 50;
const EVENTS_PAGE_SIZE = 50;

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.message : fallback;
}

/**
 * States browser for the active project. The list comes from
 * POST /v1/states/query (newest first, sequence-cursor
 * pagination), selecting a row expands the record plus its
 * event history, and the form writes through
 * PUT /v1/states/:key. All of these authenticate with a
 * Bearer API key (scopedAuth), so the page sits behind
 * ScopedKeyGate — the user connects a project key once and
 * every call from this page reuses it.
 */
function StatesContent() {
  const { selectedProject } = useProjectScope();
  const projectId = selectedProject?.id;

  const [states, setStates] = useState<StateRecordResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<StateRecordResponse | null>(null);
  const [events, setEvents] = useState<StateEventResponse[] | null>(null);
  const [eventsNextCursor, setEventsNextCursor] = useState<string | null>(null);
  const [loadingNewerEvents, setLoadingNewerEvents] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [upserting, setUpserting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadStates = useCallback(
    async (cursor?: string) => {
      if (!projectId) return;
      const isMore = cursor !== undefined;
      const setBusy = isMore ? setLoadingMore : setLoading;
      setBusy(true);
      setLoadError(null);
      try {
        const res = await apiScoped<StateListResponse<StateRecordResponse>>(
          projectId,
          "/v1/states/query",
          {
            method: "POST",
            body: JSON.stringify({
              limit: PAGE_SIZE,
              ...(cursor ? { cursor } : {}),
            }),
          },
        );
        const rows = res.data ?? [];
        setStates((prev) => (isMore ? [...prev, ...rows] : rows));
        setNextCursor(res.pagination?.next_cursor ?? null);
      } catch (e) {
        const message = errorMessage(e, "Failed to load states");
        if (isMore) {
          toast.error(message);
        } else {
          setLoadError(message);
        }
      } finally {
        setBusy(false);
      }
    },
    [projectId],
  );

  // (Re)load on project switch and on first connect: the gate
  // mounts this content only once a key is connected, and the
  // connected key always belongs to the selected project.
  useEffect(() => {
    if (!projectId) return;
    setSelected(null);
    setEvents(null);
    setEventsNextCursor(null);
    void loadStates();
  }, [projectId, loadStates]);

  // Event history for the selected record — oldest first.
  useEffect(() => {
    if (!projectId || !selected) {
      setEvents(null);
      setEventsNextCursor(null);
      return;
    }
    let cancelled = false;
    setEvents(null);
    const path = `/v1/states/${encodeURIComponent(
      selected.state_key,
    )}/events?limit=${EVENTS_PAGE_SIZE}`;
    apiScoped<StateListResponse<StateEventResponse>>(projectId, path)
      .then((res) => {
        if (cancelled) return;
        setEvents(res.data ?? []);
        setEventsNextCursor(res.pagination?.next_cursor ?? null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setEvents([]);
        toast.error(errorMessage(e, "Failed to load events"));
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, selected]);

  const loadNewerEvents = useCallback(async () => {
    if (!projectId || !selected || !eventsNextCursor) return;
    setLoadingNewerEvents(true);
    try {
      const res = await apiScoped<StateListResponse<StateEventResponse>>(
        projectId,
        `/v1/states/${encodeURIComponent(selected.state_key)}/events?limit=${EVENTS_PAGE_SIZE}&after=${eventsNextCursor}`,
      );
      setEvents((prev) => [...(prev ?? []), ...(res.data ?? [])]);
      setEventsNextCursor(res.pagination?.next_cursor ?? null);
    } catch (e) {
      toast.error(errorMessage(e, "Failed to load events"));
    } finally {
      setLoadingNewerEvents(false);
    }
  }, [projectId, selected, eventsNextCursor]);

  const handleUpsert = useCallback(
    async (input: UpsertStateInput) => {
      if (!projectId) return;
      setUpserting(true);
      try {
        const updated = await apiScoped<StateRecordResponse>(
          projectId,
          `/v1/states/${encodeURIComponent(input.stateKey)}`,
          {
            method: "PUT",
            body: JSON.stringify({
              agent_id: input.agentId,
              data: JSON.parse(input.data),
              ...(input.tags.length > 0 ? { tags: input.tags } : {}),
            }),
          },
        );
        toast.success(`State ${input.stateKey} written`);
        setShowForm(false);
        // The response is the fresh record: update its row in
        // place (a new key is the newest row, an existing key
        // is already listed) and expand it.
        setStates((prev) =>
          prev.some((s) => s.state_key === updated.state_key)
            ? prev.map((s) => (s.state_key === updated.state_key ? updated : s))
            : [updated, ...prev],
        );
        setSelected(updated);
      } catch (e) {
        toast.error(errorMessage(e, "Failed to write state"));
      } finally {
        setUpserting(false);
      }
    },
    [projectId],
  );

  const handleDelete = useCallback(async () => {
    if (!projectId || !selected) return;
    const stateKey = selected.state_key;
    setDeleting(true);
    try {
      await apiScoped(projectId, `/v1/states/${encodeURIComponent(stateKey)}`, {
        method: "DELETE",
      });
      toast.success(`State ${stateKey} deleted`);
      setConfirmDelete(false);
      setSelected(null);
      setStates((prev) => prev.filter((s) => s.state_key !== stateKey));
    } catch (e) {
      toast.error(errorMessage(e, "Failed to delete state"));
    } finally {
      setDeleting(false);
    }
  }, [projectId, selected]);

  return (
    <div className="page-wrap">
      <PageHeader
        title="States"
        description="Shared key/value records your agents read and write — browse, write, and inspect the event history."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowForm(true)}
            disabled={!selectedProject}
          >
            <Database size={15} aria-hidden="true" />
            New state
          </Button>
        }
      />

      {showForm && (
        <UpsertStateForm
          upserting={upserting}
          onSubmit={handleUpsert}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <Card className="flex items-center justify-center py-16">
          <div className="flex items-center gap-2" aria-live="polite">
            <div
              className="size-5 animate-spin rounded-full border-2 border-edge border-t-fg-4"
              aria-hidden="true"
            />
            <span className="sr-only">Loading states…</span>
          </div>
        </Card>
      ) : loadError ? (
        <Card className="flex items-center justify-center py-16">
          <div className="flex max-w-sm flex-col items-center gap-3 text-center">
            <p className="text-[14px] font-medium text-neg">{loadError}</p>
            <Button variant="secondary" size="sm" onClick={() => void loadStates()}>
              Retry
            </Button>
          </div>
        </Card>
      ) : (
        <StatesTable
          states={states}
          selectedKey={selected?.state_key ?? null}
          loadingMore={loadingMore}
          nextCursor={nextCursor}
          onSelect={setSelected}
          onLoadMore={() => {
            if (nextCursor) void loadStates(nextCursor);
          }}
        />
      )}

      {selected && !loading && !loadError && (
        <StateDetail
          state={selected}
          events={events}
          eventsNextCursor={eventsNextCursor}
          loadingNewerEvents={loadingNewerEvents}
          onLoadNewerEvents={() => void loadNewerEvents()}
          onDelete={() => setConfirmDelete(true)}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(false);
        }}
        title={`Delete ${selected?.state_key ?? "this state"}?`}
        description="The record is tombstoned — reads fall through to nothing and a delete event is appended to its history. This cannot be undone."
        confirmLabel="Delete state"
        loading={deleting}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}

export function StatesPage() {
  return (
    <Providers>
      <AppShell>
        <ScopedKeyGate
          title="States"
          description="Shared key/value records your agents read and write — browse, write, and inspect the event history."
        >
          {() => <StatesContent />}
        </ScopedKeyGate>
      </AppShell>
    </Providers>
  );
}
