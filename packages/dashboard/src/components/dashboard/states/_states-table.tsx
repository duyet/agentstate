"use client";

import type { StateRecordResponse } from "@agentstate/shared";
import { Database } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, timeAgo } from "@/lib/format";

interface StatesTableProps {
  states: StateRecordResponse[];
  selectedKey: string | null;
  loadingMore: boolean;
  /** Sequence cursor for the next (older) page, from POST /v1/states/query. */
  nextCursor: string | null;
  onSelect: (state: StateRecordResponse) => void;
  onLoadMore: () => void;
}

/**
 * State records browser. Rows arrive newest-first from
 * POST /v1/states/query and each row carries the full record,
 * so selecting one needs no extra fetch. "Load older states"
 * walks the sequence cursor into the event WAL's past.
 */
export function StatesTable({
  states,
  selectedKey,
  loadingMore,
  nextCursor,
  onSelect,
  onLoadMore,
}: StatesTableProps) {
  if (states.length === 0) {
    return (
      <Card className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-[var(--radius)] border border-edge bg-panel2 text-fg-4">
            <Database className="size-6" aria-hidden />
          </div>
          <div className="flex max-w-xs flex-col gap-1">
            <p className="text-[14px] font-medium text-fg">No states yet</p>
            <p className="text-[12.5px] leading-5 text-fg-4">
              Write a state from the SDK or the form below — records appear here newest first.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <Table responsive>
        <TableHeader>
          <TableRow>
            <TableHead>State key</TableHead>
            <TableHead className="hidden md:table-cell">Agent</TableHead>
            <TableHead className="hidden lg:table-cell">Tags</TableHead>
            <TableHead className="hidden sm:table-cell">Sequence</TableHead>
            <TableHead className="hidden sm:table-cell">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {states.map((state) => (
            <TableRow
              key={state.state_key}
              data-state={state.state_key === selectedKey ? "selected" : undefined}
            >
              <TableCell>
                <button
                  type="button"
                  onClick={() => onSelect(state)}
                  aria-pressed={state.state_key === selectedKey}
                  className="flex w-full cursor-pointer items-center rounded-[var(--radius)] px-1 py-0.5 text-left font-mono text-[13px] text-fg transition-colors hover:bg-panel2 focus-visible:bg-panel2 focus-visible:outline-none"
                >
                  {state.state_key}
                </button>
              </TableCell>
              <TableCell className="hidden text-fg-3 md:table-cell">{state.agent_id}</TableCell>
              <TableCell className="hidden lg:table-cell">
                {state.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {state.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full border border-edge bg-panel2 px-2 py-0.5 font-mono text-[10.5px] text-fg-3"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-fg-4">—</span>
                )}
              </TableCell>
              <TableCell mono className="hidden text-fg-3 sm:table-cell">
                {state.latest_sequence}
              </TableCell>
              <TableCell
                className="hidden text-fg-3 sm:table-cell"
                title={formatDate(state.updated_at)}
              >
                {timeAgo(state.updated_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {nextCursor && (
        <div className="flex justify-center border-t border-edge p-3">
          <Button variant="secondary" size="sm" loading={loadingMore} onClick={onLoadMore}>
            Load older states
          </Button>
        </div>
      )}
    </Card>
  );
}
