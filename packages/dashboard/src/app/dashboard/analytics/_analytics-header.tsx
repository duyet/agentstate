"use client";

import type { ProjectResponse } from "@agentstate/shared";
import { type TimeRange, TimeRangeSelect } from "@/components/analytics/time-range-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Usage metrics and activity for your project.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {projects.length > 1 && (
          <Select value={selectedProjectId} onValueChange={(v) => onProjectChange(v ?? "")}>
            <SelectTrigger className="h-8 w-[180px] text-xs" aria-label="Select project">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <TimeRangeSelect value={range} onChange={onRangeChange} />
      </div>
    </div>
  );
}
