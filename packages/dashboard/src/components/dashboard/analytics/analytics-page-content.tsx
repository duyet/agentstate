import type { AnalyticsResponse } from "@agentstate/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { TimeRange } from "@/components/analytics/time-range-select";
import { useProjectScope } from "@/components/project-scope";
import { api } from "@/lib/api";
import { AnalyticsContent } from "./_analytics-content";
import { AnalyticsEmpty } from "./_analytics-empty";
import { AnalyticsHeader } from "./_analytics-header";
import { AnalyticsLoading } from "./_analytics-loading";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AnalyticsPageContent() {
  // The active project comes from the sidebar-driven global scope.
  const { projects, selectedProjectId, loadingProjects } = useProjectScope();
  const [range, setRange] = useState<TimeRange>("30d");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Fetch analytics when the active project or range changes
  useEffect(() => {
    if (!selectedProjectId) return;
    setLoadingAnalytics(true);
    api<AnalyticsResponse>(`/v1/projects/${selectedProjectId}/analytics?range=${range}`)
      .then(setData)
      .catch((e) => {
        setData(null);
        toast.error(e instanceof Error ? e.message : "Failed to load analytics");
      })
      .finally(() => setLoadingAnalytics(false));
  }, [selectedProjectId, range]);

  const loading = loadingProjects || loadingAnalytics;

  return (
    <div className="page-wrap">
      <AnalyticsHeader range={range} onRangeChange={setRange} />

      {loading && <AnalyticsLoading hasData={!!data} />}

      {data && <AnalyticsContent data={data} />}

      {!loadingProjects && projects.length === 0 && <AnalyticsEmpty />}
    </div>
  );
}
