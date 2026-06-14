"use client";

import type { ProjectResponse } from "@agentstate/shared";
import { type TimeRange, TimeRangeSelect } from "@/components/analytics/time-range-select";
import { PageHeader } from "@/components/dashboard/page-header";
import { Select } from "@cloudflare/kumo";

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
  const projectItems = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  return (
    <PageHeader
      title="Analytics"
      description="Usage metrics and activity for your project."
      actions={
        <>
          {projects.length > 1 && (
            <Select
              aria-label="Select project"
              className="w-[180px]"
              value={selectedProjectId}
              onValueChange={(value) => {
                if (value) {
                  onProjectChange(value);
                }
              }}
              items={projectItems}
            />
          )}
          <TimeRangeSelect value={range} onChange={onRangeChange} />
        </>
      }
    />
  );
}
