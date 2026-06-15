import type { ProjectResponse } from "@agentstate/shared";
import { type TimeRange, TimeRangeSelect } from "@/components/analytics/time-range-select";
import { PageHeader } from "@/components/dashboard/page-header";

interface AnalyticsHeaderProps {
  projects: ProjectResponse[];
  selectedProjectId: string;
  onProjectChange: (projectId: string) => void;
  range: TimeRange;
  onRangeChange: (range: TimeRange) => void;
}

export function AnalyticsHeader({
  projects,
  selectedProjectId,
  onProjectChange,
  range,
  onRangeChange,
}: AnalyticsHeaderProps) {
  return (
    <PageHeader
      title="Analytics"
      description="Usage metrics and activity for your project."
      actions={
        <>
          {projects.length > 1 && (
            <select
              aria-label="Select project"
              value={selectedProjectId}
              onChange={(e) => onProjectChange(e.target.value)}
              className="min-h-[40px] w-[180px] rounded-[var(--radius)] border border-edge bg-panel px-3 text-[13px] text-fg outline-none transition-colors hover:bg-panel2 focus-visible:border-accent"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <TimeRangeSelect value={range} onChange={onRangeChange} />
        </>
      }
    />
  );
}
