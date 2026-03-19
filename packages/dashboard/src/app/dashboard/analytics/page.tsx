"use client";

import type { AnalyticsResponse, ProjectResponse } from "@agentstate/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { type TimeRange } from "@/components/analytics/time-range-select";
import { api } from "@/lib/api";
import { AnalyticsContent } from "./_analytics-content";
import { AnalyticsEmpty } from "./_analytics-empty";
import { AnalyticsHeader } from "./_analytics-header";
import { AnalyticsLoading } from "./_analytics-loading";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [range, setRange] = useState<TimeRange>("30d");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch projects
  useEffect(() => {
    api<{ data: ProjectResponse[] }>("/v1/projects")
      .then((res) => {
        setProjects(res.data);
        if (res.data.length > 0) {
          setSelectedProjectId(res.data[0].id);
        }
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  // Fetch analytics when project or range changes
  useEffect(() => {
    if (!selectedProjectId) return;
    setLoading(true);
    api<AnalyticsResponse>(`/v1/projects/${selectedProjectId}/analytics?range=${range}`)
      .then(setData)
      .catch((e) => {
        setData(null);
        toast.error(e instanceof Error ? e.message : "Failed to load analytics");
      })
      .finally(() => setLoading(false));
  }, [selectedProjectId, range]);

  return (
    <div className="space-y-6">
      <AnalyticsHeader
        projects={projects}
        selectedProjectId={selectedProjectId}
        onProjectChange={setSelectedProjectId}
        range={range}
        onRangeChange={setRange}
      />

      {loading && <AnalyticsLoading hasData={!!data} />}

      {data && <AnalyticsContent data={data} />}

      {!loading && projects.length === 0 && <AnalyticsEmpty />}
    </div>
  );
}
