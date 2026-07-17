import { GitBranchIcon } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { formatCostMicrodollars } from "@/lib/format-cost";
import { formatTraceTokens } from "./_trace-format";
import type { TraceItem } from "./_use-traces-data";

export interface TracesTableProps {
  traces: TraceItem[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const COLUMNS = ["Title", "Observations", "Tokens", "Cost", "Created"] as const;

/**
 * Traces table — canonical Table primitives on design tokens, mirrors
 * `_ConversationsTable` in ../conversations. Rows are clickable and toggle
 * the trace-detail waterfall rendered below by the parent page.
 */
export function TracesTable({ traces, loading, selectedId, onSelect }: TracesTableProps) {
  return (
    <Card className="overflow-hidden p-0">
      <Table responsive>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">{COLUMNS[0]}</TableHead>
            <TableHead align="right">{COLUMNS[1]}</TableHead>
            <TableHead align="right">{COLUMNS[2]}</TableHead>
            <TableHead align="right">{COLUMNS[3]}</TableHead>
            <TableHead align="right">{COLUMNS[4]}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && <TableSkeleton columns={COLUMNS.length} rows={5} />}

          {!loading && traces.length === 0 && (
            <TableRow>
              <TableCell colSpan={COLUMNS.length} className="py-12">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex size-12 items-center justify-center rounded-[var(--radius)] border border-edge bg-panel2 text-fg-4">
                    <GitBranchIcon className="size-6" aria-hidden />
                  </div>
                  <div className="flex max-w-xs flex-col gap-1">
                    <p className="text-[14px] font-medium text-fg">No traces found</p>
                    <p className="text-[12.5px] leading-5 text-fg-4">
                      Traces will appear here once your agents start reporting activity.
                    </p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}

          {!loading &&
            traces.map((t) => {
              const isActive = selectedId === t.id;
              return (
                <TableRow
                  key={t.id}
                  clickable
                  role="button"
                  tabIndex={0}
                  className={isActive ? "bg-panel2" : ""}
                  onClick={() => onSelect(t.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(t.id);
                    }
                  }}
                  aria-selected={isActive}
                  aria-label={`View trace ${t.title ?? "Untitled"}`}
                >
                  <TableCell className="font-medium text-fg">
                    {t.title ?? <span className="text-fg-4">Untitled</span>}
                  </TableCell>
                  <TableCell align="right" mono>
                    {t.message_count}
                  </TableCell>
                  <TableCell align="right" mono>
                    {formatTraceTokens(t.total_tokens)}
                  </TableCell>
                  <TableCell align="right" mono>
                    {formatCostMicrodollars(t.total_cost_microdollars)}
                  </TableCell>
                  <TableCell align="right" mono>
                    {formatDate(t.created_at)}
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </Card>
  );
}
