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
              <TableCell colSpan={COLUMNS.length} className="py-8 text-center text-fg-4">
                No traces found.
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
                  className={isActive ? "bg-panel2" : ""}
                  onClick={() => onSelect(t.id)}
                  aria-selected={isActive}
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
