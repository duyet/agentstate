"use client";

import type { AnalyticsResponse, ProjectResponse } from "@agentstate/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AreaChartCard } from "@/components/analytics/area-chart";
import { RecentActivity } from "@/components/analytics/recent-activity";
import { SummaryCards } from "@/components/analytics/summary-cards";
import { type TimeRange, TimeRangeSelect } from "@/components/analytics/time-range-select";
import { api } from "@/lib/api";

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
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Usage metrics and activity for your project.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {projects.length > 1 && (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="text-xs h-8 px-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              aria-label="Select project"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <TimeRangeSelect value={range} onChange={setRange} />
        </div>
      </div>

      {/* Loading */}
      {loading && !data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="h-56 bg-muted rounded-lg animate-pulse" />
          <div className="h-56 bg-muted rounded-lg animate-pulse" />
        </div>
      )}

      {/* Content */}
      {data && (
        <div className="space-y-6">
          <SummaryCards
            totalConversations={data.summary.total_conversations}
            totalMessages={data.summary.total_messages}
            totalTokens={data.summary.total_tokens}
            activeApiKeys={data.summary.active_api_keys}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <AreaChartCard
              title="Conversations"
              data={data.conversations_per_day.map((d) => ({ date: d.date, value: d.count }))}
              color="#2563eb"
              valueLabel="Conversations"
            />
            <AreaChartCard
              title="Messages"
              data={data.messages_per_day.map((d) => ({ date: d.date, value: d.count }))}
              color="#16a34a"
              valueLabel="Messages"
            />
          </div>

          <AreaChartCard
            title="Token Usage"
            data={data.tokens_per_day.map((d) => ({ date: d.date, value: d.total }))}
            color="#9333ea"
            valueLabel="Tokens"
          />

          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Recent activity</h3>
            <RecentActivity conversations={data.recent_conversations} />
          </div>
        </div>
      )}

      {/* No projects */}
      {!loading && projects.length === 0 && (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-sm text-foreground mb-1">No projects yet</p>
          <p className="text-xs text-muted-foreground">Create a project to see analytics.</p>
        </div>
      )}
    </div>
  );
}
