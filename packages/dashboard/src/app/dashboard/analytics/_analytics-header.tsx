"use client";

import type { ProjectResponse } from "@agentstate/shared";
import { type TimeRange, TimeRangeSelect } from "@/components/analytics/time-range-select";
import { PageHeader } from "@/components/dashboard/page-header";
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
    <PageHeader
      title="Analytics"
      description="Usage metrics and activity for your project."
      actions={
        <>
          {projects.length > 1 && (
            <Select
              value={selectedProjectId}
              onValueChange={(value) => {
                if (value) {
                  onProjectChange(value);
                }
              }}
            >
              <SelectTrigger className="w-[180px]" aria-label="Select project">
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
        </>
      }
    />
  );
}
